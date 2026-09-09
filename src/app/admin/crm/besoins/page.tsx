import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { ROLES, STATUT_BESOIN, STATUT_BESOIN_LABELS, canReassignReferent, type StatutBesoin } from "@/lib/constants";
import { entrepriseVisibilityWhere } from "@/lib/crm-access";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUT_STYLES: Record<string, string> = {
  OUVERT: "bg-brand-blue/10 text-brand-blue-dark",
  GAGNE: "bg-brand-green/10 text-brand-green",
  PERDU: "bg-red-50 text-red-600",
  ABANDONNE: "bg-slate-100 text-brand-gray",
};

export default async function BesoinsBibliothequePage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; businessManagerId?: string }>;
}) {
  const session = await requireStaff();
  const { statut, businessManagerId } = await searchParams;
  const peutFiltrerParBm = canReassignReferent(session.user);

  const where: Prisma.BesoinWhereInput = {
    AND: [
      { entreprise: entrepriseVisibilityWhere(session.user) },
      statut ? { statut } : {},
      peutFiltrerParBm && businessManagerId ? { businessManagerId } : {},
    ],
  };

  const [besoins, bms] = await Promise.all([
    prisma.besoin.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        entreprise: true,
        contact: true,
        businessManager: true,
        candidats: { select: { id: true, statut: true } },
      },
    }),
    peutFiltrerParBm
      ? prisma.user.findMany({ where: { role: ROLES.BM, active: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-ink">Bibliothèque des besoins</h1>
      </div>

      <form className="card flex flex-wrap items-center gap-2 p-3">
        <select name="statut" defaultValue={statut ?? ""} className="input w-56">
          <option value="">Tous les statuts</option>
          {Object.values(STATUT_BESOIN).map((s) => (
            <option key={s} value={s}>
              {STATUT_BESOIN_LABELS[s as StatutBesoin]}
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

      {besoins.length === 0 ? (
        <p className="text-sm text-brand-gray">Aucun besoin pour ces filtres.</p>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-brand-gray">
              <tr>
                <th className="px-4 py-3">Poste</th>
                <th className="px-4 py-3">Entreprise</th>
                <th className="px-4 py-3">BM référent</th>
                <th className="px-4 py-3">Candidats</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {besoins.map((b) => (
                <tr key={b.id} className="transition-colors hover:bg-brand-blue-bg-soft">
                  <td className="px-4 py-2.5 font-medium text-brand-ink">{b.intitulePoste}</td>
                  <td className="px-4 py-2.5 text-brand-body">{b.entreprise.nom}</td>
                  <td className="px-4 py-2.5 text-brand-body">{b.businessManager.name}</td>
                  <td className="px-4 py-2.5 text-brand-body">{b.candidats.length}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        STATUT_STYLES[b.statut] ?? "bg-slate-100 text-brand-gray"
                      }`}
                    >
                      {STATUT_BESOIN_LABELS[b.statut as StatutBesoin] ?? b.statut}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link
                      href={`/admin/crm/${b.entrepriseId}/besoins/${b.id}`}
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
