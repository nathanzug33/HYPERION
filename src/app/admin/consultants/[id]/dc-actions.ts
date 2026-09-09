"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { canAccessConsultant } from "@/lib/consultant-access";
import { generateDCFromCvAndTranscript, isAiGenerationConfigured } from "@/lib/ai-dc";
import { extractFileText } from "@/lib/cv-text";
import { saveCvFile } from "@/lib/cv-storage";
import { findVille } from "@/lib/villes-france";
import { findOrCreateByLabel, matchIds, normLabel } from "@/lib/ai-dc-match";
import { COMPETENCE_CATEGORIES } from "@/lib/constants";

function parseMonthDate(value: string | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, 1);
}

function dcError(id: string, message: string): never {
  redirect(`/admin/consultants/${id}?dcError=${encodeURIComponent(message)}`);
}

/** Régénère le contenu du DC (champs exposables, secteurs/expertises/
 * compétences/langues, compétences détaillées, formations, expériences)
 * d'un dossier EXISTANT à partir de son CV déjà en base — ou d'un nouveau
 * CV/transcript déposés ici — via l'IA. Remplace l'édition manuelle des
 * blocs "gabarit HYPERION" : on régénère depuis la source plutôt que de les
 * ressaisir à la main. Les champs internes (nom, prénom, email, téléphone,
 * TJM, statut, coût/marge…) ne sont jamais touchés par cette action.
 */
export async function regenerateDcFromIaAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const session = await requireStaff();

  const consultant = await prisma.consultant.findUnique({ where: { id } });
  if (!consultant) redirect("/admin/consultants");
  if (!(await canAccessConsultant(session.user, consultant))) {
    redirect("/admin/consultants");
  }

  if (!isAiGenerationConfigured()) {
    dcError(id, "La génération assistée par IA n'est pas configurée sur ce déploiement (clé ANTHROPIC_API_KEY absente).");
  }

  const cvFileValue = formData.get("cvFile");
  const hasNewCv = cvFileValue instanceof File && cvFileValue.size > 0;

  let cvText = consultant.sourceCvTexte ?? "";
  let savedCv: { storedName: string; originalName: string } | null = null;
  if (hasNewCv) {
    try {
      cvText = await extractFileText(cvFileValue);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      dcError(id, `CV : ${message}`);
    }
    savedCv = await saveCvFile(cvFileValue as File);
  }

  if (!cvText) {
    dcError(id, "Aucun CV exploitable : ce dossier n'a pas de texte de CV enregistré — déposez un CV ci-dessus avant de générer le DC.");
  }

  let transcriptText: string;
  try {
    transcriptText = await extractFileText(formData.get("transcriptFile"));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    dcError(id, `Transcription d'entretien : ${message}`);
  }

  const [secteurs, expertises, seniorites, typesMobilite, zones] = await Promise.all([
    prisma.secteur.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
    prisma.expertise.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
    prisma.seniorite.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
    prisma.typeMobilite.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
    prisma.zoneGeographique.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
  ]);

  let generated;
  try {
    generated = await generateDCFromCvAndTranscript({
      cvText,
      transcriptText: transcriptText || null,
      vocab: {
        secteurs: secteurs.map((s) => s.label),
        expertises: expertises.map((e) => e.label),
        seniorites: seniorites.map((s) => s.label),
        typesMobilite: typesMobilite.map((m) => m.label),
        zones: zones.map((z) => z.label),
        langues: [],
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    dcError(id, `La génération par IA a échoué : ${message}`);
  }

  const seniorityId =
    seniorites.find((s) => normLabel(s.label) === normLabel(generated.seniorite))?.id ?? null;
  const secteurIds = matchIds(secteurs, generated.secteurs);
  const expertiseIds = matchIds(expertises, generated.expertises);
  const typeMobiliteIds = matchIds(typesMobilite, generated.typesMobilite);
  const zoneIds = matchIds(zones, generated.zonesGeographiques);

  const competenceIdByLabel = await findOrCreateByLabel(
    prisma.competence,
    generated.competencesTechnologies
  );
  const langueIdByLabel = await findOrCreateByLabel(
    prisma.langue,
    generated.langues.map((l) => l.label)
  );

  const cles = new Set(generated.competencesCles.map((c) => c.toLowerCase()));
  const villeRef = generated.villeRattachement ? findVille(generated.villeRattachement) : null;

  await prisma.$transaction([
    prisma.consultant.update({
      where: { id },
      data: {
        intitulePoste: generated.intitulePoste,
        seniorityId,
        anneesExperienceMin: generated.anneesExperienceMin,
        anneesExperienceMax: generated.anneesExperienceMax,
        resumeContexte: generated.resumeContexte,
        presentationCourte: generated.presentationCourte,
        disponibilite: generated.disponibilite,
        typeContrat: generated.typeContrat,
        rayonKm: generated.rayonKm,
        ouvertGrandDeplacement: generated.ouvertGrandDeplacement,
        villeRattachement: generated.villeRattachement,
        villeLat: villeRef?.lat ?? null,
        villeLng: villeRef?.lng ?? null,
        genereParIA: true,
        sourceCvTexte: cvText,
        sourceTranscriptTexte: transcriptText || consultant.sourceTranscriptTexte,
        ...(savedCv
          ? { cvFileUrl: savedCv.storedName, cvFileNomOriginal: savedCv.originalName }
          : {}),
      },
    }),

    prisma.consultantSecteur.deleteMany({ where: { consultantId: id } }),
    prisma.consultantSecteur.createMany({
      data: secteurIds.map((secteurId) => ({ consultantId: id, secteurId })),
    }),
    prisma.consultantExpertise.deleteMany({ where: { consultantId: id } }),
    prisma.consultantExpertise.createMany({
      data: expertiseIds.map((expertiseId) => ({ consultantId: id, expertiseId })),
    }),
    prisma.consultantTypeMobilite.deleteMany({ where: { consultantId: id } }),
    prisma.consultantTypeMobilite.createMany({
      data: typeMobiliteIds.map((typeMobiliteId) => ({ consultantId: id, typeMobiliteId })),
    }),
    prisma.consultantZoneGeographique.deleteMany({ where: { consultantId: id } }),
    prisma.consultantZoneGeographique.createMany({
      data: zoneIds.map((zoneGeographiqueId) => ({ consultantId: id, zoneGeographiqueId })),
    }),
    prisma.consultantCompetence.deleteMany({ where: { consultantId: id } }),
    prisma.consultantCompetence.createMany({
      data: generated.competencesTechnologies.map((label) => ({
        consultantId: id,
        competenceId: competenceIdByLabel.get(label)!,
        estCle: cles.has(label.toLowerCase()),
      })),
    }),
    prisma.consultantLangue.deleteMany({ where: { consultantId: id } }),
    prisma.consultantLangue.createMany({
      data: generated.langues.map((l) => ({
        consultantId: id,
        langueId: langueIdByLabel.get(l.label)!,
        niveau: l.niveau,
        detail: l.detail,
      })),
    }),

    prisma.competenceCategorie.deleteMany({ where: { consultantId: id } }),
    prisma.competenceCategorie.createMany({
      data: generated.competenceCategories
        .filter((c) => (Object.values(COMPETENCE_CATEGORIES) as string[]).includes(c.categorie))
        .map((c, i) => ({
          consultantId: id,
          categorie: c.categorie,
          contenu: c.contenu,
          niveau: c.niveau,
          ordre: i,
        })),
    }),

    prisma.formation.deleteMany({ where: { consultantId: id } }),
    prisma.formation.createMany({
      data: generated.formations.map((f, i) => ({
        consultantId: id,
        type: f.type,
        annee: f.annee,
        intitule: f.intitule,
        etablissement: f.etablissement,
        ordre: i,
      })),
    }),

    prisma.experience.deleteMany({ where: { consultantId: id } }),
    prisma.experience.createMany({
      data: generated.experiences.map((e, i) => ({
        consultantId: id,
        entreprise: e.entreprise,
        secteurActivite: e.secteurActivite,
        missionTitre: e.missionTitre,
        dateDebut: parseMonthDate(e.dateDebut),
        dateFin: parseMonthDate(e.dateFin),
        contexteObjectif: e.contexteObjectif,
        realisations: e.realisations.join("\n"),
        environnementTechnique: e.environnementTechnique,
        ordre: i,
      })),
    }),
  ]);

  revalidatePath(`/admin/consultants/${id}`);
  redirect(`/admin/consultants/${id}?dcRegenerated=1`);
}
