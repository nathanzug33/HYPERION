"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { canAccessConsultant } from "@/lib/consultant-access";
import { generateDCFromCvAndTranscript, isAiGenerationConfigured, type GeneratedDC } from "@/lib/ai-dc";
import { extractFileText } from "@/lib/cv-text";
import { saveCvFile } from "@/lib/cv-storage";
import { findVille } from "@/lib/villes-france";
import { findOrCreateByLabel, matchIds, deriveSeniorityId } from "@/lib/ai-dc-match";
import { COMPETENCE_CATEGORIES } from "@/lib/constants";

function parseMonthDate(value: string | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, 1);
}

export type DcPreviewState = {
  error?: string;
  preview?: {
    before: {
      nom: string;
      prenom: string;
      telephone: string | null;
      email: string | null;
      resumeContexte: string | null;
    };
    after: {
      nom: string | null;
      prenom: string | null;
      telephone: string | null;
      email: string | null;
      resumeContexte: string | null;
    };
    // Sérialise tout ce qu'il faut pour appliquer sans rappeler l'IA :
    // { id, generated, cvText, transcriptText, savedCv }.
    payload: string;
  };
};

type Payload = {
  id: string;
  generated: GeneratedDC;
  cvText: string;
  transcriptText: string;
  savedCv: { storedName: string; originalName: string } | null;
};

/** Étape 1 du "Tagging IA" — relit le CV (déjà en base ou déposé ici) et,
 * si fournie, une transcription d'entretien, pour proposer un nouveau
 * tagging (identité, profil, mobilité, compétences, secteurs, formations,
 * expériences), SANS rien écrire en base : l'utilisateur voit d'abord un
 * aperçu (avant/après) des champs identité avant de confirmer, car ce
 * bouton écrase volontairement une éventuelle saisie manuelle précédente.
 */
export async function previewDcFromIaAction(
  _prevState: DcPreviewState,
  formData: FormData
): Promise<DcPreviewState> {
  const id = String(formData.get("id") ?? "");
  const session = await requireStaff();

  const consultant = await prisma.consultant.findUnique({ where: { id } });
  if (!consultant) return { error: "Dossier introuvable." };
  if (!(await canAccessConsultant(session.user, consultant))) {
    return { error: "Accès refusé." };
  }

  if (!isAiGenerationConfigured()) {
    return {
      error:
        "La génération assistée par IA n'est pas configurée sur ce déploiement (clé ANTHROPIC_API_KEY absente).",
    };
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
      return { error: `CV : ${message}` };
    }
    savedCv = await saveCvFile(cvFileValue as File);
  }

  if (!cvText) {
    return {
      error:
        "Aucun CV exploitable : ce dossier n'a pas de texte de CV enregistré — déposez un CV ci-dessus avant de générer le DC.",
    };
  }

  let transcriptText: string;
  try {
    transcriptText = await extractFileText(formData.get("transcriptFile"));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Transcription d'entretien : ${message}` };
  }

  const [secteurs, expertises, typesMobilite, zones] = await Promise.all([
    prisma.secteur.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
    prisma.expertise.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
    prisma.typeMobilite.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
    prisma.zoneGeographique.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
  ]);

  let generated: GeneratedDC;
  try {
    generated = await generateDCFromCvAndTranscript({
      cvText,
      transcriptText: transcriptText || null,
      vocab: {
        secteurs: secteurs.map((s) => s.label),
        expertises: expertises.map((e) => e.label),
        typesMobilite: typesMobilite.map((m) => m.label),
        zones: zones.map((z) => z.label),
        langues: [],
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `La génération par IA a échoué : ${message}` };
  }

  const payload: Payload = { id, generated, cvText, transcriptText, savedCv };

  return {
    preview: {
      before: {
        nom: consultant.nom,
        prenom: consultant.prenom,
        telephone: consultant.telephone,
        email: consultant.email,
        resumeContexte: consultant.resumeContexte,
      },
      after: {
        nom: generated.nom,
        prenom: generated.prenom,
        telephone: generated.telephone,
        email: generated.email,
        resumeContexte: generated.resumeContexte,
      },
      payload: JSON.stringify(payload),
    },
  };
}

/** Étape 2 du "Tagging IA" — applique le tagging prévisualisé à l'étape 1
 * (aucun nouvel appel IA : tout est déjà dans le payload confirmé). */
export async function applyDcFromIaAction(
  _prev: DcPreviewState,
  formData: FormData
): Promise<DcPreviewState> {
  let payload: Payload;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return { error: "Aperçu invalide ou expiré — relancez le tagging IA." };
  }
  const { id, generated, cvText, transcriptText, savedCv } = payload;

  const session = await requireStaff();
  const consultant = await prisma.consultant.findUnique({ where: { id } });
  if (!consultant) redirect("/admin/consultants");
  if (!(await canAccessConsultant(session.user, consultant))) {
    redirect("/admin/consultants");
  }

  const [secteurs, expertises, seniorites, typesMobilite, zones] = await Promise.all([
    prisma.secteur.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
    prisma.expertise.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
    prisma.seniorite.findMany({ where: { active: true } }),
    prisma.typeMobilite.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
    prisma.zoneGeographique.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
  ]);

  const seniorityId = deriveSeniorityId(generated.anneesExperience, seniorites);
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
        // Tagging IA : renseigne aussi l'identité si elle est trouvée dans
        // le CV — écrase volontairement une saisie manuelle précédente,
        // ce bouton étant une action explicite et non automatique.
        ...(generated.nom ? { nom: generated.nom } : {}),
        ...(generated.prenom ? { prenom: generated.prenom } : {}),
        ...(generated.telephone ? { telephone: generated.telephone } : {}),
        ...(generated.email ? { email: generated.email } : {}),
        intitulePoste: generated.intitulePoste,
        seniorityId,
        anneesExperience: generated.anneesExperience,
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
