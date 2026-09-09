import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { canAccessEntreprise } from "@/lib/crm-access";
import {
  DUREE_ESTIMEE_OPTIONS,
  STATUT_BESOIN,
  STATUT_BESOIN_LABELS,
  STATUT_BESOIN_CANDIDAT,
  STATUT_BESOIN_CANDIDAT_LABELS,
  STATUT_OFFRE_LABELS,
  type StatutBesoin,
  type StatutBesoinCandidat,
  type StatutOffre,
} from "@/lib/constants";
import {
  updateBesoinAction,
  marquerBesoinPerduAction,
  reouvrirBesoinAction,
  addBesoinCandidatAction,
  updateBesoinCandidatStatutAction,
  removeBesoinCandidatAction,
  marquerBesoinGagneAction,
} from "../actions";
import NatureContratFields from "@/components/NatureContratFields";
import { computeMatchScore } from "@/lib/matching";

export const dynamic = "force-dynamic";

const CANDIDAT_STATUT_STYLES: Record<string, string> = {
  PROPOSE: "bg-slate-100 text-brand-body",
  RDV_QUALIFICATION: "bg-brand-blue/15 text-brand-blue-dark",
  RETENU: "bg-brand-green/10 text-brand-green",
  ECARTE: "bg-red-50 text-red-600",
};

export default async function BesoinDetailPage({
  params,
}: {
  params: Promise<{ id: string; besoinId: string }>;
}) {
  const session = await requireStaff();
  const { id, besoinId } = await params;

  const besoin = await prisma.besoin.findUnique({
    where: { id: besoinId },
    include: {
      entreprise: {
        include: {
          secteursRecherches: { select: { secteurId: true } },
          expertisesRecherchees: { select: { expertiseId: true } },
        },
      },
      contact: true,
      candidats: {
        include: { consultant: true, createdBy: true },
        orderBy: { createdAt: "asc" },
      },
      missions: true,
      offres: { orderBy: { createdAt: "desc" }, include: { candidatures: { select: { id: true } } } },
    },
  });

  if (!besoin || besoin.entrepriseId !== id) notFound();
  if (!canAccessEntreprise(session.user, besoin.entreprise)) redirect("/admin/crm");

  const [contacts, candidatsDisponibles] = await Promise.all([
    prisma.contact.findMany({ where: { entrepriseId: id }, orderBy: { nom: "asc" } }),
    prisma.consultant.findMany({
      where: { id: { notIn: besoin.candidats.map((c) => c.consultantId) } },
      orderBy: { nom: "asc" },
      select: {
        id: true,
        nom: true,
        prenom: true,
        referenceAnonyme: true,
        villeLat: true,
        villeLng: true,
        rayonKm: true,
        disponibilite: true,
        secteurs: { select: { secteurId: true } },
        expertises: { select: { expertiseId: true } },
      },
    }),
  ]);

  const candidatsEligiblesGain = besoin.candidats.filter(
    (c) => c.statut !== STATUT_BESOIN_CANDIDAT.ECARTE
  );

  // Suggestions vivier <-> besoin : on matche sur les secteurs/expertises
  // recherchés par l'entreprise cliente (le besoin lui-même n'a pas de
  // référentiel structuré, seulement du texte libre) — sur tout le vivier,
  // pas seulement les fiches publiées (c'est un outil interne de CVthèque).
  const entrepriseSecteurIds = besoin.entreprise.secteursRecherches.map((s) => s.secteurId);
  const entrepriseExpertiseIds = besoin.entreprise.expertisesRecherchees.map((x) => x.expertiseId);

  const candidatsCorrespondants = candidatsDisponibles
    .map((c) => ({
      id: c.id,
      nom: c.nom,
      prenom: c.prenom,
      referenceAnonyme: c.referenceAnonyme,
      match: computeMatchScore({
        candidatSecteurIds: c.secteurs.map((s) => s.secteurId),
        candidatExpertiseIds: c.expertises.map((e) => e.expertiseId),
        candidatVilleLat: c.villeLat,
        candidatVilleLng: c.villeLng,
        candidatRayonKm: c.rayonKm,
        candidatDisponibilite: c.disponibilite,
        entrepriseSecteurIds,
        entrepriseExpertiseIds,
        entrepriseVille: besoin.entreprise.ville,
      }),
    }))
    .filter((c) => c.match.score > 0)
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-brand-ink">{besoin.intitulePoste}</h1>
          <p className="mt-1 text-sm text-brand-gray">
            <Link href={`/admin/crm/${id}`} className="link-underline text-brand-blue-dark">
              {besoin.entreprise.nom}
            </Link>
            {besoin.contact && ` — ${besoin.contact.prenom} ${besoin.contact.nom}`}
            {" · "}
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                besoin.statut === "GAGNE"
                  ? "bg-brand-green/10 text-brand-green"
                  : besoin.statut === "PERDU"
                    ? "bg-red-50 text-red-600"
                    : "bg-brand-blue/10 text-brand-blue-dark"
              }`}
            >
              {STATUT_BESOIN_LABELS[besoin.statut as StatutBesoin] ?? besoin.statut}
            </span>
          </p>
        </div>
        <Link
          href={`/admin/crm/${id}`}
          className="link-underline text-sm text-brand-gray hover:text-brand-ink"
        >
          ← Retour à {besoin.entreprise.nom}
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <form action={updateBesoinAction} className="card space-y-3 p-5">
            <input type="hidden" name="id" value={besoin.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-brand-body">
                  Intitulé du poste
                </label>
                <input
                  name="intitulePoste"
                  required
                  defaultValue={besoin.intitulePoste}
                  className="input mt-1.5"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-body">Interlocuteur</label>
                <select
                  name="contactId"
                  defaultValue={besoin.contactId ?? ""}
                  className="input mt-1.5"
                >
                  <option value="">—</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.prenom} {c.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-body">Séniorité</label>
                <input
                  name="seniorite"
                  defaultValue={besoin.seniorite ?? ""}
                  placeholder="Ex. Confirmé, Senior…"
                  className="input mt-1.5"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-body">Localisation</label>
                <input
                  name="localisation"
                  defaultValue={besoin.localisation ?? ""}
                  className="input mt-1.5"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-body">TJM min (€/j)</label>
                <input
                  type="number"
                  name="tjmCibleMin"
                  min={0}
                  defaultValue={besoin.tjmCibleMin ?? ""}
                  className="input mt-1.5"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-body">TJM max (€/j)</label>
                <input
                  type="number"
                  name="tjmCibleMax"
                  min={0}
                  defaultValue={besoin.tjmCibleMax ?? ""}
                  className="input mt-1.5"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-body">
                  Démarrage souhaité
                </label>
                <input
                  type="date"
                  name="dateDemarrageSouhaitee"
                  defaultValue={
                    besoin.dateDemarrageSouhaitee
                      ? besoin.dateDemarrageSouhaitee.toISOString().slice(0, 10)
                      : ""
                  }
                  className="input mt-1.5"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-body">Durée estimée</label>
                <select
                  name="dureeEstimee"
                  defaultValue={besoin.dureeEstimee ?? ""}
                  className="input mt-1.5"
                >
                  <option value="">—</option>
                  {DUREE_ESTIMEE_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-brand-body">
                Missions (détail)
              </label>
              <textarea
                name="descriptifMissions"
                rows={4}
                defaultValue={besoin.descriptifMissions ?? ""}
                className="input mt-1.5"
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Enregistrer
            </button>
          </form>

          <div className="card space-y-4 p-5">
            <h2 className="text-sm font-semibold text-brand-ink">
              Candidats associés{" "}
              <span className="font-normal text-brand-gray">
                — proposez des profils du vivier ATS, qualifiez-les, puis retenez le bon
              </span>
            </h2>

            {besoin.candidats.length === 0 ? (
              <p className="text-xs text-brand-gray">Aucun candidat associé pour l&apos;instant.</p>
            ) : (
              <ul className="-mx-2 divide-y divide-slate-100">
                {besoin.candidats.map((bc) => (
                  <li key={bc.id} className="flex flex-wrap items-center justify-between gap-2 px-2 py-2.5">
                    <div className="text-sm">
                      <Link
                        href={`/admin/consultants/${bc.consultantId}`}
                        className="font-medium text-brand-ink hover:text-brand-blue-dark"
                      >
                        {bc.consultant.prenom} {bc.consultant.nom}
                      </Link>{" "}
                      <span className="text-xs text-brand-gray">{bc.consultant.referenceAnonyme}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <form action={updateBesoinCandidatStatutAction} className="flex items-center gap-1">
                        <input type="hidden" name="id" value={bc.id} />
                        <select
                          name="statut"
                          defaultValue={bc.statut}
                          className={`rounded-full border-0 px-2 py-0.5 text-[10px] font-medium ${
                            CANDIDAT_STATUT_STYLES[bc.statut] ?? "bg-slate-100 text-brand-body"
                          }`}
                        >
                          {Object.values(STATUT_BESOIN_CANDIDAT).map((s) => (
                            <option key={s} value={s}>
                              {STATUT_BESOIN_CANDIDAT_LABELS[s as StatutBesoinCandidat]}
                            </option>
                          ))}
                        </select>
                        <button type="submit" className="link-underline text-xs text-brand-blue-dark">
                          OK
                        </button>
                      </form>
                      <form action={removeBesoinCandidatAction}>
                        <input type="hidden" name="id" value={bc.id} />
                        <button type="submit" className="link-underline text-xs text-red-600">
                          Retirer
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {besoin.statut === STATUT_BESOIN.OUVERT && (
              <form
                action={addBesoinCandidatAction}
                className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-brand-blue-light/60 bg-brand-blue-bg-soft/40 p-3"
              >
                <input type="hidden" name="besoinId" value={besoin.id} />
                <div className="flex-1">
                  <label className="block text-[11px] text-brand-gray">
                    Associer un candidat du vivier
                  </label>
                  <select name="consultantId" required defaultValue="" className="input text-xs">
                    <option value="" disabled>
                      — Choisir —
                    </option>
                    {candidatsDisponibles.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.prenom} {c.nom} ({c.referenceAnonyme})
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn btn-secondary py-1.5 text-xs">
                  + Associer
                </button>
              </form>
            )}
          </div>

          <div className="card space-y-4 p-5">
            <h2 className="text-sm font-semibold text-brand-ink">
              Candidats du vivier correspondants{" "}
              <span className="font-normal text-brand-gray">
                — basé sur les secteurs/expertises recherchés par {besoin.entreprise.nom}
              </span>
            </h2>

            {candidatsCorrespondants.length === 0 ? (
              <p className="text-xs text-brand-gray">
                Aucune correspondance trouvée dans le vivier pour l&apos;instant.
              </p>
            ) : (
              <ul className="-mx-2 divide-y divide-slate-100">
                {candidatsCorrespondants.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-2 py-2.5"
                  >
                    <div className="text-sm">
                      <Link
                        href={`/admin/consultants/${c.id}`}
                        className="font-medium text-brand-ink hover:text-brand-blue-dark"
                      >
                        {c.prenom} {c.nom}
                      </Link>{" "}
                      <span className="text-xs text-brand-gray">{c.referenceAnonyme}</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {c.match.secteursCommuns > 0 && (
                          <span className="rounded-full bg-brand-blue/10 px-1.5 py-0.5 text-[10px] font-medium text-brand-blue-dark">
                            {c.match.secteursCommuns} secteur(s) commun(s)
                          </span>
                        )}
                        {c.match.expertisesCommunes > 0 && (
                          <span className="rounded-full bg-brand-blue/10 px-1.5 py-0.5 text-[10px] font-medium text-brand-blue-dark">
                            {c.match.expertisesCommunes} expertise(s) commune(s)
                          </span>
                        )}
                        {c.match.proximite && (
                          <span className="rounded-full bg-brand-green/10 px-1.5 py-0.5 text-[10px] font-medium text-brand-green">
                            À proximité
                          </span>
                        )}
                        {c.match.disponibleImmediat && (
                          <span className="rounded-full bg-brand-green/10 px-1.5 py-0.5 text-[10px] font-medium text-brand-green">
                            Disponible immédiatement
                          </span>
                        )}
                      </div>
                    </div>
                    {besoin.statut === STATUT_BESOIN.OUVERT && (
                      <form action={addBesoinCandidatAction}>
                        <input type="hidden" name="besoinId" value={besoin.id} />
                        <input type="hidden" name="consultantId" value={c.id} />
                        <button type="submit" className="btn btn-secondary py-1 text-xs">
                          + Associer
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card space-y-3 p-5">
            <h2 className="text-sm font-semibold text-brand-ink">Offres liées</h2>
            {besoin.offres.length === 0 ? (
              <p className="text-xs text-brand-gray">Aucune offre publiée pour ce besoin.</p>
            ) : (
              <ul className="-mx-2 divide-y divide-slate-100">
                {besoin.offres.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-2 px-2 py-2">
                    <Link
                      href={`/admin/offres/${o.id}`}
                      className="text-sm font-medium text-brand-ink hover:text-brand-blue-dark"
                    >
                      {o.titre}
                    </Link>
                    <span className="text-[10px] text-brand-gray">
                      {STATUT_OFFRE_LABELS[o.statut as StatutOffre] ?? o.statut} ·{" "}
                      {o.candidatures.length} candidature(s)
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href={`/admin/offres/nouvelle?besoinId=${besoin.id}`}
              className="btn btn-secondary block w-full py-2 text-center text-xs"
            >
              + Créer une offre à partir de ce besoin
            </Link>
          </div>

          {besoin.statut === STATUT_BESOIN.OUVERT && (
            <div className="card space-y-3 p-5">
              <h2 className="text-sm font-semibold text-brand-ink">Gagner ce besoin</h2>
              {candidatsEligiblesGain.length === 0 ? (
                <p className="text-xs text-brand-gray">
                  Associez au moins un candidat avant de pouvoir gagner ce besoin.
                </p>
              ) : (
                <form action={marquerBesoinGagneAction} className="space-y-2">
                  <input type="hidden" name="besoinId" value={besoin.id} />
                  <div>
                    <label className="block text-[11px] text-brand-gray">Candidat retenu</label>
                    <select
                      name="besoinCandidatId"
                      required
                      defaultValue=""
                      className="input text-xs"
                    >
                      <option value="" disabled>
                        — Choisir —
                      </option>
                      {candidatsEligiblesGain.map((bc) => (
                        <option key={bc.id} value={bc.id}>
                          {bc.consultant.prenom} {bc.consultant.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-brand-gray">TJM réel (€/j)</label>
                    <input type="number" name="tjm" min={0} className="input text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-brand-gray">Date de début</label>
                    <input type="date" name="dateDebut" required className="input text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-brand-gray">Fin prévue</label>
                    <input type="date" name="dateFinPrevue" className="input text-xs" />
                  </div>

                  <div className="space-y-2 rounded-lg border border-dashed border-brand-blue-light/60 bg-brand-blue-bg-soft/40 p-2.5">
                    <p className="text-[11px] font-medium text-brand-ink">Coût / marge</p>
                    <p className="text-[10px] text-brand-gray">
                      Obligatoire — nécessaire pour calculer la marge de ce consultant dès la
                      création de la mission (CA &amp; Marge de votre centre de profit).
                    </p>
                    <NatureContratFields required compact />
                  </div>

                  <button
                    type="submit"
                    className="btn w-full bg-brand-green py-2 text-white hover:brightness-110"
                  >
                    Marquer gagné — créer la mission
                  </button>
                </form>
              )}
              <form action={marquerBesoinPerduAction}>
                <input type="hidden" name="id" value={besoin.id} />
                <button
                  type="submit"
                  className="btn w-full border border-red-200 bg-red-50 py-2 text-red-700 hover:bg-red-100"
                >
                  Marquer perdu
                </button>
              </form>
            </div>
          )}

          {besoin.statut !== STATUT_BESOIN.OUVERT && (
            <div className="card space-y-3 p-5">
              {besoin.missions.length > 0 && (
                <div className="text-sm">
                  <p className="font-medium text-brand-ink">Mission créée</p>
                  <Link href="/admin/missions" className="link-underline text-brand-blue-dark">
                    Voir le portefeuille de missions
                  </Link>
                </div>
              )}
              <form action={reouvrirBesoinAction}>
                <input type="hidden" name="id" value={besoin.id} />
                <button type="submit" className="btn btn-secondary w-full py-2">
                  Réouvrir ce besoin
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
