import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import {
  STATUT_CANDIDAT_INTERNE_LABELS,
  DISPONIBILITE_LABELS,
  STATUT_ENTREPRISE_LABELS,
  SECTEUR_CATEGORIE_LABELS,
} from "@/lib/constants";
import { consultantVisibilityWhere } from "@/lib/consultant-access";
import { entrepriseVisibilityWhere } from "@/lib/crm-access";
import ScoreBarChart, { type ScoreBarDatum } from "@/components/ScoreBarChart";

export const dynamic = "force-dynamic";

const PALETTE = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#64748b",
];

type Scope = "ATS_CANDIDATS" | "CRM_ENTREPRISES";

const SCOPE_LABELS: Record<Scope, string> = {
  ATS_CANDIDATS: "ATS — Candidats",
  CRM_ENTREPRISES: "CRM — Entreprises",
};

type Dim = { key: string; label: string; drillPath?: string; drillParam?: string };

// Un éventail restreint et pertinent de répartitions par périmètre, plutôt
// qu'un moteur de "group by" générique sur n'importe quelle colonne — les
// dimensions qui comptent vraiment pour le pilotage (statut, séniorité, BM…).
const DIMENSIONS: Record<Scope, Dim[]> = {
  ATS_CANDIDATS: [
    {
      key: "statutCandidatInterne",
      label: "Statut candidat",
      drillPath: "/admin/consultants/recherche",
      drillParam: "statutCandidatInterne",
    },
    {
      key: "seniorite",
      label: "Séniorité",
      drillPath: "/admin/consultants/recherche",
      drillParam: "seniorite",
    },
    {
      key: "disponibilite",
      label: "Disponibilité",
      drillPath: "/admin/consultants/recherche",
      drillParam: "disponibilite",
    },
    { key: "businessManager", label: "BM référent" },
  ],
  CRM_ENTREPRISES: [
    {
      key: "statutCommercial",
      label: "Statut commercial",
      drillPath: "/admin/crm",
      drillParam: "statut",
    },
    { key: "secteurCategorie", label: "Secteur (IT / Industrie)" },
    {
      key: "businessManager",
      label: "BM référent",
      drillPath: "/admin/crm",
      drillParam: "businessManagerId",
    },
  ],
};

type Row = { key: string; label: string; count: number; drillValue?: string };

export default async function RapportsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; dim?: string }>;
}) {
  const session = await requireStaff();
  const sp = await searchParams;

  const scope: Scope = sp.scope === "CRM_ENTREPRISES" ? "CRM_ENTREPRISES" : "ATS_CANDIDATS";
  const dims = DIMENSIONS[scope];
  const dim = dims.find((d) => d.key === sp.dim) ?? dims[0];

  const rows = await computeRows(scope, dim.key, session.user);
  const total = rows.reduce((sum, r) => sum + r.count, 0);

  const chartData: ScoreBarDatum[] = rows.map((r, i) => ({
    name: r.label,
    value: r.count,
    color: PALETTE[i % PALETTE.length],
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-ink">Rapports</h1>
        <p className="mt-1 text-sm text-brand-gray">
          Répartitions en un coup d&apos;œil — pour préparer une réunion ou suivre le
          pilotage, sans filtrer manuellement.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(Object.entries(SCOPE_LABELS) as [Scope, string][]).map(([key, label]) => (
          <Link
            key={key}
            href={`/admin/rapports?scope=${key}`}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              key === scope
                ? "bg-brand-blue text-white"
                : "bg-slate-100 text-brand-body hover:bg-brand-blue-bg-soft"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {dims.map((d) => (
          <Link
            key={d.key}
            href={`/admin/rapports?scope=${scope}&dim=${d.key}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              d.key === dim.key
                ? "border-brand-blue-dark bg-brand-blue-bg text-brand-blue-dark"
                : "border-slate-200 text-brand-gray hover:bg-brand-blue-bg-soft"
            }`}
          >
            {d.label}
          </Link>
        ))}
      </div>

      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-brand-ink">
            Répartition par {dim.label.toLowerCase()}
          </h2>
          <span className="rounded-full bg-brand-blue-bg px-3 py-1 text-xs font-medium text-brand-blue-dark">
            {total} au total
          </span>
        </div>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-brand-gray">Aucune donnée pour l&apos;instant.</p>
        ) : (
          <ScoreBarChart data={chartData} height={260} />
        )}
      </div>

      {rows.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-brand-blue-bg-soft text-left text-xs font-semibold uppercase tracking-wide text-brand-gray">
              <tr>
                <th className="px-4 py-2">{dim.label}</th>
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Part</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.key} className="hover:bg-brand-blue-bg-soft">
                  <td className="px-4 py-2 font-medium text-brand-ink">{r.label}</td>
                  <td className="px-4 py-2 text-brand-body">{r.count}</td>
                  <td className="px-4 py-2 text-brand-body">
                    {total ? Math.round((r.count / total) * 100) : 0}%
                  </td>
                  <td className="px-4 py-2 text-right">
                    {dim.drillPath && r.drillValue && (
                      <Link
                        href={`${dim.drillPath}?${dim.drillParam}=${encodeURIComponent(r.drillValue)}`}
                        className="link-underline text-sm text-brand-blue-dark"
                      >
                        Voir la liste
                      </Link>
                    )}
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

async function computeRows(
  scope: Scope,
  dimKey: string,
  user: { id: string; role: string }
): Promise<Row[]> {
  if (scope === "ATS_CANDIDATS") {
    const where = consultantVisibilityWhere(user);

    if (dimKey === "statutCandidatInterne") {
      const groups = await prisma.consultant.groupBy({
        by: ["statutCandidatInterne"],
        where,
        _count: { _all: true },
      });
      return groups
        .map((g) => ({
          key: g.statutCandidatInterne,
          label:
            STATUT_CANDIDAT_INTERNE_LABELS[
              g.statutCandidatInterne as keyof typeof STATUT_CANDIDAT_INTERNE_LABELS
            ] ?? g.statutCandidatInterne,
          count: g._count._all,
          drillValue: g.statutCandidatInterne,
        }))
        .sort((a, b) => b.count - a.count);
    }

    if (dimKey === "seniorite") {
      const [groups, seniorites] = await Promise.all([
        prisma.consultant.groupBy({ by: ["seniorityId"], where, _count: { _all: true } }),
        prisma.seniorite.findMany(),
      ]);
      const labelOf = new Map(seniorites.map((s) => [s.id, s.label]));
      return groups
        .map((g) => ({
          key: g.seniorityId ?? "aucune",
          label: g.seniorityId ? labelOf.get(g.seniorityId) ?? "—" : "Non renseignée",
          count: g._count._all,
          drillValue: g.seniorityId ?? undefined,
        }))
        .sort((a, b) => b.count - a.count);
    }

    if (dimKey === "disponibilite") {
      const groups = await prisma.consultant.groupBy({
        by: ["disponibilite"],
        where,
        _count: { _all: true },
      });
      return groups
        .map((g) => ({
          key: g.disponibilite ?? "aucune",
          label: g.disponibilite
            ? DISPONIBILITE_LABELS[g.disponibilite as keyof typeof DISPONIBILITE_LABELS] ??
              g.disponibilite
            : "Non renseignée",
          count: g._count._all,
          drillValue: g.disponibilite ?? undefined,
        }))
        .sort((a, b) => b.count - a.count);
    }

    // businessManager
    const [groups, bms] = await Promise.all([
      prisma.consultant.groupBy({ by: ["businessManagerId"], where, _count: { _all: true } }),
      prisma.user.findMany(),
    ]);
    const nameOf = new Map(bms.map((u) => [u.id, u.name]));
    return groups
      .map((g) => ({
        key: g.businessManagerId,
        label: nameOf.get(g.businessManagerId) ?? "—",
        count: g._count._all,
      }))
      .sort((a, b) => b.count - a.count);
  }

  // CRM_ENTREPRISES
  const where = entrepriseVisibilityWhere(user);

  if (dimKey === "statutCommercial") {
    const groups = await prisma.entreprise.groupBy({
      by: ["statutCommercial"],
      where,
      _count: { _all: true },
    });
    return groups
      .map((g) => ({
        key: g.statutCommercial,
        label:
          STATUT_ENTREPRISE_LABELS[g.statutCommercial as keyof typeof STATUT_ENTREPRISE_LABELS] ??
          g.statutCommercial,
        count: g._count._all,
        drillValue: g.statutCommercial,
      }))
      .sort((a, b) => b.count - a.count);
  }

  if (dimKey === "secteurCategorie") {
    const groups = await prisma.entreprise.groupBy({
      by: ["secteurCategorie"],
      where,
      _count: { _all: true },
    });
    return groups
      .map((g) => ({
        key: g.secteurCategorie ?? "aucune",
        label: g.secteurCategorie
          ? SECTEUR_CATEGORIE_LABELS[
              g.secteurCategorie as keyof typeof SECTEUR_CATEGORIE_LABELS
            ] ?? g.secteurCategorie
          : "Non renseigné",
        count: g._count._all,
      }))
      .sort((a, b) => b.count - a.count);
  }

  // businessManager
  const [groups, bms] = await Promise.all([
    prisma.entreprise.groupBy({ by: ["businessManagerId"], where, _count: { _all: true } }),
    prisma.user.findMany(),
  ]);
  const nameOf = new Map(bms.map((u) => [u.id, u.name]));
  return groups
    .map((g) => ({
      key: g.businessManagerId,
      label: nameOf.get(g.businessManagerId) ?? "—",
      count: g._count._all,
      drillValue: g.businessManagerId,
    }))
    .sort((a, b) => b.count - a.count);
}
