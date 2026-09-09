import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { ROLES } from "@/lib/constants";
import { consultantPublicSelect } from "@/lib/consultant-view";
import ConsultantEditForm from "./consultant-edit-form";
import { formatStatutBibliotheque, canReassignReferent } from "@/lib/constants";
import { canAccessConsultant } from "@/lib/consultant-access";
import { entrepriseVisibilityWhere } from "@/lib/crm-access";
import { computeMatchScore } from "@/lib/matching";
import CandidateActionsBar from "./candidate-actions-bar";

export const dynamic = "force-dynamic";

export default async function ConsultantEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
    ia?: string;
    doublons?: string;
    propose?: string;
    dcError?: string;
    dcRegenerated?: string;
  }>;
}) {
  const session = await requireStaff();
  const { id } = await params;
  const { error, ia, doublons, propose, dcError, dcRegenerated } = await searchParams;

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
      seniority: true,
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
    typesMobilite,
    zones,
    competences,
    langues,
    bms,
    publicView,
  ] = await Promise.all([
    prisma.secteur.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
    prisma.expertise.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
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
            {formatStatutBibliotheque(consultant.statutPublication) && (
              <>
                Bibliothèque :{" "}
                <span className="font-medium text-brand-body">
                  {formatStatutBibliotheque(consultant.statutPublication)}
                </span>
                {" · "}
              </>
            )}
            BM référent : {consultant.businessManager.name}
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

      {dcError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {dcError}
        </div>
      )}

      {dcRegenerated && (
        <div className="rounded-xl border border-brand-green/30 bg-brand-green/10 px-4 py-3 text-sm text-brand-green">
          ✅ DC régénéré à partir du CV{consultant.sourceTranscriptTexte ? " et de la transcription" : ""}
          — vérifiez le contenu (onglets Informations / Compétences / Secteurs) avant de publier.
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

      <CandidateActionsBar
        consultantId={id}
        canDelete={session.user.role === ROLES.ADMIN}
        suivis={suivis}
        entreprisesPourPush={entreprisesPourPush}
        propositions={propositions}
        suggestions={suggestionsClientsAvecScore}
        publicView={publicView}
      />

      <ConsultantEditForm
        consultant={consultant}
        referentials={{ secteurs, expertises, typesMobilite, zones, competences, langues, bms }}
        canReassignReferent={canReassignReferent(session.user)}
        suivis={suivis}
      />
    </div>
  );
}
