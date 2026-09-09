import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { STATUT_OFFRE, TYPE_CONTRAT_OFFRE_LABELS, type TypeContratOffre } from "@/lib/constants";
import { postulerAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function OffreDetailPubliquePage({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ candidature?: string }>;
}) {
  const { reference } = await params;
  const { candidature } = await searchParams;

  const offre = await prisma.offre.findUnique({ where: { reference } });
  if (!offre || offre.statut !== STATUT_OFFRE.PUBLIEE) notFound();

  const envoyee = candidature === "envoyee";

  return (
    <div className="min-h-screen bg-white">
      <div className="topbar-gradient px-4 py-10 text-white">
        <div className="mx-auto max-w-4xl">
          <Link href="/offres" className="text-xs text-white/70 hover:text-white">
            ← Toutes les offres
          </Link>
          <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">{offre.titre}</h1>
          <p className="mt-2 text-sm text-white/70">
            {[
              offre.localisation,
              offre.typeContratOffre
                ? TYPE_CONTRAT_OFFRE_LABELS[offre.typeContratOffre as TypeContratOffre]
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-4xl gap-8 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          {offre.descriptif && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-blue-dark">
                Le poste
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm text-brand-body">{offre.descriptif}</p>
            </div>
          )}
          {offre.profilRecherche && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-blue-dark">
                Profil recherché
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm text-brand-body">
                {offre.profilRecherche}
              </p>
            </div>
          )}
          {(offre.tjmMin || offre.tjmMax || offre.salaireMin || offre.salaireMax || offre.dateDemarrage) && (
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              {(offre.tjmMin || offre.tjmMax) && (
                <div>
                  <dt className="text-xs text-brand-gray">TJM</dt>
                  <dd className="text-brand-ink">
                    {[offre.tjmMin, offre.tjmMax].filter(Boolean).join(" – ")} €/j
                  </dd>
                </div>
              )}
              {(offre.salaireMin || offre.salaireMax) && (
                <div>
                  <dt className="text-xs text-brand-gray">Salaire</dt>
                  <dd className="text-brand-ink">
                    {[offre.salaireMin, offre.salaireMax].filter(Boolean).join(" – ")} €/an
                  </dd>
                </div>
              )}
              {offre.dateDemarrage && (
                <div>
                  <dt className="text-xs text-brand-gray">Démarrage</dt>
                  <dd className="text-brand-ink">
                    {offre.dateDemarrage.toLocaleDateString("fr-FR")}
                  </dd>
                </div>
              )}
            </dl>
          )}
        </div>

        <div className="card space-y-4 p-5">
          {envoyee ? (
            <div className="space-y-2 text-sm">
              <p className="font-medium text-brand-green">Candidature envoyée !</p>
              <p className="text-brand-gray">Merci, nous revenons vers vous rapidement.</p>
            </div>
          ) : (
            <>
              <h2 className="text-sm font-semibold text-brand-ink">Postuler</h2>
              <form action={postulerAction} className="space-y-3">
                <input type="hidden" name="offreId" value={offre.id} />
                <input type="hidden" name="reference" value={offre.reference} />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-brand-body">Prénom</label>
                    <input name="prenom" required className="input mt-1" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-brand-body">Nom</label>
                    <input name="nom" required className="input mt-1" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-brand-body">Email</label>
                  <input type="email" name="email" required className="input mt-1" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-brand-body">Téléphone</label>
                  <input name="telephone" className="input mt-1" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-brand-body">
                    Message (optionnel)
                  </label>
                  <textarea name="message" rows={3} className="input mt-1" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-brand-body">CV (PDF, Word)</label>
                  <input
                    type="file"
                    name="cvFile"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="mt-1 block w-full text-xs text-brand-gray file:mr-3 file:rounded-md file:border-0 file:bg-brand-blue file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
                  />
                </div>
                <label className="flex items-start gap-2 text-xs text-brand-gray">
                  <input type="checkbox" name="consentementRgpd" required className="mt-0.5" />
                  <span>
                    J&apos;accepte que mes données soient utilisées dans le cadre de ce recrutement
                    et conservées dans la CVthèque du cabinet, conformément à la{" "}
                    <Link href="/legal/confidentialite" className="underline">
                      politique de confidentialité
                    </Link>
                    .
                  </span>
                </label>
                <button type="submit" className="btn btn-primary w-full">
                  Envoyer ma candidature
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
