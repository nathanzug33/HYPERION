import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { entrepriseVisibilityWhere } from "@/lib/crm-access";
import {
  SUIVI_COMMERCIAL_TYPE_LABELS,
  MODALITE_RDV_LABELS,
  type SuiviCommercialType,
  type ModaliteRdv,
} from "@/lib/constants";
import { resolvePeriode, suiviCommercialDateFilter } from "@/lib/periode";
import PeriodeSelector from "@/components/PeriodeSelector";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const TYPE_STYLES: Record<string, string> = {
  NOTE: "bg-slate-100 text-brand-body",
  APPEL: "bg-brand-blue-bg text-brand-blue-dark",
  EMAIL: "bg-brand-blue-bg text-brand-blue-dark",
  RDV: "bg-brand-blue/15 text-brand-blue-dark",
  RAPPEL: "bg-amber-50 text-amber-700",
  PROPOSITION_ENVOYEE: "bg-purple-50 text-purple-700",
  CONTRAT_SIGNE: "bg-brand-green/10 text-brand-green",
  STATUT: "bg-brand-green/10 text-brand-green",
};

export default async function CrmActivitesPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    fait?: string;
    periode?: string;
    debut?: string;
    fin?: string;
  }>;
}) {
  const session = await requireStaff();
  const sp = await searchParams;
  const { type, fait } = sp;
  const periodeActive = Boolean(sp.periode);
  const periode = resolvePeriode(sp);

  const dateFilter: Prisma.SuiviCommercialWhereInput = periodeActive
    ? suiviCommercialDateFilter(periode)
    : {};

  const where: Prisma.SuiviCommercialWhereInput = {
    AND: [
      { entreprise: entrepriseVisibilityWhere(session.user) },
      type ? { type } : {},
      fait === "0" ? { fait: false } : {},
      fait === "1" ? { fait: true } : {},
      dateFilter,
    ],
  };

  const activites = await prisma.suiviCommercial.findMany({
    where,
    orderBy: [{ dateProgrammee: "desc" }, { createdAt: "desc" }],
    include: {
      entreprise: { select: { id: true, nom: true } },
      contact: { select: { id: true, prenom: true, nom: true } },
      createdBy: { select: { name: true } },
    },
    take: 300,
  });

  const now = new Date();
  const title = type
    ? `Activités CRM — ${SUIVI_COMMERCIAL_TYPE_LABELS[type as SuiviCommercialType] ?? type}`
    : "Toutes les activités CRM";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-brand-ink">{title}</h1>
          <p className="mt-1 text-sm text-brand-gray">
            {activites.length} action{activites.length > 1 ? "s" : ""} — qui, quand, avec
            quelle entreprise et quel interlocuteur.
          </p>
        </div>
        <Link href="/admin/crm" className="link-underline text-sm text-brand-gray hover:text-brand-ink">
          ← Retour au CRM
        </Link>
      </div>

      <div className="card space-y-3 p-3">
        <form className="flex flex-wrap items-center gap-2">
          {periodeActive && <input type="hidden" name="periode" value={sp.periode} />}
          {sp.debut && <input type="hidden" name="debut" value={sp.debut} />}
          {sp.fin && <input type="hidden" name="fin" value={sp.fin} />}
          <select name="type" defaultValue={type ?? ""} className="input w-auto">
            <option value="">Tous les types</option>
            {Object.entries(SUIVI_COMMERCIAL_TYPE_LABELS)
              .filter(([k]) => k !== "STATUT")
              .map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
          </select>
          <select name="fait" defaultValue={fait ?? ""} className="input w-auto">
            <option value="">Fait et à faire</option>
            <option value="0">À faire</option>
            <option value="1">Fait</option>
          </select>
          <button type="submit" className="btn btn-secondary">
            Filtrer
          </button>
        </form>
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <PeriodeSelector
            basePath="/admin/crm/activites"
            extraParams={{ type, fait }}
            current={periode}
          />
          {periodeActive && (
            <Link
              href={`/admin/crm/activites${type ? `?type=${type}` : ""}`}
              className="link-underline text-xs text-brand-gray"
            >
              Toutes dates
            </Link>
          )}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-brand-blue-bg-soft text-left text-xs font-semibold uppercase tracking-wide text-brand-gray">
            <tr>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Entreprise</th>
              <th className="px-4 py-3">Interlocuteur</th>
              <th className="px-4 py-3">Titre</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Créé par</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {activites.map((a) => {
              const overdue = a.dateProgrammee != null && !a.fait && a.dateProgrammee < now;
              return (
                <tr key={a.id} className="transition-colors hover:bg-brand-blue-bg-soft">
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${TYPE_STYLES[a.type] ?? ""}`}
                      >
                        {SUIVI_COMMERCIAL_TYPE_LABELS[a.type as SuiviCommercialType] ?? a.type}
                      </span>
                      {a.modalite && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-brand-body">
                          {MODALITE_RDV_LABELS[a.modalite as ModaliteRdv] ?? a.modalite}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/crm/${a.entreprise.id}`}
                      className="font-medium text-brand-ink hover:text-brand-blue-dark"
                    >
                      {a.entreprise.nom}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-brand-body">
                    {a.contact ? `${a.contact.prenom} ${a.contact.nom}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-brand-body">
                    <div>{a.titre}</div>
                    {a.notes && (
                      <div className="mt-0.5 max-w-xs truncate text-xs text-brand-gray" title={a.notes}>
                        {a.notes}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-brand-gray">
                    {a.dateProgrammee
                      ? new Date(a.dateProgrammee).toLocaleString("fr-FR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                      : new Date(a.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3">
                    {a.type === "STATUT" ? (
                      <span className="text-xs text-brand-gray">—</span>
                    ) : a.fait ? (
                      <span className="rounded-full bg-brand-green/10 px-2 py-0.5 text-xs font-medium text-brand-green">
                        Fait
                      </span>
                    ) : overdue ? (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                        En retard
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-brand-body">
                        À faire
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-brand-gray">{a.createdBy.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <Link
                      href={`/admin/crm/${a.entreprise.id}`}
                      className="link-underline text-sm text-brand-blue-dark"
                    >
                      Ouvrir
                    </Link>
                  </td>
                </tr>
              );
            })}
            {activites.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-brand-gray">
                  Aucune activité trouvée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
