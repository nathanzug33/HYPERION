"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff, requireAdmin } from "@/lib/guards";
import { generateNextReference } from "@/lib/reference-generator";
import {
  STATUT_PUBLICATION,
  STATUT_CANDIDAT_INTERNE_LABELS,
  SUIVI_TYPE,
  canReassignReferent,
} from "@/lib/constants";
import { findVille } from "@/lib/villes-france";
import { canAccessConsultant } from "@/lib/consultant-access";
import { saveCvFile, deleteCvFile } from "@/lib/cv-storage";
import { extractFileText } from "@/lib/cv-text";
import { findConsultantDuplicates } from "@/lib/duplicate-detection";
import { deriveSeniorityId } from "@/lib/ai-dc-match";

function getMulti(formData: FormData, key: string): string[] {
  return formData.getAll(key).map(String).filter(Boolean);
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
  // Qui crée le dossier en devient le référent — quel que soit son rôle
  // (ADMIN/DIRECTEUR_BU compris). Seul un transfert explicite (réservé à
  // ADMIN/DIRECTEUR_BU, voir transferConsultantAction) change le référent
  // par la suite.
  const businessManagerId = session.user.id;

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

  const anneesExperience = formData.get("anneesExperience")
    ? Number(formData.get("anneesExperience"))
    : null;
  const seniorites = await prisma.seniorite.findMany({ where: { active: true } });
  const seniorityId = deriveSeniorityId(anneesExperience, seniorites);

  const data = {
    nom: String(formData.get("nom") ?? "").trim(),
    prenom: String(formData.get("prenom") ?? "").trim(),
    email: String(formData.get("email") ?? "") || null,
    telephone: String(formData.get("telephone") ?? "") || null,
    notesEntretien: String(formData.get("notesEntretien") ?? "") || null,
    statutCandidatInterne: String(
      formData.get("statutCandidatInterne") ?? "EN_COURS"
    ),
    businessManagerId:
      canReassignReferent(session.user) && formData.get("businessManagerId")
        ? String(formData.get("businessManagerId"))
        : consultant.businessManagerId,

    // Coût/marge : modifiable par tout le staff (BM, direction, admin) —
    // ce sont eux qui staffent et doivent pouvoir corriger ces données pour
    // que la marge de leur centre de profit reste juste.
    natureContrat: String(formData.get("natureContrat") ?? "") || null,
    salaireBrutAnnuel: formData.get("salaireBrutAnnuel")
      ? Number(formData.get("salaireBrutAnnuel"))
      : null,
    tjmAchat: formData.get("tjmAchat") ? Number(formData.get("tjmAchat")) : null,
    fraisAnnuels: formData.get("fraisAnnuels") ? Number(formData.get("fraisAnnuels")) : null,

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
    seniorityId,
    anneesExperience,
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

  // Compétences détaillées / formations / expériences détaillées ne sont
  // plus saisies dans ce formulaire (onglet "Pièces jointes" → régénération
  // via IA depuis le CV, voir dc-actions.ts) : on ne les touche pas ici,
  // sous peine de les vider à chaque enregistrement des autres onglets.

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
