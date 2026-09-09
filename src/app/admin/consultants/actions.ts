"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff, requireAdmin, requireAdminOrDirecteur } from "@/lib/guards";
import { generateNextReference } from "@/lib/reference-generator";
import {
  COMPETENCE_CATEGORIES,
  STATUT_PUBLICATION,
  STATUT_CANDIDAT_INTERNE_LABELS,
  SUIVI_TYPE,
  ROLES,
  canReassignReferent,
} from "@/lib/constants";
import { findVille } from "@/lib/villes-france";
import { canAccessConsultant } from "@/lib/consultant-access";
import { saveCvFile, deleteCvFile } from "@/lib/cv-storage";
import { extractFileText } from "@/lib/cv-text";
import { findConsultantDuplicates } from "@/lib/duplicate-detection";

function getMulti(formData: FormData, key: string): string[] {
  return formData.getAll(key).map(String).filter(Boolean);
}

function parseMonthInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, 1);
}

function computeRetentionDate(dateCollecte: Date, dureeMois: number): Date {
  const d = new Date(dateCollecte);
  d.setMonth(d.getMonth() + dureeMois);
  return d;
}

/** Résout une ville saisie librement en coordonnées connues (référentiel
 * villes-france) pour activer la recherche « ville + rayon » côté client.
 * Ville non reconnue : conservée telle quelle en texte, sans coordonnées. */
function resolveVille(saisie: string) {
  const ville = saisie.trim() || null;
  const ref = ville ? findVille(ville) : null;
  return {
    villeRattachement: ville,
    villeLat: ref?.lat ?? null,
    villeLng: ref?.lng ?? null,
  };
}

async function assertOwnership(consultantId: string) {
  const session = await requireStaff();
  const consultant = await prisma.consultant.findUnique({
    where: { id: consultantId },
  });
  if (!consultant) redirect("/admin/consultants");
  if (!(await canAccessConsultant(session.user, consultant))) {
    redirect("/admin/consultants");
  }
  return { session, consultant };
}

export async function createConsultantAction(formData: FormData) {
  const session = await requireStaff();

  const nom = String(formData.get("nom") ?? "").trim();
  const prenom = String(formData.get("prenom") ?? "").trim();
  const businessManagerId =
    canReassignReferent(session.user)
      ? String(formData.get("businessManagerId") ?? session.user.id)
      : session.user.id;

  if (!nom || !prenom) return;

  const reference = await generateNextReference();
  const dateCollecte = new Date();

  const cvFile = formData.get("cvFile");
  const savedCv =
    cvFile instanceof File && cvFile.size > 0 ? await saveCvFile(cvFile) : null;
  // Best-effort : le texte extrait alimente la recherche interne, mais un
  // échec d'extraction (fichier corrompu, format inhabituel) ne doit pas
  // empêcher la création du dossier.
  const cvText = savedCv ? await extractFileText(cvFile).catch(() => "") : "";

  const email = String(formData.get("email") ?? "") || null;

  const consultant = await prisma.consultant.create({
    data: {
      nom,
      prenom,
      email,
      telephone: String(formData.get("telephone") ?? "") || null,
      businessManagerId,
      dateRencontre: dateCollecte,
      referenceAnonyme: reference,
      dateCollecte,
      dateConservationLimite: computeRetentionDate(dateCollecte, 24),
      statutPublication: STATUT_PUBLICATION.BROUILLON,
      cvFileUrl: savedCv?.storedName ?? null,
      cvFileNomOriginal: savedCv?.originalName ?? null,
      sourceCvTexte: cvText || null,
    },
  });

  revalidatePath("/admin/consultants");

  const doublons = await findConsultantDuplicates(nom, prenom, email, consultant.id);
  const suffix = doublons.length > 0 ? `?doublons=${doublons.map((d) => d.id).join(",")}` : "";
  redirect(`/admin/consultants/${consultant.id}${suffix}`);
}

export async function updateConsultantAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { session, consultant } = await assertOwnership(id);

  const dureeConservationMois =
    Number(formData.get("dureeConservationMois")) || 24;

  const cvFile = formData.get("cvFile");
  const savedCv =
    cvFile instanceof File && cvFile.size > 0 ? await saveCvFile(cvFile) : null;
  if (savedCv) {
    await deleteCvFile(consultant.cvFileUrl);
  }
  const cvText = savedCv ? await extractFileText(cvFile).catch(() => "") : "";

  const data = {
    nom: String(formData.get("nom") ?? "").trim(),
    prenom: String(formData.get("prenom") ?? "").trim(),
    email: String(formData.get("email") ?? "") || null,
    telephone: String(formData.get("telephone") ?? "") || null,
    tjmMin: formData.get("tjmMin") ? Number(formData.get("tjmMin")) : null,
    tjmMax: formData.get("tjmMax") ? Number(formData.get("tjmMax")) : null,
    notesEntretien: String(formData.get("notesEntretien") ?? "") || null,
    statutCandidatInterne: String(
      formData.get("statutCandidatInterne") ?? "EN_COURS"
    ),
    businessManagerId:
      canReassignReferent(session.user) && formData.get("businessManagerId")
        ? String(formData.get("businessManagerId"))
        : consultant.businessManagerId,

    // Données salariales sensibles : uniquement modifiables par un admin
    // (le champ est de toute façon masqué côté formulaire pour les autres
    // rôles, mais on ne fait jamais confiance au seul masquage front).
    ...(session.user.role === ROLES.ADMIN
      ? {
          natureContrat: String(formData.get("natureContrat") ?? "") || null,
          salaireBrutAnnuel: formData.get("salaireBrutAnnuel")
            ? Number(formData.get("salaireBrutAnnuel"))
            : null,
          tjmAchat: formData.get("tjmAchat") ? Number(formData.get("tjmAchat")) : null,
          fraisAnnuels: formData.get("fraisAnnuels")
            ? Number(formData.get("fraisAnnuels"))
            : null,
        }
      : {}),

    consentementRgpd: formData.get("consentementRgpd") === "on",
    consentementDate: formData.get("consentementRgpd") === "on"
      ? consultant.consentementDate ?? new Date()
      : null,
    consentementPublication: formData.get("consentementPublication") === "on",
    dureeConservationMois,
    dateConservationLimite: computeRetentionDate(
      consultant.dateCollecte,
      dureeConservationMois
    ),

    referenceAnonyme:
      String(formData.get("referenceAnonyme") ?? "").trim() ||
      consultant.referenceAnonyme,
    intitulePoste: String(formData.get("intitulePoste") ?? "") || null,
    seniorityId: String(formData.get("seniorityId") ?? "") || null,
    anneesExperienceMin: formData.get("anneesExperienceMin")
      ? Number(formData.get("anneesExperienceMin"))
      : null,
    anneesExperienceMax: formData.get("anneesExperienceMax")
      ? Number(formData.get("anneesExperienceMax"))
      : null,
    resumeContexte: String(formData.get("resumeContexte") ?? "") || null,
    disponibilite: String(formData.get("disponibilite") ?? "") || null,
    disponibiliteConfirmeeLe: new Date(),
    typeContrat: String(formData.get("typeContrat") ?? "") || null,
    rayonKm: formData.get("rayonKm") ? Number(formData.get("rayonKm")) : null,
    ouvertGrandDeplacement: formData.get("ouvertGrandDeplacement") === "on",
    ...resolveVille(String(formData.get("villeRattachement") ?? "")),
    ...(savedCv
      ? {
          cvFileUrl: savedCv.storedName,
          cvFileNomOriginal: savedCv.originalName,
          sourceCvTexte: cvText || null,
        }
      : {}),
  };

  const secteurIds = getMulti(formData, "secteurIds");
  const expertiseIds = getMulti(formData, "expertiseIds");
  const competenceIds = getMulti(formData, "competenceIds");
  const typeMobiliteIds = getMulti(formData, "typeMobiliteIds");
  const zoneIds = getMulti(formData, "zoneIds");
  const langueIds = getMulti(formData, "langueIds");

  const langueRows = langueIds.map((langueId) => ({
    consultantId: id,
    langueId,
    niveau: Number(formData.get(`langueNiveau_${langueId}`)) || 3,
    detail: String(formData.get(`langueDetail_${langueId}`) ?? "").trim() || null,
  }));

  const competenceCategorieRows = Object.values(COMPETENCE_CATEGORIES)
    .map((cat, ordre) => ({
      consultantId: id,
      categorie: cat,
      contenu: String(formData.get(`compCat_${cat}_contenu`) ?? "").trim(),
      niveau: Number(formData.get(`compCat_${cat}_niveau`)) || 3,
      ordre,
    }))
    .filter((row) => row.contenu);

  const formationRows = Array.from({ length: 6 })
    .map((_, i) => ({
      consultantId: id,
      type: String(formData.get(`formationType_${i}`) ?? "FORMATION"),
      annee: String(formData.get(`formationAnnee_${i}`) ?? "").trim(),
      intitule: String(formData.get(`formationIntitule_${i}`) ?? "").trim(),
      etablissement:
        String(formData.get(`formationEtablissement_${i}`) ?? "").trim() || null,
      ordre: i,
    }))
    .filter((row) => row.intitule);

  const experienceRows = Array.from({ length: 4 })
    .map((_, i) => ({
      consultantId: id,
      entreprise: String(formData.get(`expEntreprise_${i}`) ?? "").trim(),
      secteurActivite: String(formData.get(`expSecteur_${i}`) ?? "").trim() || null,
      missionTitre: String(formData.get(`expMission_${i}`) ?? "").trim(),
      dateDebut: parseMonthInput(String(formData.get(`expDebut_${i}`) ?? "")),
      dateFin: parseMonthInput(String(formData.get(`expFin_${i}`) ?? "")),
      contexteObjectif: String(formData.get(`expContexte_${i}`) ?? "").trim() || null,
      realisations: String(formData.get(`expRealisations_${i}`) ?? "").trim() || null,
      environnementTechnique:
        String(formData.get(`expEnvTech_${i}`) ?? "").trim() || null,
      ordre: i,
    }))
    .filter((row) => row.entreprise && row.missionTitre);

  const statutChange =
    data.statutCandidatInterne !== consultant.statutCandidatInterne
      ? {
          from: consultant.statutCandidatInterne,
          to: data.statutCandidatInterne,
        }
      : null;

  await prisma.$transaction([
    prisma.consultant.update({ where: { id }, data }),
    ...(statutChange
      ? [
          prisma.suiviCandidat.create({
            data: {
              consultantId: id,
              type: SUIVI_TYPE.STATUT,
              titre: `Statut candidat : ${
                STATUT_CANDIDAT_INTERNE_LABELS[
                  statutChange.from as keyof typeof STATUT_CANDIDAT_INTERNE_LABELS
                ] ?? statutChange.from
              } → ${
                STATUT_CANDIDAT_INTERNE_LABELS[
                  statutChange.to as keyof typeof STATUT_CANDIDAT_INTERNE_LABELS
                ] ?? statutChange.to
              }`,
              fait: true,
              createdById: session.user.id,
            },
          }),
        ]
      : []),
    prisma.consultantSecteur.deleteMany({ where: { consultantId: id } }),
    prisma.consultantSecteur.createMany({
      data: secteurIds.map((secteurId) => ({ consultantId: id, secteurId })),
    }),
    prisma.consultantExpertise.deleteMany({ where: { consultantId: id } }),
    prisma.consultantExpertise.createMany({
      data: expertiseIds.map((expertiseId) => ({
        consultantId: id,
        expertiseId,
      })),
    }),
    prisma.consultantCompetence.deleteMany({ where: { consultantId: id } }),
    prisma.consultantCompetence.createMany({
      data: competenceIds.map((competenceId) => ({
        consultantId: id,
        competenceId,
      })),
    }),
    prisma.consultantTypeMobilite.deleteMany({ where: { consultantId: id } }),
    prisma.consultantTypeMobilite.createMany({
      data: typeMobiliteIds.map((typeMobiliteId) => ({
        consultantId: id,
        typeMobiliteId,
      })),
    }),
    prisma.consultantZoneGeographique.deleteMany({
      where: { consultantId: id },
    }),
    prisma.consultantZoneGeographique.createMany({
      data: zoneIds.map((zoneGeographiqueId) => ({
        consultantId: id,
        zoneGeographiqueId,
      })),
    }),
    prisma.consultantLangue.deleteMany({ where: { consultantId: id } }),
    prisma.consultantLangue.createMany({ data: langueRows }),

    prisma.competenceCategorie.deleteMany({ where: { consultantId: id } }),
    prisma.competenceCategorie.createMany({ data: competenceCategorieRows }),

    prisma.formation.deleteMany({ where: { consultantId: id } }),
    prisma.formation.createMany({ data: formationRows }),

    prisma.experience.deleteMany({ where: { consultantId: id } }),
    prisma.experience.createMany({ data: experienceRows }),
  ]);

  revalidatePath(`/admin/consultants/${id}`);
  revalidatePath("/admin/consultants");
}

const REQUIRED_FOR_PUBLICATION = [
  "intitulePoste",
  "seniorityId",
  "disponibilite",
  "resumeContexte",
] as const;

export async function publishConsultantAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { consultant } = await assertOwnership(id);

  const missing: string[] = [];
  for (const field of REQUIRED_FOR_PUBLICATION) {
    if (!consultant[field]) missing.push(field);
  }
  if (!consultant.consentementRgpd || !consultant.consentementPublication) {
    missing.push("consentement RGPD / publication");
  }

  const [secteurCount, expertiseCount] = await Promise.all([
    prisma.consultantSecteur.count({ where: { consultantId: id } }),
    prisma.consultantExpertise.count({ where: { consultantId: id } }),
  ]);
  if (secteurCount === 0) missing.push("au moins un secteur");
  if (expertiseCount === 0) missing.push("au moins une expertise");

  if (missing.length > 0) {
    redirect(
      `/admin/consultants/${id}?error=${encodeURIComponent(
        "Publication impossible, champs manquants : " + missing.join(", ")
      )}`
    );
  }

  await prisma.consultant.update({
    where: { id },
    data: {
      statutPublication: STATUT_PUBLICATION.PUBLIEE,
      datePublication: new Date(),
      dateDepublication: null,
    },
  });

  revalidatePath(`/admin/consultants/${id}`);
  revalidatePath("/admin/consultants");
  redirect(`/admin/consultants/${id}`);
}

export async function unpublishConsultantAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await assertOwnership(id);

  await prisma.consultant.update({
    where: { id },
    data: {
      statutPublication: STATUT_PUBLICATION.DEPUBLIEE,
      dateDepublication: new Date(),
    },
  });

  revalidatePath(`/admin/consultants/${id}`);
  revalidatePath("/admin/consultants");
  redirect(`/admin/consultants/${id}`);
}

export async function archiveConsultantAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await assertOwnership(id);

  await prisma.consultant.update({
    where: { id },
    data: { statutPublication: STATUT_PUBLICATION.ARCHIVEE },
  });

  revalidatePath(`/admin/consultants/${id}`);
  revalidatePath("/admin/consultants");
  redirect(`/admin/consultants/${id}`);
}

/** Transfert d'un dossier candidat à un autre BM référent, un par un — voir
 * transferEntrepriseAction (CRM) pour la même logique côté compte client. */
export async function transferConsultantAction(formData: FormData) {
  const session = await requireAdminOrDirecteur();
  const id = String(formData.get("id") ?? "");
  const targetId = String(formData.get("targetId") ?? "");
  if (!id || !targetId) return;

  const consultant = await prisma.consultant.findUnique({ where: { id } });
  if (!consultant || !(await canAccessConsultant(session.user, consultant))) return;

  await prisma.consultant.update({ where: { id }, data: { businessManagerId: targetId } });
  revalidatePath(`/admin/consultants/${id}`);
  revalidatePath("/admin/consultants");
  revalidatePath("/admin");
}

export async function purgeConsultantAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const consultant = await prisma.consultant.findUnique({
    where: { id },
    select: { cvFileUrl: true },
  });
  await prisma.consultant.delete({ where: { id } });
  if (consultant) {
    await deleteCvFile(consultant.cvFileUrl);
  }
  revalidatePath("/admin/consultants");
  redirect("/admin/consultants");
}
