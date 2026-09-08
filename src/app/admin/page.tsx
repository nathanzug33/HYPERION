import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import {
  FICHE_FRAICHEUR_SEUIL_JOURS,
  CONTACT_REQUEST_STATUS,
  STATUT_PUBLICATION,
} from "@/lib/constants";
import { consultantVisibilityWhere } from "@/lib/consultant-access";
import { entrepriseVisibilityWhere } from "@/lib/crm-access";
import { resolvePeriode, suiviCommercialDateFilter } from "@/lib/periode";
import PeriodeSelector from "@/components/PeriodeSelector";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string; debut?: string; fin?: string }>;
}) {
  const session = await requireStaff();
  const isAdmin = session.user.role === "ADMIN";
  const staleThreshold = new Date();
  staleThreshold.setDate(staleThreshold.getDate() - FICHE_FRAICHEUR_SEUIL_JOURS);

  const bmFilter = consultantVisibilityWhere(session.user);
  const entrepriseFilter = entrepriseVisibilityWhere(session.user);

  const sp = await searchParams;
  const periode = resolvePeriode(sp);
  const periodeQuery = `periode=${periode.periode}${
    periode.periode === "custom" ? `&debut=${sp.debut}&fin=${sp.fin}` : ""
  }`;
  const periodeCrmDate = suiviCommercialDateFilter(periode);

  const [
    total,
    publiees,
    brouillons,
    aRafraichir,
    demandesNouvelles,
    demandesBesoinNouvelles,
    aPurger,
    rappelsAVenir,
    entreprisesTotal,
    relancesCommercialesAVenir,
    rappelsAFaireTotal,
    rdvPeriode,
    propositionsPeriode,
    contratsSignesPeriode,
    entreprisesCreesPeriode,
  ] = await Promise.all([
    prisma.consultant.count({ where: bmFilter }),
    prisma.consultant.count({
      where: { ...bmFilter, statutPublication: STATUT_PUBLICATION.PUBLIEE },
    }),
    prisma.consultant.count({
      where: { ...bmFilter, statutPublication: STATUT_PUBLICATION.BROUILLON },
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
  ]);

  const now = new Date();
  const rappelsEnRetard = rappelsAVenir.filter((r) => r.dateProgrammee! < now).length;
  const relancesCommercialesEnRetard = relancesCommercialesAVenir.filter(
    (r) => r.dateProgrammee! < now
  ).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-brand-ink">Tableau de bord</h1>
          <p className="mt-1 text-sm text-brand-gray">
            Bienvenue {session.user.name}. Rituel hebdomadaire : vérifiez les
            fiches à actualiser et traitez les nouvelles demandes.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/crm/nouvelle" className="btn btn-secondary">
            + Ajouter une entreprise
          </Link>
          <Link href="/admin/consultants/nouveau" className="btn btn-secondary">
            + Ajouter un candidat
          </Link>
          <Link href="/admin/consultants/generer-ia" className="btn btn-primary">
            ✨ Générer avec l&apos;IA
          </Link>
        </div>
      </div>

      {isAdmin && aPurger > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-800 shadow-sm">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
            !
          </span>
          <span>
            {aPurger} dossier(s) ont dépassé leur durée de conservation RGPD et
            doivent être revus.{" "}
            <Link href="/admin/consultants?purge=1" className="link-underline font-medium">
              Voir les dossiers
            </Link>
          </span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* ATS — candidats                                                */}
      {/* ------------------------------------------------------------- */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-brand-blue-dark">
          ATS — Candidats
        </h2>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <StatCard
            label="Candidats suivis"
            value={total}
            accent="blue"
            href="/admin/consultants"
            icon={
              <path d="M4 5.5C4 4.67 4.67 4 5.5 4H11a2 2 0 0 1 2 2v14a1.5 1.5 0 0 0-1.5-1.5H4V5.5ZM20 5.5c0-.83-.67-1.5-1.5-1.5H13a2 2 0 0 0-2 2v14a1.5 1.5 0 0 1 1.5-1.5H20V5.5Z" />
            }
          />
          <StatCard
            label="Fiches publiées"
            value={publiees}
            accent="green"
            icon={<path d="M9 12.5 11 14.5 15.5 9.5M12 3l7 3.5v5c0 4.5-3 8.5-7 9.5-4-1-7-5-7-9.5v-5L12 3Z" />}
          />
          <StatCard
            label="Brouillons"
            value={brouillons}
            accent="gray"
            icon={<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H15l5 5v8.5A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-11ZM14 4v4a1 1 0 0 0 1 1h4M8 13h8M8 16.5h5" />}
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
            <h3 className="text-sm font-semibold text-brand-ink mb-3">
              Dernières demandes non traitées
            </h3>
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
                      <span className="font-medium text-brand-ink">
                        {d.consultant.referenceAnonyme}
                      </span>{" "}
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
                      <span className="text-brand-gray">
                        — besoin décrit par {d.clientUser.name}
                      </span>
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
          <h3 className="text-sm font-semibold text-brand-ink mb-3">
            Rappels &amp; RDV candidats à venir
          </h3>
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
                      <span className="font-medium text-brand-ink">
                        {r.consultant.referenceAnonyme}
                      </span>{" "}
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
      </section>

      {/* ------------------------------------------------------------- */}
      {/* CRM — commercial                                               */}
      {/* ------------------------------------------------------------- */}
      <section className="space-y-4 border-t border-slate-200 pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-brand-blue-dark">
            CRM — Commercial
          </h2>
          <PeriodeSelector basePath="/admin" current={periode} />
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-brand-gray">Vivier (à date)</p>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <StatCard
              label="Entreprises (total)"
              value={entreprisesTotal}
              accent="blue"
              href="/admin/crm"
              icon={<path d="M4 20.5V6.5A1.5 1.5 0 0 1 5.5 5H12v3M12 20.5H4M12 8V5l7.5 3v12.5M12 20.5h9M8 9h.01M8 12.5h.01M8 16h.01M15.5 11h.01M15.5 14.5h.01M15.5 18h.01" />}
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

        <div>
          <p className="mb-2 text-xs font-medium text-brand-gray">
            Activité — {periode.label}
          </p>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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
          </div>
        </div>

        <section className="card p-5">
          <h3 className="text-sm font-semibold text-brand-ink mb-3">
            Relances commerciales (CRM) à venir
          </h3>
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
      </section>
    </div>
  );
}

const ACCENTS = {
  blue: { bg: "bg-brand-blue/10", text: "text-brand-blue-dark", bar: "bg-brand-blue" },
  green: { bg: "bg-brand-green/10", text: "text-brand-green", bar: "bg-brand-green" },
  amber: { bg: "bg-amber-100", text: "text-amber-700", bar: "bg-amber-400" },
  gray: { bg: "bg-slate-100", text: "text-brand-gray", bar: "bg-slate-300" },
} as const;

function StatCard({
  label,
  value,
  icon,
  accent,
  href,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: keyof typeof ACCENTS;
  href?: string;
}) {
  const a = ACCENTS[accent];
  const content = (
    <>
      <span className={`absolute inset-x-0 top-0 h-1 ${a.bar}`} aria-hidden />
      <div className="flex items-start justify-between">
        <div className="text-3xl font-semibold text-brand-ink">{value}</div>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${a.bg} ${a.text}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            {icon}
          </svg>
        </span>
      </div>
      <div className="mt-1 text-xs text-brand-gray">{label}</div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="card card-hover relative block overflow-hidden p-4">
        {content}
      </Link>
    );
  }

  return <div className="card relative overflow-hidden p-4">{content}</div>;
}
