import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import {
  ROLES,
  STATUT_MISSION,
  STATUT_MISSION_LABELS,
  MISSION_ALERTE_FIN_JOURS,
  canReassignReferent,
  type StatutMission,
} from "@/lib/constants";
import { entrepriseVisibilityWhere } from "@/lib/crm-access";
import { terminerMissionAction } from "../crm/[id]/besoins/actions";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUT_STYLES: Record<string, string> = {
  EN_COURS: "bg-brand-blue/10 text-brand-blue-dark",
  TERMINEE: "bg-slate-100 text-brand-gray",
  ROMPUE: "bg-red-50 text-red-600",
};

export default async function MissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; businessManagerId?: string }>;
}) {
  const session = await requireStaff();
  const { statut, businessManagerId } = await searchParams;
  const peutFiltrerParBm = canReassignReferent(session.user);
  const statutFiltre = statut ?? STATUT_MISSION.EN_COURS;

  const where: Prisma.MissionWhereInput = {
    AND: [
      { entreprise: entrepriseVisibilityWhere(session.user) },
      statutFiltre ? { statut: statutFiltre } : {},
      peutFiltrerParBm && businessManagerId ? { businessManagerId } : {},
    ],
  };

  const [missions, bms] = await Promise.all([
    prisma.mission.findMany({
      where,
      orderBy: { dateDebut: "desc" },
      include: { entreprise: true, consultant: true, businessManager: true },
    }),
    peutFiltrerParBm
      ? prisma.user.findMany({ where: { role: ROLES.BM, active: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);

  const now = new Date();
  const alerteSeuil = new Date(now.getTime() + MISSION_ALERTE_FIN_JOURS * 24 * 60 * 60 * 1000);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-ink">Portefeuille de missions</h1>
        <p className="mt-1 text-sm text-brand-gray">
          Consultants staffés en mission chez vos clients — dates, TJM et fins de mission
          approchantes.
        </p>
      </div>

      <form className="card flex flex-wrap items-center gap-2 p-3">
        <select name="statut" defaultValue={statutFiltre} className="input w-56">
          {Object.values(STATUT_MISSION).map((s) => (
            <option key={s} value={s}>
              {STATUT_MISSION_LABELS[s as StatutMission]}
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

      {missions.length === 0 ? (
        <p className="text-sm text-brand-gray">Aucune mission pour ces filtres.</p>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-brand-gray">
              <tr>
                <th className="px-4 py-3">Consultant</th>
                <th className="px-4 py-3">Poste</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">BM référent</th>
                <th className="px-4 py-3">TJM</th>
                <th className="px-4 py-3">Début</th>
                <th className="px-4 py-3">Fin prévue</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {missions.map((m) => {
                const finProche =
                  m.statut === STATUT_MISSION.EN_COURS &&
                  m.dateFinPrevue != null &&
                  m.dateFinPrevue <= alerteSeuil;
                return (
                  <tr
                    key={m.id}
                    className={`transition-colors hover:bg-brand-blue-bg-soft ${
                      finProche ? "bg-amber-50" : ""
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/admin/consultants/${m.consultantId}`}
                        className="font-medium text-brand-ink hover:text-brand-blue-dark"
                      >
                        {m.consultant.prenom} {m.consultant.nom}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-brand-body">{m.intitulePoste}</td>
                    <td className="px-4 py-2.5 text-brand-body">
                      <Link
                        href={`/admin/crm/${m.entrepriseId}`}
                        className="link-underline text-brand-blue-dark"
                      >
                        {m.entreprise.nom}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-brand-body">{m.businessManager.name}</td>
                    <td className="px-4 py-2.5 text-brand-body">{m.tjm ? `${m.tjm} €/j` : "—"}</td>
                    <td className="px-4 py-2.5 text-brand-body">
                      {m.dateDebut.toLocaleDateString("fr-FR")}
                    </td>
                    <td className={`px-4 py-2.5 ${finProche ? "font-medium text-amber-700" : "text-brand-body"}`}>
                      {m.dateFinPrevue ? m.dateFinPrevue.toLocaleDateString("fr-FR") : "—"}
                      {finProche && " · fin proche"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          STATUT_STYLES[m.statut] ?? "bg-slate-100 text-brand-gray"
                        }`}
                      >
                        {STATUT_MISSION_LABELS[m.statut as StatutMission] ?? m.statut}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {m.statut === STATUT_MISSION.EN_COURS && (
                        <form action={terminerMissionAction}>
                          <input type="hidden" name="id" value={m.id} />
                          <button type="submit" className="link-underline text-xs text-brand-gray">
                            Terminer
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
