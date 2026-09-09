import Link from "next/link";
import { STATUT_BESOIN_LABELS, DUREE_ESTIMEE_OPTIONS, type StatutBesoin } from "@/lib/constants";
import { createBesoinAction } from "./actions";

type Contact = { id: string; prenom: string; nom: string };

type Besoin = {
  id: string;
  intitulePoste: string;
  statut: string;
  tjmCibleMin: number | null;
  tjmCibleMax: number | null;
  dateDemarrageSouhaitee: Date | null;
  contact: Contact | null;
  missions: { id: string }[];
};

const STATUT_STYLES: Record<string, string> = {
  OUVERT: "bg-brand-blue/10 text-brand-blue-dark",
  GAGNE: "bg-brand-green/10 text-brand-green",
  PERDU: "bg-red-50 text-red-600",
  ABANDONNE: "bg-slate-100 text-brand-gray",
};

export default function BesoinsSection({
  entrepriseId,
  contacts,
  besoins,
}: {
  entrepriseId: string;
  contacts: Contact[];
  besoins: Besoin[];
}) {
  return (
    <div className="card space-y-4 p-5">
      <h2 className="text-sm font-semibold text-brand-ink">Besoins</h2>

      {besoins.length === 0 ? (
        <p className="text-xs text-brand-gray">Aucun besoin enregistré pour le moment.</p>
      ) : (
        <ul className="-mx-2 divide-y divide-slate-100">
          {besoins.map((b) => (
            <li
              key={b.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-2.5 transition-colors hover:bg-brand-blue-bg-soft"
            >
              <div className="text-sm">
                <span className="font-medium text-brand-ink">{b.intitulePoste}</span>
                {b.contact && (
                  <span className="text-brand-gray">
                    {" "}
                    — {b.contact.prenom} {b.contact.nom}
                  </span>
                )}
                {(b.tjmCibleMin || b.tjmCibleMax) && (
                  <span className="text-brand-gray">
                    {" "}
                    · {b.tjmCibleMin ?? "?"}–{b.tjmCibleMax ?? "?"} €/j
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    STATUT_STYLES[b.statut] ?? "bg-slate-100 text-brand-gray"
                  }`}
                >
                  {STATUT_BESOIN_LABELS[b.statut as StatutBesoin] ?? b.statut}
                </span>
                <Link
                  href={`/admin/crm/${entrepriseId}/besoins/${b.id}`}
                  className="link-underline text-xs text-brand-blue-dark"
                >
                  Ouvrir
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form
        action={createBesoinAction}
        className="grid grid-cols-2 gap-2 rounded-lg border border-dashed border-brand-blue-light/60 bg-brand-blue-bg-soft/40 p-3 sm:grid-cols-4 sm:items-end"
      >
        <input type="hidden" name="entrepriseId" value={entrepriseId} />
        <div className="sm:col-span-2">
          <label className="block text-[11px] text-brand-gray">Intitulé du poste</label>
          <input
            name="intitulePoste"
            required
            placeholder="Ex. Développeur backend Java"
            className="input text-xs"
          />
        </div>
        <div>
          <label className="block text-[11px] text-brand-gray">Interlocuteur</label>
          <select name="contactId" defaultValue="" className="input text-xs">
            <option value="">—</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.prenom} {c.nom}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-brand-gray">Démarrage souhaité</label>
          <input type="date" name="dateDemarrageSouhaitee" className="input text-xs" />
        </div>
        <div>
          <label className="block text-[11px] text-brand-gray">TJM min (€/j)</label>
          <input type="number" name="tjmCibleMin" min={0} className="input text-xs" />
        </div>
        <div>
          <label className="block text-[11px] text-brand-gray">TJM max (€/j)</label>
          <input type="number" name="tjmCibleMax" min={0} className="input text-xs" />
        </div>
        <div>
          <label className="block text-[11px] text-brand-gray">Durée estimée</label>
          <select name="dureeEstimee" defaultValue="" className="input text-xs">
            <option value="">—</option>
            {DUREE_ESTIMEE_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-[11px] text-brand-gray">Missions (détail)</label>
          <textarea name="descriptifMissions" rows={2} className="input text-xs" />
        </div>
        <div className="flex sm:col-span-4">
          <button type="submit" className="btn btn-secondary py-1.5 text-xs">
            + Nouveau besoin
          </button>
        </div>
      </form>
    </div>
  );
}
