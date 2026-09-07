import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import {
  FICHE_FRAICHEUR_SEUIL_JOURS,
  CONTACT_REQUEST_STATUS,
  STATUT_PUBLICATION,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await requireStaff();
  const isAdmin = session.user.role === "ADMIN";
  const staleThreshold = new Date();
  staleThreshold.setDate(staleThreshold.getDate() - FICHE_FRAICHEUR_SEUIL_JOURS);

  const bmFilter = isAdmin ? {} : { businessManagerId: session.user.id };

  const [total, publiees, brouillons, aRafraichir, demandesNouvelles, aPurger] =
    await Promise.all([
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
          ...(isAdmin ? {} : { consultant: { businessManagerId: session.user.id } }),
        },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { consultant: true, clientUser: true },
      }),
      isAdmin
        ? prisma.consultant.count({
            where: {
              dateConservationLimite: { lt: new Date() },
            },
          })
        : Promise.resolve(0),
    ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-brand-ink">Tableau de bord</h1>
        <p className="text-sm text-brand-gray">
          Bienvenue {session.user.name}. Rituel hebdomadaire : vérifiez les
          fiches à actualiser et traitez les nouvelles demandes.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Dossiers suivis" value={total} />
        <StatCard label="Fiches publiées" value={publiees} />
        <StatCard label="Brouillons" value={brouillons} />
        <StatCard
          label="Demandes non traitées"
          value={demandesNouvelles.length}
          highlight={demandesNouvelles.length > 0}
        />
      </div>

      {isAdmin && aPurger > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {aPurger} dossier(s) ont dépassé leur durée de conservation RGPD et
          doivent être revus.{" "}
          <Link href="/admin/consultants?purge=1" className="underline font-medium">
            Voir les dossiers
          </Link>
        </div>
      )}

      <section>
        <h2 className="text-sm font-semibold text-brand-ink mb-3">
          Fiches publiées à actualiser (non modifiées depuis plus de{" "}
          {FICHE_FRAICHEUR_SEUIL_JOURS} jours)
        </h2>
        {aRafraichir.length === 0 ? (
          <p className="text-sm text-brand-gray">
            Aucune fiche signalée. Bien joué.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
            {aRafraichir.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="text-sm">
                  <span className="font-medium text-brand-ink">
                    {c.referenceAnonyme}
                  </span>{" "}
                  <span className="text-brand-gray">— {c.intitulePoste}</span>
                </div>
                <Link
                  href={`/admin/consultants/${c.id}`}
                  className="text-sm text-brand-body underline hover:text-brand-ink"
                >
                  Actualiser
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-brand-ink mb-3">
          Dernières demandes de contact non traitées
        </h2>
        {demandesNouvelles.length === 0 ? (
          <p className="text-sm text-brand-gray">Aucune demande en attente.</p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
            {demandesNouvelles.map((d) => (
              <li key={d.id} className="px-4 py-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="font-medium text-brand-ink">
                      {d.consultant.referenceAnonyme}
                    </span>{" "}
                    <span className="text-brand-gray">
                      — demandé par {d.clientUser.name}
                    </span>
                  </div>
                  <Link
                    href="/admin/demandes"
                    className="text-sm text-brand-body underline hover:text-brand-ink"
                  >
                    Traiter
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        highlight
          ? "border-amber-300 bg-amber-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="text-2xl font-semibold text-brand-ink">{value}</div>
      <div className="text-xs text-brand-gray mt-1">{label}</div>
    </div>
  );
}
