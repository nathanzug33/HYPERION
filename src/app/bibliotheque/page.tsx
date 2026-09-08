import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";
import { ROLES, CONTACT_REQUEST_STATUS_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function EspaceClientDashboard() {
  const session = await requireRole(ROLES.CLIENT, ROLES.ADMIN, ROLES.BM);

  // Le tableau de bord (stats personnelles) n'a de sens que pour un compte
  // client — un admin/BM qui prévisualise la bibliothèque va directement à
  // la recherche.
  if (session.user.role !== ROLES.CLIENT) {
    redirect("/bibliotheque/dossiers");
  }

  const userId = session.user.id;

  const [
    dossiersConsultes,
    contactRequests,
    demandesBesoin,
    consultationsRecentes,
    profilsDisponibles,
  ] = await Promise.all([
    prisma.consultationLog.count({ where: { userId } }),
    prisma.contactRequest.findMany({
      where: { clientUserId: userId },
      orderBy: { createdAt: "desc" },
      include: { consultant: { select: { referenceAnonyme: true, intitulePoste: true } } },
    }),
    prisma.demandeBesoin.findMany({
      where: { clientUserId: userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.consultationLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      distinct: ["consultantId"],
      include: { consultant: { select: { referenceAnonyme: true, intitulePoste: true, statutPublication: true } } },
    }),
    prisma.consultant.count({ where: { statutPublication: "PUBLIEE" } }),
  ]);

  const demandesEnCours =
    contactRequests.filter((d) => d.status === "NOUVELLE" || d.status === "EN_COURS").length +
    demandesBesoin.filter((d) => d.status === "NOUVELLE" || d.status === "EN_COURS").length;

  type DemandeMerged = {
    id: string;
    kind: "profil" | "besoin";
    label: string;
    status: string;
    createdAt: Date;
  };
  const demandesRecentes: DemandeMerged[] = [
    ...contactRequests.map((d) => ({
      id: d.id,
      kind: "profil" as const,
      label: `${d.consultant.referenceAnonyme} — ${d.consultant.intitulePoste ?? "profil"}`,
      status: d.status,
      createdAt: d.createdAt,
    })),
    ...demandesBesoin.map((d) => ({
      id: d.id,
      kind: "besoin" as const,
      label: d.intitulePoste,
      status: d.status,
      createdAt: d.createdAt,
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-brand-ink">Tableau de bord</h1>
        <p className="mt-1 text-sm text-brand-gray">
          Bienvenue {session.user.name}. Retrouvez ici votre activité sur la
          bibliothèque de compétences.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Dossiers consultés"
          value={dossiersConsultes}
          accent="blue"
          icon={<path d="M12 4.5C7 4.5 3 12 3 12s4 7.5 9 7.5 9-7.5 9-7.5-4-7.5-9-7.5Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />}
        />
        <StatCard
          label="Demandes envoyées"
          value={contactRequests.length + demandesBesoin.length}
          accent="green"
          icon={<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v10a1.5 1.5 0 0 1-1.5 1.5H9l-4.5 3.5V17H5.5A1.5 1.5 0 0 1 4 15.5v-10Z" />}
        />
        <StatCard
          label="Demandes en cours"
          value={demandesEnCours}
          accent={demandesEnCours > 0 ? "amber" : "gray"}
          icon={<path d="M12 7v5l3.5 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />}
        />
        <StatCard
          label="Profils disponibles"
          value={profilsDisponibles}
          accent="gray"
          icon={<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H15l5 5v8.5A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-11ZM14 4v4a1 1 0 0 0 1 1h4M8 13h8M8 16.5h5" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-brand-ink">Consultés récemment</h2>
            <Link href="/bibliotheque/dossiers" className="link-underline text-xs text-brand-blue-dark">
              Voir la bibliothèque
            </Link>
          </div>
          {consultationsRecentes.length === 0 ? (
            <p className="text-sm text-brand-gray">
              Vous n&apos;avez pas encore consulté de dossier.
            </p>
          ) : (
            <ul className="-mx-2 divide-y divide-slate-100">
              {consultationsRecentes.map((log) => (
                <li
                  key={log.id}
                  className="flex items-center justify-between rounded-lg px-2 py-2.5 transition-colors hover:bg-brand-blue-bg-soft"
                >
                  <div className="text-sm">
                    <span className="font-mono font-medium text-brand-ink">
                      {log.consultant.referenceAnonyme}
                    </span>{" "}
                    <span className="text-brand-gray">— {log.consultant.intitulePoste}</span>
                  </div>
                  {log.consultant.statutPublication === "PUBLIEE" && (
                    <Link
                      href={`/bibliotheque/dossiers/${log.consultant.referenceAnonyme}`}
                      className="link-underline text-sm text-brand-blue-dark"
                    >
                      Revoir
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-brand-ink">Mes demandes récentes</h2>
            <Link href="/bibliotheque/demandes" className="link-underline text-xs text-brand-blue-dark">
              Toutes mes demandes
            </Link>
          </div>
          {demandesRecentes.length === 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-brand-gray">Aucune demande envoyée pour le moment.</p>
              <Link href="/bibliotheque/demandes/nouvelle" className="btn btn-secondary text-xs">
                + Décrire un besoin
              </Link>
            </div>
          ) : (
            <ul className="-mx-2 divide-y divide-slate-100">
              {demandesRecentes.map((d) => (
                <li
                  key={`${d.kind}-${d.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-brand-blue-bg-soft"
                >
                  <div className="min-w-0 text-sm">
                    <span className="text-brand-gray">
                      {d.kind === "profil" ? "Profil" : "Besoin"} —{" "}
                    </span>
                    <span className="font-medium text-brand-ink">{d.label}</span>
                  </div>
                  <DemandeStatusBadge status={d.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
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

function DemandeStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    NOUVELLE: "bg-brand-blue-bg text-brand-blue-dark",
    EN_COURS: "bg-amber-50 text-amber-700",
    TRAITEE: "bg-brand-green/10 text-brand-green",
    SANS_SUITE: "bg-slate-100 text-brand-gray",
  };
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${styles[status] ?? ""}`}>
      {CONTACT_REQUEST_STATUS_LABELS[status as keyof typeof CONTACT_REQUEST_STATUS_LABELS] ?? status}
    </span>
  );
}
