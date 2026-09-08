import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import {
  FICHE_FRAICHEUR_SEUIL_JOURS,
  CONTACT_REQUEST_STATUS,
  STATUT_PUBLICATION,
} from "@/lib/constants";
import { consultantVisibilityWhere } from "@/lib/consultant-access";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await requireStaff();
  const isAdmin = session.user.role === "ADMIN";
  const staleThreshold = new Date();
  staleThreshold.setDate(staleThreshold.getDate() - FICHE_FRAICHEUR_SEUIL_JOURS);

  const bmFilter = consultantVisibilityWhere(session.user);

  const [
    total,
    publiees,
    brouillons,
    aRafraichir,
    demandesNouvelles,
    demandesBesoinNouvelles,
    aPurger,
    rappelsAVenir,
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
    ]);

  const now = new Date();
  const rappelsEnRetard = rappelsAVenir.filter((r) => r.dateProgrammee! < now).length;

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
          <Link href="/admin/consultants/nouveau" className="btn btn-secondary">
            + Ajouter un candidat
          </Link>
          <Link href="/admin/consultants/generer-ia" className="btn btn-primary">
            ✨ Générer avec l&apos;IA
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label="Candidats suivis"
          value={total}
          accent="blue"
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
          icon={<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v10a1.5 1.5 0 0 1-1.5 1.5H9l-4.5 3.5V17H5.5A1.5 1.5 0 0 1 4 15.5v-10Z" />}
        />
        <StatCard
          label="Rappels en retard"
          value={rappelsEnRetard}
          accent={rappelsEnRetard > 0 ? "amber" : "gray"}
          icon={<path d="M12 7v5l3.5 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />}
        />
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

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-brand-ink mb-3">
            Fiches publiées à actualiser
            <span className="ml-1.5 font-normal text-brand-gray">
              (non modifiées depuis plus de {FICHE_FRAICHEUR_SEUIL_JOURS} jours)
            </span>
          </h2>
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
          <h2 className="text-sm font-semibold text-brand-ink mb-3">
            Dernières demandes non traitées
          </h2>
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
        <h2 className="text-sm font-semibold text-brand-ink mb-3">
          Rappels &amp; RDV à venir
        </h2>
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
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: keyof typeof ACCENTS;
}) {
  const a = ACCENTS[accent];
  return (
    <div className="card card-hover relative overflow-hidden p-4">
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
    </div>
  );
}
