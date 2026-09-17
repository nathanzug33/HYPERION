"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { canAccessConsultant } from "@/lib/consultant-access";
import { generateDCFromCvAndTranscript, isAiGenerationConfigured, type GeneratedDC } from "@/lib/ai-dc";
import { generateTagsFromCv, type GeneratedTags } from "@/lib/ai-tagging";
import { extractFileText, extractTextFromBuffer } from "@/lib/cv-text";
import { saveCvFile, readCvFile } from "@/lib/cv-storage";
import { saveDcFile, readDcFile } from "@/lib/dc-storage";
import { saveTranscriptFile, saveTranscriptText, readTranscriptFile } from "@/lib/transcript-storage";
import { buildDcDocx, dcConsultantInclude, formatDcFilename } from "@/lib/dc-docx";
import { findVille } from "@/lib/villes-france";
import { findOrCreateByLabel, matchIds, deriveSeniorityId } from "@/lib/ai-dc-match";
import { COMPETENCE_CATEGORIES } from "@/lib/constants";
import { resolveCompetencesCles } from "@/lib/competences-cles";

function parseMonthDate(value: string | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, 1);
}

/** Relit une pièce jointe déjà enregistrée (CV, DC ou transcript) pour en
 * extraire le texte — utilisé par le Tagging IA et la génération de DC via
 * IA quand la source choisie est un fichier déjà en ligne plutôt qu'un
 * nouveau dépôt. */
async function resolveFichierText(consultantId: string, fichierId: string): Promise<string> {
  const fichier = await prisma.consultantFichier.findUnique({ where: { id: fichierId } });
  if (!fichier || fichier.consultantId !== consultantId) {
    throw new Error("Pièce jointe introuvable.");
  }
  const buffer =
    fichier.type === "CV"
      ? await readCvFile(fichier.storedName)
      : fichier.type === "DC"
        ? await readDcFile(fichier.storedName)
        : await readTranscriptFile(fichier.storedName);
  if (!buffer) throw new Error("Fichier introuvable sur le serveur.");
  return extractTextFromBuffer(buffer, fichier.nomOriginal);
}

// ============================================================================
// Tagging IA — étroit : ne tague que secteurs / expertises / compétences,
// à partir d'un CV ou DC déjà en ligne (sélectionné, défaut = le plus
// récent) ou d'un nouveau dépôt. N'écrit jamais l'identité, le résumé, la
// mobilité, les langues, les formations ni les expériences (voir "Générer
// un DC via IA" ci-dessous pour ça). Application directe, sans aperçu
// intermédiaire : la confirmation se fait côté client avant l'envoi.
// ============================================================================

export type TaggingState = { error?: string; success?: boolean };

export async function applyTaggingIaAction(
  _prev: TaggingState,
  formData: FormData
): Promise<TaggingState> {
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

  const fichierId = String(formData.get("fichierId") ?? "");
  const cvFileValue = formData.get("cvFile");
  const hasUpload = cvFileValue instanceof File && cvFileValue.size > 0;

  let sourceText = "";
  try {
    if (hasUpload) {
      sourceText = await extractFileText(cvFileValue);
    } else if (fichierId) {
      sourceText = await resolveFichierText(id, fichierId);
    } else {
      sourceText = consultant.sourceCvTexte ?? "";
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Lecture du fichier : ${message}` };
  }

  if (!sourceText) {
    return {
      error: "Aucun texte exploitable — sélectionnez un CV/DC déjà en ligne ou déposez-en un.",
    };
  }

  const [secteurs, expertises] = await Promise.all([
    prisma.secteur.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
    prisma.expertise.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
  ]);

  let generated: GeneratedTags;
  try {
    generated = await generateTagsFromCv({
      cvText: sourceText,
      vocab: { secteurs: secteurs.map((s) => s.label), expertises: expertises.map((e) => e.label) },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `La génération par IA a échoué : ${message}` };
  }

  const secteurIds = matchIds(secteurs, generated.secteurs);
  const expertiseIds = matchIds(expertises, generated.expertises);
  const competenceIdByLabel = await findOrCreateByLabel(
    prisma.competence,
    generated.competencesTechnologies
  );
  const cles = resolveCompetencesCles(generated.competencesTechnologies, generated.competencesCles);

  const savedUpload = hasUpload ? await saveCvFile(cvFileValue as File) : null;

  await prisma.$transaction([
    ...(savedUpload
      ? [
          prisma.consultantFichier.create({
            data: {
              consultantId: id,
              type: "CV",
              storedName: savedUpload.storedName,
              nomOriginal: savedUpload.originalName,
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
      data: expertiseIds.map((expertiseId) => ({ consultantId: id, expertiseId })),
    }),
    prisma.consultantCompetence.deleteMany({ where: { consultantId: id } }),
    prisma.consultantCompetence.createMany({
      data: generated.competencesTechnologies.map((label) => ({
        consultantId: id,
        competenceId: competenceIdByLabel.get(label)!,
        estCle: cles.has(label),
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
  ]);

  revalidatePath(`/admin/consultants/${id}`);
  return { success: true };
}

// ============================================================================
// Générer un DC via IA — large : relit un CV + (optionnellement) un
// transcript d'entretien déjà en ligne (ou nouvellement déposés / tapés) pour
// régénérer l'intégralité du dossier (identité, résumé, séniorité, mobilité,
// secteurs, compétences, langues, formations, expériences), avec un aperçu
// (avant/après) des champs identité avant application, puis persiste un
// nouveau DC (Word) en pièce jointe.
// ============================================================================

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
    // { id, generated, cvText, transcriptText, savedCv, savedTranscript }.
    payload: string;
  };
};

type Payload = {
  id: string;
  generated: GeneratedDC;
  cvText: string;
  transcriptText: string;
  savedCv: { storedName: string; originalName: string } | null;
  savedTranscript: { storedName: string; originalName: string } | null;
};

/** Étape 1 — relit le CV (sélectionné parmi les pièces jointes existantes,
 * ou déposé ici) et, si fournie, une transcription d'entretien (sélectionnée,
 * déposée, ou tapée en texte brut), pour proposer un nouveau DC complet,
 * SANS rien écrire en base : l'utilisateur voit d'abord un aperçu (avant/
 * après) des champs identité avant de confirmer, car cette action écrase
 * volontairement une éventuelle saisie manuelle précédente. */
export async function previewGenererDcIaAction(
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

  const cvFichierId = String(formData.get("cvFichierId") ?? "");
  const cvFileValue = formData.get("cvFile");
  const hasNewCv = cvFileValue instanceof File && cvFileValue.size > 0;

  let cvText = "";
  let savedCv: { storedName: string; originalName: string } | null = null;
  try {
    if (hasNewCv) {
      cvText = await extractFileText(cvFileValue);
      savedCv = await saveCvFile(cvFileValue as File);
    } else if (cvFichierId) {
      cvText = await resolveFichierText(id, cvFichierId);
    } else {
      cvText = consultant.sourceCvTexte ?? "";
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `CV : ${message}` };
  }

  if (!cvText) {
    return {
      error: "Aucun CV exploitable — sélectionnez un CV déjà en ligne ou déposez-en un ci-dessus.",
    };
  }

  const transcriptFichierId = String(formData.get("transcriptFichierId") ?? "");
  const transcriptFileValue = formData.get("transcriptFile");
  const hasNewTranscriptFile = transcriptFileValue instanceof File && transcriptFileValue.size > 0;
  const transcriptTextRaw = String(formData.get("transcriptText") ?? "").trim();

  let transcriptText = "";
  let savedTranscript: { storedName: string; originalName: string } | null = null;
  try {
    if (hasNewTranscriptFile) {
      transcriptText = await extractFileText(transcriptFileValue);
      const saved = await saveTranscriptFile(transcriptFileValue as File);
      if (!saved) {
        return { error: "Transcription : format non supporté (pdf, doc, docx, txt)." };
      }
      savedTranscript = saved;
    } else if (transcriptTextRaw) {
      transcriptText = transcriptTextRaw;
      savedTranscript = await saveTranscriptText(
        transcriptTextRaw,
        `Notes d'entretien ${new Date().toLocaleDateString("fr-FR")}`
      );
    } else if (transcriptFichierId) {
      transcriptText = await resolveFichierText(id, transcriptFichierId);
    }
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

  const payload: Payload = { id, generated, cvText, transcriptText, savedCv, savedTranscript };

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

/** Étape 2 — applique le DC prévisualisé à l'étape 1 (aucun nouvel appel
 * IA : tout est déjà dans le payload confirmé), puis persiste un nouveau
 * fichier DC (Word) en pièce jointe. */
export async function applyGenererDcIaAction(
  _prev: DcPreviewState,
  formData: FormData
): Promise<DcPreviewState> {
  let payload: Payload;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return { error: "Aperçu invalide ou expiré — relancez la génération." };
  }
  const { id, generated, cvText, transcriptText, savedCv, savedTranscript } = payload;

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

  const cles = resolveCompetencesCles(generated.competencesTechnologies, generated.competencesCles);
  const villeRef = generated.villeRattachement ? findVille(generated.villeRattachement) : null;

  await prisma.$transaction([
    prisma.consultant.update({
      where: { id },
      data: {
        // Écrase volontairement une saisie manuelle précédente, cette
        // action étant explicite et non automatique.
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
      },
    }),

    ...(savedCv
      ? [
          prisma.consultantFichier.create({
            data: {
              consultantId: id,
              type: "CV",
              storedName: savedCv.storedName,
              nomOriginal: savedCv.originalName,
              createdById: session.user.id,
            },
          }),
        ]
      : []),
    ...(savedTranscript
      ? [
          prisma.consultantFichier.create({
            data: {
              consultantId: id,
              type: "TRANSCRIPT",
              storedName: savedTranscript.storedName,
              nomOriginal: savedTranscript.originalName,
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
        estCle: cles.has(label),
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
        estCle: e.estCle,
        ordre: i,
      })),
    }),
  ]);

  // Génère et conserve un nouveau DC (Word) en pièce jointe — best-effort :
  // un échec de génération/stockage ne doit jamais faire perdre le reste des
  // données déjà appliquées ci-dessus.
  try {
    const updated = await prisma.consultant.findUnique({ where: { id }, include: dcConsultantInclude });
    if (updated) {
      const buffer = await buildDcDocx(updated);
      const filename = formatDcFilename(updated.nom, updated.prenom);
      const savedDc = await saveDcFile(buffer, filename);
      await prisma.consultantFichier.create({
        data: {
          consultantId: id,
          type: "DC",
          storedName: savedDc.storedName,
          nomOriginal: savedDc.originalName,
          createdById: session.user.id,
        },
      });
    }
  } catch (err) {
    console.error("[generer-dc-ia] Échec de l'enregistrement du DC en pièce jointe :", err);
  }

  revalidatePath(`/admin/consultants/${id}`);
  redirect(`/admin/consultants/${id}?dcRegenerated=1`);
}
