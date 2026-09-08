import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { ROLES } from "@/lib/constants";
import { consultantPublicSelect } from "@/lib/consultant-view";
import ConsultantDetail from "@/components/consultant/ConsultantDetail";
import ConsultantEditForm from "./consultant-edit-form";
import {
  archiveConsultantAction,
  publishConsultantAction,
  purgeConsultantAction,
  transferConsultantAction,
  unpublishConsultantAction,
} from "../actions";
import { STATUT_PUBLICATION_LABELS, canReassignReferent } from "@/lib/constants";
import { canAccessConsultant } from "@/lib/consultant-access";
import { entrepriseVisibilityWhere } from "@/lib/crm-access";
import { computeMatchScore } from "@/lib/matching";
import MatchBadges from "@/components/MatchBadges";
import SuiviSection from "./suivi-section";
import PushCandidatForm from "./push-candidat-form";

export const dynamic = "force-dynamic";

export default async function ConsultantEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ia?: string; doublons?: string; propose?: string }>;
}) {
  const session = await requireStaff();
  const { id } = await params;
  const { error, ia, doublons, propose } = await searchParams;

  const doublonsCandidats = doublons
    ? await prisma.consultant.findMany({
        where: { id: { in: doublons.split(",") } },
        select: { id: true, referenceAnonyme: true, nom: true, prenom: true },
      })
    : [];

  const consultant = await prisma.consultant.findUnique({
    where: { id },
    include: {
      secteurs: true,
      expertises: true,
      competences: true,
      typesMobilite: true,
      zonesGeographiques: true,
      langues: true,
      businessManager: true,
      competenceCategories: { orderBy: { ordre: "asc" } },
      formations: { orderBy: { ordre: "asc" } },
      experiences: { orderBy: { ordre: "asc" } },
    },
  });

  if (!consultant) notFound();
  if (!(await canAccessConsultant(session.user, consultant))) {
    redirect("/admin/consultants");
  }

  const [
    secteurs,
    expertises,
    seniorites,
    typesMobilite,
    zones,
    competences,
    langues,
    bms,
    publicView,
  ] = await Promise.all([
    prisma.secteur.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
    prisma.expertise.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
    prisma.seniorite.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
    prisma.typeMobilite.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
    prisma.zoneGeographique.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
    prisma.competence.findMany({ where: { active: true }, orderBy: { label: "asc" } }),
    prisma.langue.findMany({ where: { active: true }, orderBy: { label: "asc" } }),
    canReassignReferent(session.user)
      ? prisma.user.findMany({ where: { role: ROLES.BM, active: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
    prisma.consultant.findUnique({ where: { id }, select: consultantPublicSelect }),
  ]);

  const suivis = await prisma.suiviCandidat.findMany({
    where: { consultantId: id },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });

  const [entreprisesPourPush, propositions] = await Promise.all([
    prisma.entreprise.findMany({
      where: entrepriseVisibilityWhere(session.user),
      select: {
        id: true,
        nom: true,
        contacts: { select: { id: true, prenom: true, nom: true, email: true } },
      },
      orderBy: { nom: "asc" },
    }),
    prisma.suiviCommercial.findMany({
      where: { consultantId: id },
      orderBy: { createdAt: "desc" },
      include: {
        entreprise: { select: { id: true, nom: true } },
        contact: { select: { id: true, prenom: true, nom: true } },
      },
    }),
  ]);

  const consultantSecteurIds = consultant.secteurs.map((s) => s.secteurId);
  const consultantExpertiseIds = consultant.expertises.map((e) => e.expertiseId);

  const entreprisesInteressees =
    consultantSecteurIds.length > 0 || consultantExpertiseIds.length > 0
      ? await prisma.entreprise.findMany({
          where: {
            ...entrepriseVisibilityWhere(session.user),
            OR: [
              consultantSecteurIds.length > 0
                ? { secteursRecherches: { some: { secteurId: { in: consultantSecteurIds } } } }
                : undefined,
              consultantExpertiseIds.length > 0
                ? { expertisesRecherchees: { some: { expertiseId: { in: consultantExpertiseIds } } } }
                : undefined,
            ].filter((c): c is NonNullable<typeof c> => Boolean(c)),
          },
          select: {
            id: true,
            nom: true,
            ville: true,
            secteursRecherches: { select: { secteurId: true } },
            expertisesRecherchees: { select: { expertiseId: true } },
          },
        })
      : [];

  const suggestionsClientsAvecScore = entreprisesInteressees
    .map((e) => ({
      id: e.id,
      nom: e.nom,
      match: computeMatchScore({
        candidatSecteurIds: consultantSecteurIds,
        candidatExpertiseIds: consultantExpertiseIds,
        candidatVilleLat: consultant.villeLat,
        candidatVilleLng: consultant.villeLng,
        candidatRayonKm: consultant.rayonKm,
        candidatDisponibilite: consultant.disponibilite,
        entrepriseSecteurIds: e.secteursRecherches.map((s) => s.secteurId),
        entrepriseExpertiseIds: e.expertisesRecherchees.map((x) => x.expertiseId),
        entrepriseVille: e.ville,
      }),
    }))
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-brand-ink">
            {consultant.prenom} {consultant.nom}{" "}
            <span className="font-mono text-base font-normal text-brand-gray">
              — {consultant.referenceAnonyme}
            </span>
          </h1>
          <p className="mt-1 text-sm text-brand-gray">
            Statut :{" "}
            <span className="font-medium text-brand-body">
              {STATUT_PUBLICATION_LABELS[
                consultant.statutPublication as keyof typeof STATUT_PUBLICATION_LABELS
              ] ?? consultant.statutPublication}
            </span>
            {" · "}BM référent : {consultant.businessManager.name}
          </p>
        </div>
        <Link href="/admin/consultants" className="link-underline text-sm text-brand-gray hover:text-brand-ink">
          ← Retour à la liste
        </Link>
      </div>

      {ia && consultant.genereParIA && (
        <div className="card border-l-4 border-l-brand-blue px-4 py-3 text-sm text-brand-ink">
          Dossier pré-rempli par l&apos;IA à partir du CV et de la
          transcription d&apos;entretien. Vérifiez les informations
          (notamment l&apos;absence de donnée identifiante dans le contexte
          des missions), complétez le nom si besoin, cochez les
          consentements RGPD, puis publiez.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {propose && (
        <div className="rounded-xl border border-brand-green/30 bg-brand-green/10 px-4 py-3 text-sm text-brand-green">
          ✅ Proposition envoyée — le DC a été transmis par email, avec une
          trace dans l&apos;historique du contact côté CRM.
        </div>
      )}

      {doublonsCandidats.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">
            ⚠️ Candidat(s) similaire(s) déjà présent(s) dans la base — vérifiez qu&apos;il ne s&apos;agit pas d&apos;un doublon :
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {doublonsCandidats.map((d) => (
              <li key={d.id}>
                <Link href={`/admin/consultants/${d.id}`} className="link-underline font-medium">
                  {d.referenceAnonyme} — {d.prenom} {d.nom}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card flex flex-wrap items-center gap-2 p-3">
        <form action={publishConsultantAction}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" className="btn bg-brand-green text-white hover:brightness-110">
            Publier
          </button>
        </form>
        <form action={unpublishConsultantAction}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" className="btn btn-secondary">
            Dépublier
          </button>
        </form>
        <form action={archiveConsultantAction}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" className="btn btn-secondary">
            Archiver
          </button>
        </form>
        <a href={`/admin/consultants/${id}/export-word`} className="btn btn-accent">
          Télécharger le DC (Word)
        </a>
        {canReassignReferent(session.user) && (
          <form
            action={transferConsultantAction}
            className={`flex items-center gap-1.5 ${session.user.role === ROLES.ADMIN ? "" : "ml-auto"}`}
          >
            <input type="hidden" name="id" value={id} />
            <select
              name="targetId"
              required
              defaultValue=""
              className="input py-1.5 text-xs"
              title="Transférer ce dossier à un autre BM"
            >
              <option value="" disabled>
                Transférer à…
              </option>
              {bms
                .filter((bm) => bm.id !== consultant.businessManagerId)
                .map((bm) => (
                  <option key={bm.id} value={bm.id}>
                    {bm.name}
                  </option>
                ))}
            </select>
            <button type="submit" className="btn btn-secondary py-1.5 text-xs">
              Transférer
            </button>
          </form>
        )}
        {session.user.role === ROLES.ADMIN && (
          <form action={purgeConsultantAction} className="ml-auto">
            <input type="hidden" name="id" value={id} />
            <button
              type="submit"
              className="btn border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            >
              Supprimer définitivement (RGPD)
            </button>
          </form>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <ConsultantEditForm
          consultant={consultant}
          referentials={{ secteurs, expertises, seniorites, typesMobilite, zones, competences, langues, bms }}
          canReassignReferent={canReassignReferent(session.user)}
        />

        <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <SuiviSection consultantId={id} suivis={suivis} />

          <div className="card p-4">
            <h2 className="mb-3 text-sm font-semibold text-brand-ink">
              Proposer à un client (CRM)
            </h2>
            {entreprisesPourPush.length === 0 ? (
              <p className="text-xs text-brand-gray">
                Aucune entreprise CRM accessible pour l&apos;instant.
              </p>
            ) : (
              <PushCandidatForm consultantId={id} entreprises={entreprisesPourPush} />
            )}
            {propositions.length > 0 && (
              <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs">
                {propositions.map((p) => (
                  <li key={p.id} className="text-brand-body">
                    <span className="font-medium text-brand-ink">{p.entreprise.nom}</span>
                    {p.contact && ` — ${p.contact.prenom} ${p.contact.nom}`}
                    <span className="text-brand-gray">
                      {" "}
                      · {new Date(p.createdAt).toLocaleDateString("fr-FR")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {suggestionsClientsAvecScore.length > 0 && (
            <div className="card p-4">
              <h2 className="mb-1 text-sm font-semibold text-brand-ink">
                Clients potentiellement intéressés
              </h2>
              <p className="mb-3 text-xs text-brand-gray">
                Entreprises dont les secteurs / expertises recherchés correspondent à ce profil.
              </p>
              <ul className="space-y-1.5">
                {suggestionsClientsAvecScore.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/admin/crm/${e.id}`}
                      className="flex flex-col gap-1.5 rounded-lg border border-slate-100 px-3 py-2 text-sm hover:border-brand-blue-light hover:bg-brand-blue-bg-soft"
                    >
                      <span className="font-medium text-brand-ink">{e.nom}</span>
                      <MatchBadges match={e.match} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-brand-ink">
                Aperçu — ce que voit le client
              </h2>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-brand-blue-bg px-2 py-0.5 text-xs font-medium text-brand-blue-dark">
                  anonymisé
                </span>
                <Link
                  href={`/admin/consultants/${id}/apercu`}
                  className="link-underline text-xs text-brand-blue-dark"
                >
                  Plein écran
                </Link>
              </div>
            </div>
            {publicView && <ConsultantDetail consultant={publicView} />}
          </div>
        </div>
      </div>
    </div>
  );
}
