import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { canAccessOffre } from "@/lib/offre-access";
import {
  STATUT_OFFRE,
  STATUT_OFFRE_LABELS,
  STATUT_CANDIDATURE,
  STATUT_CANDIDATURE_LABELS,
  TYPE_CONTRAT_OFFRE_LABELS,
  type StatutOffre,
  type StatutCandidature,
} from "@/lib/constants";
import {
  updateOffreAction,
  publierOffreAction,
  depublierOffreAction,
  marquerPourvueOffreAction,
  archiverOffreAction,
  ajouterCandidatureAuVivierAction,
  rejeterCandidatureAction,
} from "../actions";

export const dynamic = "force-dynamic";

const STATUT_OFFRE_STYLES: Record<string, string> = {
  BROUILLON: "bg-slate-100 text-brand-gray",
  PUBLIEE: "bg-brand-green/10 text-brand-green",
  POURVUE: "bg-brand-blue/10 text-brand-blue-dark",
  DEPUBLIEE: "bg-amber-100 text-amber-700",
  ARCHIVEE: "bg-slate-100 text-brand-gray",
};

const CANDIDATURE_STATUT_STYLES: Record<string, string> = {
  NOUVELLE: "bg-brand-blue/15 text-brand-blue-dark",
  EN_COURS: "bg-amber-100 text-amber-700",
  AJOUTEE_VIVIER: "bg-brand-green/10 text-brand-green",
  REJETEE: "bg-red-50 text-red-600",
};

export default async function OffreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireStaff();
  const { id } = await params;

  const offre = await prisma.offre.findUnique({
    where: { id },
    include: {
      entreprise: true,
      besoin: true,
      candidatures: { orderBy: { createdAt: "desc" }, include: { consultant: true } },
    },
  });
  if (!offre) notFound();
  if (!canAccessOffre(session.user, offre)) redirect("/admin/offres");

  const publicUrl = `/offres/${offre.reference}`;
  const candidaturesEnAttente = offre.candidatures.filter(
    (c) => c.statut === STATUT_CANDIDATURE.NOUVELLE || c.statut === STATUT_CANDIDATURE.EN_COURS
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-brand-ink">{offre.titre}</h1>
          <p className="mt-1 text-sm text-brand-gray">
            <span className="font-mono text-xs">{offre.reference}</span>
            {offre.entreprise && <> — {offre.entreprise.nom}</>}
            {" · "}
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                STATUT_OFFRE_STYLES[offre.statut] ?? "bg-slate-100 text-brand-gray"
              }`}
            >
              {STATUT_OFFRE_LABELS[offre.statut as StatutOffre] ?? offre.statut}
            </span>
          </p>
        </div>
        <Link href="/admin/offres" className="link-underline text-sm text-brand-gray hover:text-brand-ink">
          ← Toutes les offres
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <form action={updateOffreAction} className="card space-y-3 p-5">
            <input type="hidden" name="id" value={offre.id} />
            <div>
              <label className="block text-xs font-medium text-brand-body">Titre de l&apos;offre</label>
              <input name="titre" required defaultValue={offre.titre} className="input mt-1.5" />
            </div>
            <div>
              <label className="block text-xs font-medium text-brand-body">Descriptif du poste</label>
              <textarea
                name="descriptif"
                rows={5}
                defaultValue={offre.descriptif ?? ""}
                className="input mt-1.5"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-brand-body">Profil recherché</label>
              <textarea
                name="profilRecherche"
                rows={3}
                defaultValue={offre.profilRecherche ?? ""}
                className="input mt-1.5"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-brand-body">Type de contrat</label>
                <select
                  name="typeContratOffre"
                  defaultValue={offre.typeContratOffre ?? ""}
                  className="input mt-1.5"
                >
                  <option value="">—</option>
                  {Object.entries(TYPE_CONTRAT_OFFRE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-body">Localisation</label>
                <input
                  name="localisation"
                  defaultValue={offre.localisation ?? ""}
                  className="input mt-1.5"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-body">TJM min (€/j)</label>
                <input
                  type="number"
                  name="tjmMin"
                  min={0}
                  defaultValue={offre.tjmMin ?? ""}
                  className="input mt-1.5"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-body">TJM max (€/j)</label>
                <input
                  type="number"
                  name="tjmMax"
                  min={0}
                  defaultValue={offre.tjmMax ?? ""}
                  className="input mt-1.5"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-body">Salaire min (€/an)</label>
                <input
                  type="number"
                  name="salaireMin"
                  min={0}
                  defaultValue={offre.salaireMin ?? ""}
                  className="input mt-1.5"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-body">Salaire max (€/an)</label>
                <input
                  type="number"
                  name="salaireMax"
                  min={0}
                  defaultValue={offre.salaireMax ?? ""}
                  className="input mt-1.5"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-body">Démarrage souhaité</label>
                <input
                  type="date"
                  name="dateDemarrage"
                  defaultValue={offre.dateDemarrage ? offre.dateDemarrage.toISOString().slice(0, 10) : ""}
                  className="input mt-1.5"
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary">
              Enregistrer
            </button>
          </form>

          <div className="card space-y-4 p-5">
            <h2 className="text-sm font-semibold text-brand-ink">
              Candidatures reçues{" "}
              <span className="font-normal text-brand-gray">({offre.candidatures.length})</span>
            </h2>
            {offre.candidatures.length === 0 ? (
              <p className="text-xs text-brand-gray">Aucune candidature pour l&apos;instant.</p>
            ) : (
              <ul className="-mx-2 divide-y divide-slate-100">
                {offre.candidatures.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-2 py-3">
                    <div className="text-sm">
                      <span className="font-medium text-brand-ink">
                        {c.prenom} {c.nom}
                      </span>{" "}
                      <span className="text-xs text-brand-gray">
                        {c.email}
                        {c.telephone && ` · ${c.telephone}`}
                      </span>
                      {c.cvFileUrl && (
                        <>
                          {" · "}
                          <Link
                            href={`/admin/offres/candidatures/${c.id}/cv`}
                            className="link-underline text-xs text-brand-blue-dark"
                          >
                            CV
                          </Link>
                        </>
                      )}
                      {c.consultant && (
                        <>
                          {" · "}
                          <Link
                            href={`/admin/consultants/${c.consultant.id}`}
                            className="link-underline text-xs text-brand-blue-dark"
                          >
                            Dossier ATS
                          </Link>
                        </>
                      )}
                      {c.message && <p className="mt-1 text-xs text-brand-gray">{c.message}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          CANDIDATURE_STATUT_STYLES[c.statut] ?? "bg-slate-100 text-brand-gray"
                        }`}
                      >
                        {STATUT_CANDIDATURE_LABELS[c.statut as StatutCandidature] ?? c.statut}
                      </span>
                      {(c.statut === STATUT_CANDIDATURE.NOUVELLE ||
                        c.statut === STATUT_CANDIDATURE.EN_COURS) && (
                        <>
                          <form action={ajouterCandidatureAuVivierAction}>
                            <input type="hidden" name="id" value={c.id} />
                            <button type="submit" className="link-underline text-xs text-brand-green">
                              Ajouter au vivier
                            </button>
                          </form>
                          <form action={rejeterCandidatureAction}>
                            <input type="hidden" name="id" value={c.id} />
                            <button type="submit" className="link-underline text-xs text-red-600">
                              Rejeter
                            </button>
                          </form>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card space-y-3 p-5">
            <h2 className="text-sm font-semibold text-brand-ink">Statut</h2>

            {offre.statut === STATUT_OFFRE.BROUILLON && (
              <form action={publierOffreAction}>
                <input type="hidden" name="id" value={offre.id} />
                <button
                  type="submit"
                  className="btn w-full bg-brand-green py-2 text-white hover:brightness-110"
                >
                  Publier
                </button>
              </form>
            )}

            {offre.statut === STATUT_OFFRE.PUBLIEE && (
              <div className="space-y-2">
                <p className="text-xs text-brand-gray">
                  Publique depuis le {offre.datePublication?.toLocaleDateString("fr-FR")}.
                </p>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="link-underline block text-xs text-brand-blue-dark"
                >
                  Voir la page publique ↗
                </a>
                <form action={marquerPourvueOffreAction}>
                  <input type="hidden" name="id" value={offre.id} />
                  <button type="submit" className="btn btn-secondary w-full py-2">
                    Marquer pourvue
                  </button>
                </form>
                <form action={depublierOffreAction}>
                  <input type="hidden" name="id" value={offre.id} />
                  <button
                    type="submit"
                    className="btn w-full border border-amber-200 bg-amber-50 py-2 text-amber-700 hover:bg-amber-100"
                  >
                    Dépublier
                  </button>
                </form>
              </div>
            )}

            {(offre.statut === STATUT_OFFRE.POURVUE || offre.statut === STATUT_OFFRE.DEPUBLIEE) && (
              <div className="space-y-2">
                <form action={publierOffreAction}>
                  <input type="hidden" name="id" value={offre.id} />
                  <button
                    type="submit"
                    className="btn w-full bg-brand-green py-2 text-white hover:brightness-110"
                  >
                    Republier
                  </button>
                </form>
                <form action={archiverOffreAction}>
                  <input type="hidden" name="id" value={offre.id} />
                  <button
                    type="submit"
                    className="btn w-full border border-red-200 bg-red-50 py-2 text-red-700 hover:bg-red-100"
                  >
                    Archiver
                  </button>
                </form>
              </div>
            )}

            {offre.statut === STATUT_OFFRE.ARCHIVEE && (
              <p className="text-xs text-brand-gray">Offre archivée.</p>
            )}

            {candidaturesEnAttente.length > 0 && (
              <p className="border-t border-slate-100 pt-2 text-xs text-brand-gray">
                {candidaturesEnAttente.length} candidature(s) en attente de traitement.
              </p>
            )}
          </div>

          {offre.besoin && (
            <div className="card space-y-2 p-5 text-sm">
              <p className="font-medium text-brand-ink">Besoin d&apos;origine</p>
              <Link
                href={`/admin/crm/${offre.entrepriseId}/besoins/${offre.besoinId}`}
                className="link-underline text-brand-blue-dark"
              >
                {offre.besoin.intitulePoste}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
