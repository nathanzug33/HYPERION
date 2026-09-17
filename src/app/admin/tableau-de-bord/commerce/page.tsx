import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import {
  STATUT_ENTREPRISE_LABELS,
  STATUT_CANDIDAT_INTERNE,
  NATURE_CONTRAT_LABELS,
  ROLES,
  canReassignReferent,
} from "@/lib/constants";
import { consultantVisibilityWhere } from "@/lib/consultant-access";
import { entrepriseVisibilityWhere } from "@/lib/crm-access";
import { resolvePeriode, resolveWeekOffset, suiviCommercialDateFilter } from "@/lib/periode";
import { getTaskCountsByDomain } from "@/lib/task-counts";
import { computeCrmTypeScore } from "@/lib/dashboard-scores";
import PeriodeSelector from "@/components/PeriodeSelector";
import ScoreBarChart, { type ScoreBarDatum } from "@/components/ScoreBarChart";
import ScoreVueToggle from "@/components/ScoreVueToggle";
import StatCard from "@/components/DashboardStatCard";

export const dynamic = "force-dynamic";

const BASE_PATH = "/admin/tableau-de-bord/commerce";

export default async function TableauDeBordCommercePage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string; debut?: string; fin?: string; scoreVue?: string }>;
}) {
  const session = await requireStaff();
  const bmFilter = consultantVisibilityWhere(session.user);
  const entrepriseFilter = entrepriseVisibilityWhere(session.user);

  const sp = await searchParams;
  const periode = resolvePeriode(sp);
  const periodeQuery = `periode=${periode.periode}${
    periode.periode === "custom" ? `&debut=${sp.debut}&fin=${sp.fin}` : ""
  }`;
  const periodeCrmDate = suiviCommercialDateFilter(periode);

  const scoreVue: "semaine" | "periode" = sp.scoreVue === "periode" ? "periode" : "semaine";
  const scoreVueQuery = (v: "semaine" | "periode") => `${BASE_PATH}?${periodeQuery}&scoreVue=${v}`;

  let crmScoreSMoins1: ScoreBarDatum[] = [];
  let crmScoreS: ScoreBarDatum[] = [];
  let crmScoreSPlus1: { rdvAVenir: number; rtAVenir: number } = { rdvAVenir: 0, rtAVenir: 0 };
  let crmScorePeriode: ScoreBarDatum[] = [];

  if (scoreVue === "semaine") {
    const sMoins1 = resolveWeekOffset(-1);
    const s0 = resolveWeekOffset(0);
    const sPlus1 = resolveWeekOffset(1);
    const [rdvSMoins1, rdvS, rdvSPlus1, rtSMoins1, rtS, rtSPlus1] = await Promise.all([
      computeCrmTypeScore(entrepriseFilter, "RDV", sMoins1),
      computeCrmTypeScore(entrepriseFilter, "RDV", s0),
      computeCrmTypeScore(entrepriseFilter, "RDV", sPlus1),
      computeCrmTypeScore(entrepriseFilter, "RDV_TECHNIQUE", sMoins1),
      computeCrmTypeScore(entrepriseFilter, "RDV_TECHNIQUE", s0),
      computeCrmTypeScore(entrepriseFilter, "RDV_TECHNIQUE", sPlus1),
    ]);
    crmScoreSMoins1 = [
      { name: "RDV positionnées", value: rdvSMoins1.positionnees, color: "#cbd5e1" },
      { name: "RDV réalisées", value: rdvSMoins1.realisees, color: "#94a3b8" },
      { name: "RT positionnées", value: rtSMoins1.positionnees, color: "#a5b4fc" },
      { name: "RT réalisées", value: rtSMoins1.realisees, color: "#818cf8" },
    ];
    crmScoreS = [
      { name: "RDV positionnées", value: rdvS.positionnees, color: "#60a5fa" },
      { name: "RDV réalisées", value: rdvS.realisees, color: "#2563eb" },
      { name: "RT positionnées", value: rtS.positionnees, color: "#818cf8" },
      { name: "RT réalisées", value: rtS.realisees, color: "#4f46e5" },
    ];
    crmScoreSPlus1 = { rdvAVenir: rdvSPlus1.aVenir, rtAVenir: rtSPlus1.aVenir };
  } else {
    const [rdvP, rtP] = await Promise.all([
      computeCrmTypeScore(entrepriseFilter, "RDV", periode),
      computeCrmTypeScore(entrepriseFilter, "RDV_TECHNIQUE", periode),
    ]);
    crmScorePeriode = [
      { name: "RDV positionnées", value: rdvP.positionnees, color: "#60a5fa" },
      { name: "RDV réalisées", value: rdvP.realisees, color: "#2563eb" },
      { name: "RT positionnées", value: rtP.positionnees, color: "#818cf8" },
      { name: "RT réalisées", value: rtP.realisees, color: "#4f46e5" },
    ];
  }

  const [
    entreprisesTotal,
    relancesCommercialesAVenir,
    rappelsAFaireTotal,
    rdvPeriode,
    propositionsPeriode,
    contratsSignesPeriode,
    entreprisesCreesPeriode,
    missionsActivesTotal,
    besoinsGagnesPeriode,
    besoinsPerdusPeriode,
    taskCounts,
  ] = await Promise.all([
    prisma.entreprise.count({ where: entrepriseFilter }),
    prisma.suiviCommercial.findMany({
      where: {
        fait: false,
        dateProgrammee: { not: null },
        type: { in: ["RDV", "RAPPEL"] },
        entreprise: entrepriseFilter,
      },
      orderBy: { dateProgrammee: "asc" },
      take: 8,
      include: {
        entreprise: { select: { id: true, nom: true } },
        contact: { select: { id: true, prenom: true, nom: true } },
      },
    }),
    prisma.suiviCommercial.count({
      where: { type: "RAPPEL", fait: false, entreprise: entrepriseFilter },
    }),
    prisma.suiviCommercial.count({
      where: { type: "RDV", entreprise: entrepriseFilter, ...periodeCrmDate },
    }),
    prisma.suiviCommercial.count({
      where: { type: "PROPOSITION_ENVOYEE", entreprise: entrepriseFilter, ...periodeCrmDate },
    }),
    prisma.suiviCommercial.count({
      where: { type: "CONTRAT_SIGNE", entreprise: entrepriseFilter, ...periodeCrmDate },
    }),
    prisma.entreprise.count({
      where: { ...entrepriseFilter, createdAt: { gte: periode.debut, lte: periode.fin } },
    }),
    prisma.mission.count({
      where: { statut: "EN_COURS", entreprise: entrepriseFilter },
    }),
    prisma.besoin.count({
      where: {
        statut: "GAGNE",
        entreprise: entrepriseFilter,
        updatedAt: { gte: periode.debut, lte: periode.fin },
      },
    }),
    prisma.besoin.count({
      where: {
        statut: "PERDU",
        entreprise: entrepriseFilter,
        updatedAt: { gte: periode.debut, lte: periode.fin },
      },
    }),
    getTaskCountsByDomain(session.user),
  ]);

  const pipelineParStatut = await prisma.entreprise.groupBy({
    by: ["statutCommercial"],
    where: entrepriseFilter,
    _count: { _all: true },
  });

  // Répartition par nature de contrat — parmi les consultants réellement
  // internes (staffés ou intercontrat), pas le vivier ATS au sens large.
  const contratsParNature = await prisma.consultant.groupBy({
    by: ["natureContrat"],
    where: {
      ...bmFilter,
      statutCandidatInterne: {
        in: [
          STATUT_CANDIDAT_INTERNE.STAFFE,
          STATUT_CANDIDAT_INTERNE.INTERCONTRAT_A_VENIR,
          STATUT_CANDIDAT_INTERNE.INTERCONTRAT,
        ],
      },
    },
    _count: { _all: true },
  });
  const totalConsultantsInternes = contratsParNature.reduce((sum, row) => sum + row._count._all, 0);

  const peutVoirActivteParBm = canReassignReferent(session.user);
  const activiteParBm = peutVoirActivteParBm
    ? await (async () => {
        const bms = await prisma.user.findMany({
          where: { role: ROLES.BM, active: true },
          orderBy: { name: "asc" },
        });
        const [entreprisesParBm, candidatsParBm, suivisParBmPeriode] = await Promise.all([
          prisma.entreprise.groupBy({ by: ["businessManagerId"], _count: { _all: true } }),
          prisma.consultant.groupBy({ by: ["businessManagerId"], _count: { _all: true } }),
          prisma.suiviCommercial.groupBy({
            by: ["createdById", "type"],
            where: { ...periodeCrmDate, type: { in: ["RDV", "PROPOSITION_ENVOYEE", "CONTRAT_SIGNE"] } },
            _count: { _all: true },
          }),
        ]);
        const entMap = new Map(entreprisesParBm.map((e) => [e.businessManagerId, e._count._all]));
        const candMap = new Map(candidatsParBm.map((c) => [c.businessManagerId, c._count._all]));
        return bms.map((bm) => {
          const suivisBm = suivisParBmPeriode.filter((s) => s.createdById === bm.id);
          const countType = (type: string) => suivisBm.find((s) => s.type === type)?._count._all ?? 0;
          return {
            id: bm.id,
            name: bm.name,
            entreprises: entMap.get(bm.id) ?? 0,
            candidats: candMap.get(bm.id) ?? 0,
            rdv: countType("RDV"),
            propositions: countType("PROPOSITION_ENVOYEE"),
            contrats: countType("CONTRAT_SIGNE"),
          };
        });
      })()
    : [];

  const now = new Date();
  const relancesCommercialesEnRetard = relancesCommercialesAVenir.filter(
    (r) => r.dateProgrammee! < now
  ).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-brand-ink">Tableau de bord — Commerce</h1>
        <p className="mt-1 text-sm text-brand-gray">
          Bienvenue {session.user.name}. Suivez le pipeline commercial et les relances à traiter.
        </p>
      </div>

      {(taskCounts.crm.enRetard > 0 || taskCounts.crm.aVenir > 0) && (
        <div className="flex flex-wrap gap-3">
          {taskCounts.crm.enRetard > 0 && (
            <div className="flex min-w-[280px] flex-1 items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-800 shadow-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700 text-base font-semibold">
                !
              </span>
              <span>
                <span className="font-semibold">
                  {taskCounts.crm.enRetard} tâche{taskCounts.crm.enRetard > 1 ? "s" : ""} CRM en retard
                </span>{" "}
                (RDV / rappels commerciaux).{" "}
                <Link href="/admin/crm/activites?fait=0" className="link-underline font-medium">
                  Voir le détail
                </Link>
              </span>
            </div>
          )}
          {taskCounts.crm.aVenir > 0 && (
            <div className="flex min-w-[280px] flex-1 items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-800 shadow-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 7v5l3.5 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </span>
              <span>
                <span className="font-semibold">
                  {taskCounts.crm.aVenir} tâche{taskCounts.crm.aVenir > 1 ? "s" : ""} CRM à venir
                </span>{" "}
                dans les 7 prochains jours.
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-brand-blue-dark">
          Prospection &amp; pipeline
        </h2>
        <PeriodeSelector basePath={BASE_PATH} current={periode} />
      </div>

      <section className="card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-brand-ink">Score prospection commerciale</h3>
          <ScoreVueToggle current={scoreVue} scoreVueQuery={scoreVueQuery} />
        </div>
        {scoreVue === "semaine" ? (
          <>
            <p className="mb-3 text-xs text-brand-gray">
              RDV prospection et RT positionnés/réalisés sur S-1 et S, à venir sur S+1.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-1.5 text-xs font-medium text-brand-gray">S-1 (semaine dernière)</p>
                <ScoreBarChart data={crmScoreSMoins1} height={180} />
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-brand-gray">S (cette semaine)</p>
                <ScoreBarChart data={crmScoreS} height={180} />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
              <StatCard
                label="RT à venir (S+1)"
                value={crmScoreSPlus1.rtAVenir}
                accent="blue"
                icon={<path d="M8 3v3M16 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />}
              />
              <StatCard
                label="RDV prospection à venir (S+1)"
                value={crmScoreSPlus1.rdvAVenir}
                accent="blue"
                icon={<path d="M8 3v3M16 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />}
              />
            </div>
          </>
        ) : (
          <>
            <p className="mb-3 text-xs text-brand-gray">
              Utilise la période sélectionnée ci-dessus ({periode.label}).
            </p>
            <ScoreBarChart data={crmScorePeriode} />
          </>
        )}
      </section>

      <div>
        <p className="mb-2 text-xs font-medium text-brand-gray">Vivier (à date)</p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            label="Entreprises (total)"
            value={entreprisesTotal}
            accent="blue"
            href="/admin/crm"
            icon={<path d="M4 20.5V6.5A1.5 1.5 0 0 1 5.5 5H12v3M12 20.5H4M12 8V5l7.5 3v12.5M12 20.5h9M8 9h.01M8 12.5h.01M8 16h.01M15.5 11h.01M15.5 14.5h.01M15.5 18h.01" />}
          />
          <StatCard
            label="Missions actives"
            value={missionsActivesTotal}
            accent="green"
            href="/admin/missions"
            icon={<path d="M9 12.5 11 14.5 15.5 9.5M12 3l7 3.5v5c0 4.5-3 8.5-7 9.5-4-1-7-5-7-9.5v-5L12 3Z" />}
          />
          <StatCard
            label="Rappels à faire"
            value={rappelsAFaireTotal}
            accent={rappelsAFaireTotal > 0 ? "amber" : "gray"}
            href="/admin/crm/activites?type=RAPPEL&fait=0"
            icon={<path d="M12 7v5l3.5 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />}
          />
          <StatCard
            label="Rappels en retard"
            value={relancesCommercialesEnRetard}
            accent={relancesCommercialesEnRetard > 0 ? "amber" : "gray"}
            icon={<path d="M18.364 5.636 5.636 18.364M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z" />}
          />
        </div>
      </div>

      {(pipelineParStatut.length > 0 || totalConsultantsInternes > 0) && (
        <div className="flex flex-wrap gap-6">
          {pipelineParStatut.length > 0 && (
            <div className="card min-w-[320px] flex-1 p-5">
              <h3 className="mb-3 text-sm font-semibold text-brand-ink">
                Pipeline commercial — répartition par statut
              </h3>
              <PipelineBreakdown data={pipelineParStatut} total={entreprisesTotal} />
            </div>
          )}
          {totalConsultantsInternes > 0 && (
            <div className="card min-w-[320px] flex-1 p-5">
              <h3 className="mb-3 text-sm font-semibold text-brand-ink">
                Répartition des contrats
                <span className="ml-1.5 font-normal text-brand-gray">
                  (consultants staffés / intercontrat)
                </span>
              </h3>
              <ContratsBreakdown data={contratsParNature} total={totalConsultantsInternes} />
            </div>
          )}
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-medium text-brand-gray">Activité — {periode.label}</p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <StatCard
            label="Entreprises créées"
            value={entreprisesCreesPeriode}
            accent="blue"
            icon={<path d="M12 4.5v15M4.5 12h15" />}
          />
          <StatCard
            label="RDV programmés"
            value={rdvPeriode}
            accent="blue"
            href={`/admin/crm/activites?type=RDV&${periodeQuery}`}
            icon={<path d="M8 3v3M16 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM9 13l2 2 4-4" />}
          />
          <StatCard
            label="Propositions envoyées"
            value={propositionsPeriode}
            accent="blue"
            href={`/admin/crm/activites?type=PROPOSITION_ENVOYEE&${periodeQuery}`}
            icon={<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h9L20 9.5V18.5A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-13ZM13.5 4v5h5.5M8 13h8M8 16.5h5" />}
          />
          <StatCard
            label="Contrats signés"
            value={contratsSignesPeriode}
            accent="green"
            href={`/admin/crm/activites?type=CONTRAT_SIGNE&${periodeQuery}`}
            icon={<path d="M9 12.5 11 14.5 15.5 9.5M12 3l7 3.5v5c0 4.5-3 8.5-7 9.5-4-1-7-5-7-9.5v-5L12 3Z" />}
          />
          <StatCard
            label="Besoins staffés (gagnés)"
            value={besoinsGagnesPeriode}
            accent="green"
            href="/admin/crm/besoins?statut=GAGNE"
            icon={<path d="M9 12.5 11 14.5 15.5 9.5M12 3l7 3.5v5c0 4.5-3 8.5-7 9.5-4-1-7-5-7-9.5v-5L12 3Z" />}
          />
          <StatCard
            label="Besoins perdus"
            value={besoinsPerdusPeriode}
            accent={besoinsPerdusPeriode > 0 ? "amber" : "gray"}
            href="/admin/crm/besoins?statut=PERDU"
            icon={<path d="M18.364 5.636 5.636 18.364M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z" />}
          />
        </div>
      </div>

      <section className="card p-5">
        <h3 className="text-sm font-semibold text-brand-ink mb-3">Relances commerciales (CRM) à venir</h3>
        {relancesCommercialesAVenir.length === 0 ? (
          <p className="text-sm text-brand-gray">Aucune relance programmée.</p>
        ) : (
          <ul className="-mx-2 divide-y divide-slate-100">
            {relancesCommercialesAVenir.map((r) => {
              const overdue = r.dateProgrammee! < now;
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-lg px-2 py-2.5 transition-colors hover:bg-brand-blue-bg-soft"
                >
                  <div className="text-sm">
                    <span className="font-medium text-brand-ink">{r.entreprise.nom}</span>
                    {r.contact && (
                      <span className="text-brand-gray">
                        {" "}
                        — {r.contact.prenom} {r.contact.nom}
                      </span>
                    )}
                    <span className="text-brand-gray"> — {r.titre}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs ${overdue ? "font-medium text-red-600" : "text-brand-gray"}`}>
                      {new Date(r.dateProgrammee!).toLocaleString("fr-FR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                      {overdue ? " · en retard" : ""}
                    </span>
                    <Link
                      href={
                        r.contact
                          ? `/admin/crm/${r.entreprise.id}/contacts/${r.contact.id}`
                          : `/admin/crm/${r.entreprise.id}`
                      }
                      className="link-underline text-sm text-brand-blue-dark"
                    >
                      Voir
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {peutVoirActivteParBm && activiteParBm.length > 0 && (
        <section className="card p-5">
          <h3 className="text-sm font-semibold text-brand-ink mb-1">Activité par business manager</h3>
          <p className="mb-3 text-xs text-brand-gray">
            Vivier (à date) et actions commerciales — {periode.label}.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-brand-gray">
                <tr>
                  <th className="py-2 pr-3">BM</th>
                  <th className="py-2 pr-3">Candidats gérés</th>
                  <th className="py-2 pr-3">Entreprises référentes</th>
                  <th className="py-2 pr-3">RDV</th>
                  <th className="py-2 pr-3">Propositions</th>
                  <th className="py-2 pr-3">Contrats signés</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activiteParBm.map((bm) => (
                  <tr key={bm.id}>
                    <td className="py-2 pr-3 font-medium text-brand-ink">{bm.name}</td>
                    <td className="py-2 pr-3 text-brand-body">{bm.candidats}</td>
                    <td className="py-2 pr-3 text-brand-body">{bm.entreprises}</td>
                    <td className="py-2 pr-3 text-brand-body">{bm.rdv}</td>
                    <td className="py-2 pr-3 text-brand-body">{bm.propositions}</td>
                    <td className="py-2 pr-3 text-brand-body">{bm.contrats}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function PipelineBreakdown({
  data,
  total,
}: {
  data: { statutCommercial: string; _count: { _all: number } }[];
  total: number;
}) {
  const styles: Record<string, string> = {
    PROSPECT: "bg-slate-300",
    EN_COURS: "bg-brand-blue",
    CLIENT: "bg-brand-green",
    PERDU: "bg-red-300",
  };
  return (
    <div className="space-y-2">
      {data.map((row) => {
        const pct = total > 0 ? Math.round((row._count._all / total) * 100) : 0;
        return (
          <div key={row.statutCommercial} className="flex items-center gap-3 text-sm">
            <span className="w-32 shrink-0 text-brand-body">
              {STATUT_ENTREPRISE_LABELS[row.statutCommercial as keyof typeof STATUT_ENTREPRISE_LABELS] ??
                row.statutCommercial}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${styles[row.statutCommercial] ?? "bg-slate-300"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-16 shrink-0 text-right text-xs text-brand-gray">
              {row._count._all} ({pct}%)
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ContratsBreakdown({
  data,
  total,
}: {
  data: { natureContrat: string | null; _count: { _all: number } }[];
  total: number;
}) {
  const styles: Record<string, string> = {
    CDI: "bg-brand-blue",
    CDIC: "bg-brand-blue-light",
    INDEPENDANT: "bg-brand-green",
  };
  const sorted = [...data].sort((a, b) => b._count._all - a._count._all);
  return (
    <div className="space-y-2">
      {sorted.map((row) => {
        const label = row.natureContrat
          ? NATURE_CONTRAT_LABELS[row.natureContrat as keyof typeof NATURE_CONTRAT_LABELS] ??
            row.natureContrat
          : "Non renseigné";
        const pct = total > 0 ? Math.round((row._count._all / total) * 100) : 0;
        return (
          <div key={row.natureContrat ?? "null"} className="flex items-center gap-3 text-sm">
            <span className="w-32 shrink-0 text-brand-body">{label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${
                  row.natureContrat ? styles[row.natureContrat] ?? "bg-slate-300" : "bg-slate-300"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-16 shrink-0 text-right text-xs text-brand-gray">
              {row._count._all} ({pct}%)
            </span>
          </div>
        );
      })}
    </div>
  );
}
