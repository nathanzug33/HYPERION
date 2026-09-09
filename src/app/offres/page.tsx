import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { STATUT_OFFRE, TYPE_CONTRAT_OFFRE_LABELS, type TypeContratOffre } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function OffresPubliquesPage() {
  const offres = await prisma.offre.findMany({
    where: { statut: STATUT_OFFRE.PUBLIEE },
    orderBy: { datePublication: "desc" },
  });

  return (
    <div className="min-h-screen bg-white">
      <div className="topbar-gradient relative overflow-hidden px-4 py-14 text-white">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-brand-green-light/25 blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto max-w-4xl">
          <span className="text-sm font-bold tracking-wide">KERVIO</span>
          <div className="text-[11px] text-brand-green-light">by Hyperion Group</div>
          <h1 className="mt-4 text-2xl font-semibold sm:text-3xl">Nos offres</h1>
          <p className="mt-2 max-w-xl text-sm text-white/70">
            Missions et postes actuellement ouverts. Postulez directement en ligne.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-10">
        {offres.length === 0 ? (
          <p className="text-sm text-brand-gray">Aucune offre ouverte pour le moment.</p>
        ) : (
          <div className="space-y-3">
            {offres.map((o) => (
              <Link key={o.id} href={`/offres/${o.reference}`} className="card card-hover block p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold text-brand-ink">{o.titre}</h2>
                    <p className="mt-1 text-sm text-brand-gray">
                      {[
                        o.localisation,
                        o.typeContratOffre
                          ? TYPE_CONTRAT_OFFRE_LABELS[o.typeContratOffre as TypeContratOffre]
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </div>
                  <span className="link-underline whitespace-nowrap text-sm text-brand-blue-dark">
                    Voir l&apos;offre →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
