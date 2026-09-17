import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { FICHE_FRAICHEUR_SEUIL_JOURS, CONTACT_REQUEST_STATUS, STATUT_PUBLICATION } from "@/lib/constants";
import { consultantVisibilityWhere } from "@/lib/consultant-access";
import { resolvePeriode, resolveWeekOffset } from "@/lib/periode";
import { getTaskCountsByDomain } from "@/lib/task-counts";
import { computeAtsScore } from "@/lib/dashboard-scores";
import PeriodeSelector from "@/components/PeriodeSelector";
import ScoreBarChart, { type ScoreBarDatum } from "@/components/ScoreBarChart";
import ScoreVueToggle from "@/components/ScoreVueToggle";
import StatCard from "@/components/DashboardStatCard";

export const dynamic = "force-dynamic";

const BASE_PATH = "/admin/tableau-de-bord/recrutement";

export default async function TableauDeBordRecrutementPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string; debut?: string; fin?: string; scoreVue?: string }>;
}) {
  const session = await requireStaff();
  const isAdmin = session.user.role === "ADMIN";
  const staleThreshold = new Date();
  staleThreshold.setDate(staleThreshold.getDate() - FICHE_FRAICHEUR_SEUIL_JOURS);

  const bmFilter = consultantVisibilityWhere(session.user);

  const sp = await searchParams;
  const periode = resolvePeriode(sp);
  const scoreVue: "semaine" | "periode" = sp.scoreVue === "periode" ? "periode" : "semaine";
  const scoreVueQuery = (v: "semaine" | "periode") => {
    const periodeQuery = `periode=${periode.periode}${
      periode.periode === "custom" ? `&debut=${sp.debut}&fin=${sp.fin}` : ""
    }`;
    return `${BASE_PATH}?${periodeQuery}&scoreVue=${v}`;
  };

  let atsScoreData: ScoreBarDatum[];
  if (scoreVue === "semaine") {
    const [atsSMoins1, atsS, atsSPlus1] = await Promise.all([
      computeAtsScore(bmFilter, resolveWeekOffset(-1)),
      computeAtsScore(bmFilter, resolveWeekOffset(0)),
      computeAtsScore(bmFilter, resolveWeekOffset(1)),
    ]);
    atsScoreData = [
      { name: "Pris (S)", value: atsS.pris, color: "#2563eb" },
      { name: "Prévus (S)", value: atsS.prevus, color: "#60a5fa" },
      { name: "Prévus (S+1)", value: atsSPlus1.prevus, color: "#16a34a" },
      { name: "Réalisés (S-1)", value: atsSMoins1.realises, color: "#94a3b8" },
    ];
  } else {
    const atsP = await computeAtsScore(bmFilter, periode);
    atsScoreData = [
      { name: "Pris", value: atsP.pris, color: "#2563eb" },
      { name: "Prévus", value: atsP.prevus, color: "#60a5fa" },
      { name: "Réalisés", value: atsP.realises, color: "#16a34a" },
    ];
  }

  const [publiees, aRafraichir, demandesNouvelles, demandesBesoinNouvelles, aPurger, rappelsAVenir, taskCounts] =
    await Promise.all([
      prisma.consultant.count({
        where: { ...bmFilter, statutPublication: STATUT_PUBLICATION.PUBLIEE },
      }),
      prisma.consultant.findMany({
        where: {
          ...bmFilter,
          statutPublication: STATUT_PUBLICATION.PUBLIEE,
          updatedAt: { lt: staleThreshold },
        },
        orderBy: { updatedAt: "asc" },
        take: 10,
        select: { id: true, referenceAnonyme: true, intitulePoste: true, updatedAt: true },
      }),
      prisma.contactRequest.findMany({
        where: {
          status: CONTACT_REQUEST_STATUS.NOUVELLE,
          consultant: bmFilter,
        },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { consultant: true, clientUser: true },
      }),
      // Non rattachées à un BM référent : comptées pour tout le back-office.
      prisma.demandeBesoin.findMany({
        where: { status: CONTACT_REQUEST_STATUS.NOUVELLE },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { clientUser: true },
      }),
      isAdmin
        ? prisma.consultant.count({
            where: {
              dateConservationLimite: { lt: new Date() },
            },
          })
        : Promise.resolve(0),
      prisma.suiviCandidat.findMany({
        where: {
          fait: false,
          dateProgrammee: { not: null },
          type: { in: ["RDV", "RAPPEL"] },
          consultant: bmFilter,
        },
        orderBy: { dateProgrammee: "asc" },
        take: 8,
        include: { consultant: { select: { id: true, referenceAnonyme: true, intitulePoste: true } } },
      }),
      getTaskCountsByDomain(session.user),
    ]);

  const now = new Date();
  const rappelsEnRetard = rappelsAVenir.filter((r) => r.dateProgrammee! < now).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-brand-ink">Tableau de bord — Recrutement</h1>
        <p className="mt-1 text-sm text-brand-gray">
          Bienvenue {session.user.name}. Rituel hebdomadaire : vérifiez les fiches à actualiser et
          traitez les nouvelles demandes.
        </p>
      </div>

      {(taskCounts.ats.enRetard > 0 || taskCounts.ats.aVenir > 0) && (
        <div className="flex flex-wrap gap-3">
          {taskCounts.ats.enRetard > 0 && (
            <div className="flex min-w-[280px] flex-1 items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-800 shadow-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700 text-base font-semibold">
                !
              </span>
              <span>
                <span className="font-semibold">
                  {taskCounts.ats.enRetard} tâche{taskCounts.ats.enRetard > 1 ? "s" : ""} ATS en retard
                </span>{" "}
                (RDV / rappels candidats).
              </span>
            </div>
          )}
          {taskCounts.ats.aVenir > 0 && (
            <div className="flex min-w-[280px] flex-1 items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-800 shadow-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 7v5l3.5 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </span>
              <span>
                <span className="font-semibold">
                  {taskCounts.ats.aVenir} tâche{taskCounts.ats.aVenir > 1 ? "s" : ""} ATS à venir
                </span>{" "}
                dans les 7 prochains jours.
              </span>
            </div>
          )}
        </div>
      )}

      {isAdmin && aPurger > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-800 shadow-sm">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
            !
          </span>
          <span>
            {aPurger} dossier(s) ont dépassé leur durée de conservation RGPD et doivent être revus.{" "}
            <Link href="/admin/consultants?purge=1" className="link-underline font-medium">
              Voir les dossiers
            </Link>
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard
          label="Fiches publiées"
          value={publiees}
          accent="green"
          href="/admin/consultants"
          icon={<path d="M9 12.5 11 14.5 15.5 9.5M12 3l7 3.5v5c0 4.5-3 8.5-7 9.5-4-1-7-5-7-9.5v-5L12 3Z" />}
        />
        <StatCard
          label="Demandes non traitées"
          value={demandesNouvelles.length + demandesBesoinNouvelles.length}
          accent={demandesNouvelles.length + demandesBesoinNouvelles.length > 0 ? "amber" : "gray"}
          href="/admin/demandes"
          icon={<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v10a1.5 1.5 0 0 1-1.5 1.5H9l-4.5 3.5V17H5.5A1.5 1.5 0 0 1 4 15.5v-10Z" />}
        />
        <StatCard
          label="Rappels ATS en retard"
          value={rappelsEnRetard}
          accent={rappelsEnRetard > 0 ? "amber" : "gray"}
          icon={<path d="M12 7v5l3.5 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />}
        />
      </div>

      <section className="card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-brand-ink">Score entretiens</h3>
          <ScoreVueToggle current={scoreVue} scoreVueQuery={scoreVueQuery} />
        </div>
        {scoreVue === "semaine" ? (
          <p className="mb-2 text-xs text-brand-gray">
            Pris et prévus sur la semaine en cours (S), prévus la semaine prochaine (S+1), réalisés
            la semaine dernière (S-1).
          </p>
        ) : (
          <div className="mb-3">
            <PeriodeSelector basePath={BASE_PATH} current={periode} extraParams={{ scoreVue: "periode" }} />
          </div>
        )}
        <ScoreBarChart data={atsScoreData} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h3 className="text-sm font-semibold text-brand-ink mb-3">
            Fiches publiées à actualiser
            <span className="ml-1.5 font-normal text-brand-gray">
              (non modifiées depuis plus de {FICHE_FRAICHEUR_SEUIL_JOURS} jours)
            </span>
          </h3>
          {aRafraichir.length === 0 ? (
            <p className="text-sm text-brand-gray">Aucune fiche signalée. Bien joué.</p>
          ) : (
            <ul className="-mx-2 divide-y divide-slate-100">
              {aRafraichir.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-lg px-2 py-2.5 transition-colors hover:bg-brand-blue-bg-soft"
                >
                  <div className="text-sm">
                    <span className="font-medium text-brand-ink">{c.referenceAnonyme}</span>{" "}
                    <span className="text-brand-gray">— {c.intitulePoste}</span>
                  </div>
                  <Link
                    href={`/admin/consultants/${c.id}`}
                    className="link-underline text-sm text-brand-blue-dark"
                  >
                    Actualiser
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h3 className="text-sm font-semibold text-brand-ink mb-3">Dernières demandes non traitées</h3>
          {demandesNouvelles.length === 0 && demandesBesoinNouvelles.length === 0 ? (
            <p className="text-sm text-brand-gray">Aucune demande en attente.</p>
          ) : (
            <ul className="-mx-2 divide-y divide-slate-100">
              {demandesNouvelles.map((d) => (
                <li
                  key={`profil-${d.id}`}
                  className="flex items-center justify-between rounded-lg px-2 py-2.5 transition-colors hover:bg-brand-blue-bg-soft"
                >
                  <div className="text-sm">
                    <span className="font-medium text-brand-ink">{d.consultant.referenceAnonyme}</span>{" "}
                    <span className="text-brand-gray">— demandé par {d.clientUser.name}</span>
                  </div>
                  <Link href="/admin/demandes" className="link-underline text-sm text-brand-blue-dark">
                    Traiter
                  </Link>
                </li>
              ))}
              {demandesBesoinNouvelles.map((d) => (
                <li
                  key={`besoin-${d.id}`}
                  className="flex items-center justify-between rounded-lg px-2 py-2.5 transition-colors hover:bg-brand-blue-bg-soft"
                >
                  <div className="text-sm">
                    <span className="font-medium text-brand-ink">{d.intitulePoste}</span>{" "}
                    <span className="text-brand-gray">— besoin décrit par {d.clientUser.name}</span>
                  </div>
                  <Link href="/admin/demandes" className="link-underline text-sm text-brand-blue-dark">
                    Traiter
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card p-5">
        <h3 className="text-sm font-semibold text-brand-ink mb-3">Rappels &amp; RDV candidats à venir</h3>
        {rappelsAVenir.length === 0 ? (
          <p className="text-sm text-brand-gray">Aucun rappel programmé.</p>
        ) : (
          <ul className="-mx-2 divide-y divide-slate-100">
            {rappelsAVenir.map((r) => {
              const overdue = r.dateProgrammee! < now;
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-lg px-2 py-2.5 transition-colors hover:bg-brand-blue-bg-soft"
                >
                  <div className="text-sm">
                    <span className="font-medium text-brand-ink">{r.consultant.referenceAnonyme}</span>{" "}
                    <span className="text-brand-gray">— {r.titre}</span>
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
                      href={`/admin/consultants/${r.consultant.id}`}
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
    </div>
  );
}
