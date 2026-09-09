import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import {
  ROLES,
  STATUT_OFFRE,
  STATUT_OFFRE_LABELS,
  canReassignReferent,
  type StatutOffre,
} from "@/lib/constants";
import { offreVisibilityWhere } from "@/lib/offre-access";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUT_STYLES: Record<string, string> = {
  BROUILLON: "bg-slate-100 text-brand-gray",
  PUBLIEE: "bg-brand-green/10 text-brand-green",
  POURVUE: "bg-brand-blue/10 text-brand-blue-dark",
  DEPUBLIEE: "bg-amber-100 text-amber-700",
  ARCHIVEE: "bg-slate-100 text-brand-gray",
};

export default async function OffresPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; businessManagerId?: string }>;
}) {
  const session = await requireStaff();
  const { statut, businessManagerId } = await searchParams;
  const peutFiltrerParBm = canReassignReferent(session.user);

  const where: Prisma.OffreWhereInput = {
    AND: [
      offreVisibilityWhere(session.user),
      statut ? { statut } : {},
      peutFiltrerParBm && businessManagerId ? { businessManagerId } : {},
    ],
  };

  const [offres, bms] = await Promise.all([
    prisma.offre.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        entreprise: true,
        businessManager: true,
        besoin: true,
        candidatures: { select: { id: true } },
      },
    }),
    peutFiltrerParBm
      ? prisma.user.findMany({ where: { role: ROLES.BM, active: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-brand-ink">Offres</h1>
        </div>
        <Link href="/admin/offres/nouvelle" className="btn btn-primary">
          + Nouvelle offre
        </Link>
      </div>

      <form className="card flex flex-wrap items-center gap-2 p-3">
        <select name="statut" defaultValue={statut ?? ""} className="input w-56">
          <option value="">Tous les statuts</option>
          {Object.values(STATUT_OFFRE).map((s) => (
            <option key={s} value={s}>
              {STATUT_OFFRE_LABELS[s as StatutOffre]}
            </option>
          ))}
        </select>
        {peutFiltrerParBm && (
          <select name="businessManagerId" defaultValue={businessManagerId ?? ""} className="input w-56">
            <option value="">Tous les BM référents</option>
            {bms.map((bm) => (
              <option key={bm.id} value={bm.id}>
                {bm.name}
              </option>
            ))}
          </select>
        )}
        <button type="submit" className="btn btn-secondary">
          Filtrer
        </button>
      </form>

      {offres.length === 0 ? (
        <p className="text-sm text-brand-gray">Aucune offre pour ces filtres.</p>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-brand-gray">
              <tr>
                <th className="px-4 py-3">Référence</th>
                <th className="px-4 py-3">Titre</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">BM référent</th>
                <th className="px-4 py-3">Candidatures</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {offres.map((o) => (
                <tr key={o.id} className="transition-colors hover:bg-brand-blue-bg-soft">
                  <td className="px-4 py-2.5 font-mono text-xs text-brand-gray">{o.reference}</td>
                  <td className="px-4 py-2.5 font-medium text-brand-ink">{o.titre}</td>
                  <td className="px-4 py-2.5 text-brand-body">
                    {o.entreprise?.nom ?? (o.besoin ? "—" : "Offre libre")}
                  </td>
                  <td className="px-4 py-2.5 text-brand-body">{o.businessManager.name}</td>
                  <td className="px-4 py-2.5 text-brand-body">{o.candidatures.length}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        STATUT_STYLES[o.statut] ?? "bg-slate-100 text-brand-gray"
                      }`}
                    >
                      {STATUT_OFFRE_LABELS[o.statut as StatutOffre] ?? o.statut}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link
                      href={`/admin/offres/${o.id}`}
                      className="link-underline text-xs text-brand-blue-dark"
                    >
                      Ouvrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
