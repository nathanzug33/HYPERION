import {
  SUIVI_TYPE_LABELS,
  SUIVI_TYPE_SAISISSABLES,
  type SuiviType,
} from "@/lib/constants";
import { createSuiviAction, toggleSuiviFaitAction, deleteSuiviAction } from "./suivi-actions";

type Suivi = {
  id: string;
  type: string;
  titre: string;
  notes: string | null;
  dateProgrammee: Date | null;
  fait: boolean;
  createdAt: Date;
  createdBy: { name: string };
};

const TYPE_STYLES: Record<string, string> = {
  NOTE: "bg-slate-100 text-brand-body",
  APPEL: "bg-brand-blue-bg text-brand-blue-dark",
  RDV: "bg-brand-blue/15 text-brand-blue-dark",
  RAPPEL: "bg-amber-50 text-amber-700",
  STATUT: "bg-brand-green/10 text-brand-green",
};

export default function SuiviSection({
  consultantId,
  suivis,
}: {
  consultantId: string;
  suivis: Suivi[];
}) {
  const now = new Date();

  return (
    <div className="card p-4">
      <h2 className="mb-3 text-sm font-semibold text-brand-ink">Suivi &amp; rappels</h2>

      <form action={createSuiviAction} className="space-y-2 border-b border-slate-100 pb-4">
        <input type="hidden" name="consultantId" value={consultantId} />
        <div className="grid grid-cols-2 gap-2">
          <select name="type" defaultValue="NOTE" className="input text-xs">
            {SUIVI_TYPE_SAISISSABLES.map((t) => (
              <option key={t} value={t}>
                {SUIVI_TYPE_LABELS[t as SuiviType]}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            name="dateProgrammee"
            className="input text-xs"
            title="Échéance (RDV / rappel)"
          />
        </div>
        <input
          type="text"
          name="titre"
          required
          placeholder="Titre (ex. Rappeler pour disponibilité)"
          className="input text-xs"
        />
        <textarea
          name="notes"
          rows={2}
          placeholder="Notes (optionnel)"
          className="input text-xs"
        />
        <button type="submit" className="btn btn-secondary w-full py-1.5 text-xs">
          + Ajouter
        </button>
      </form>

      {suivis.length === 0 ? (
        <p className="mt-3 text-xs text-brand-gray">Aucun suivi pour le moment.</p>
      ) : (
        <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
          {suivis.map((s) => {
            const overdue = s.dateProgrammee != null && !s.fait && s.dateProgrammee < now;
            const actionable = s.dateProgrammee != null && s.type !== "STATUT";
            return (
              <li
                key={s.id}
                className={`rounded-lg border px-2.5 py-2 text-xs ${
                  overdue
                    ? "border-red-200 bg-red-50"
                    : s.fait
                      ? "border-slate-100 bg-slate-50 opacity-70"
                      : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${TYPE_STYLES[s.type] ?? ""}`}
                      >
                        {SUIVI_TYPE_LABELS[s.type as SuiviType] ?? s.type}
                      </span>
                      {s.fait && (
                        <span className="rounded-full bg-brand-green/10 px-1.5 py-0.5 text-[10px] font-medium text-brand-green">
                          Fait
                        </span>
                      )}
                    </div>
                    <div className="mt-1 font-medium text-brand-ink">{s.titre}</div>
                    {s.notes && (
                      <div className="mt-0.5 whitespace-pre-line text-brand-body">{s.notes}</div>
                    )}
                    <div className="mt-1 text-[10px] text-brand-gray">
                      {s.dateProgrammee &&
                        `Échéance : ${new Date(s.dateProgrammee).toLocaleString("fr-FR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}${overdue ? " · en retard" : ""} · `}
                      {s.createdBy.name}, {new Date(s.createdAt).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                  {s.type !== "STATUT" && (
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {actionable && (
                        <form action={toggleSuiviFaitAction}>
                          <input type="hidden" name="id" value={s.id} />
                          <button type="submit" className="link-underline text-brand-blue-dark">
                            {s.fait ? "Rouvrir" : "Marquer fait"}
                          </button>
                        </form>
                      )}
                      <form action={deleteSuiviAction}>
                        <input type="hidden" name="id" value={s.id} />
                        <button type="submit" className="link-underline text-red-600">
                          Supprimer
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
