"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { STATUT_PUBLICATION } from "@/lib/constants";
import { generateDCFromCvAndTranscript, isAiGenerationConfigured } from "@/lib/ai-dc";
import { generateNextReference } from "@/lib/reference-generator";
import { findVille } from "@/lib/villes-france";
import { saveCvFile } from "@/lib/cv-storage";
import { extractFileText } from "@/lib/cv-text";
import { findConsultantDuplicates } from "@/lib/duplicate-detection";
import { findOrCreateByLabel, matchIds, normLabel } from "@/lib/ai-dc-match";

export type GenerateIaState = { error?: string };

function computeRetentionDate(dateCollecte: Date, dureeMois: number): Date {
  const d = new Date(dateCollecte);
  d.setMonth(d.getMonth() + dureeMois);
  return d;
}

function parseMonthDate(value: string | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, 1);
}

export async function generateConsultantFromAI(
  _prev: GenerateIaState,
  formData: FormData
): Promise<GenerateIaState> {
  const session = await requireStaff();

  if (!isAiGenerationConfigured()) {
    return {
      error:
        "La génération assistée par IA n'est pas configurée sur ce déploiement (clé ANTHROPIC_API_KEY absente). Utilisez la création manuelle.",
    };
  }

  // Qui génère le dossier en devient le référent — quel que soit son rôle.
  const businessManagerId = session.user.id;

  const cvFileValue = formData.get("cvFile");

  let cvText: string;
  try {
    cvText = await extractFileText(cvFileValue);
  } catch (err) {
    console.error("[generation-ia] échec lecture CV", err);
    const message = err instanceof Error ? err.message : String(err);
    return { error: `CV : ${message}` };
  }

  if (!cvText) {
    return {
      error: "Merci de joindre le CV (ou dossier existant) — c'est le seul document obligatoire.",
    };
  }

  let transcriptText: string;
  try {
    transcriptText = await extractFileText(formData.get("transcriptFile"));
  } catch (err) {
    console.error("[generation-ia] échec lecture transcription", err);
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Transcription d'entretien : ${message}` };
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
    console.error("[generation-ia] échec appel Claude", err);
    const message = err instanceof Error ? err.message : String(err);
    return { error: `La génération par IA a échoué : ${message}` };
  }

  // Rapprochement insensible à la casse/aux espaces : le champ n'est plus
  // forcé par un enum côté modèle (voir ai-dc.ts), juste fortement suggéré
  // par le prompt — les valeurs non reconnues sont simplement ignorées
  // (référentiels non modifiés automatiquement).
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

  const reference = await generateNextReference();
  const dateCollecte = new Date();
  const cles = new Set(generated.competencesCles.map((c) => c.toLowerCase()));

  const savedCv =
    cvFileValue instanceof File && cvFileValue.size > 0
      ? await saveCvFile(cvFileValue)
      : null;

  const consultant = await prisma.consultant.create({
    data: {
      nom: generated.nom?.trim() || "À renseigner",
      prenom: generated.prenom?.trim() || "À renseigner",
      email: generated.email,
      telephone: generated.telephone,
      businessManagerId,
      dateRencontre: dateCollecte,
      statutCandidatInterne: "EN_COURS",
      dateCollecte,
      dureeConservationMois: 24,
      dateConservationLimite: computeRetentionDate(dateCollecte, 24),

      referenceAnonyme: reference,
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
      villeLat: generated.villeRattachement ? findVille(generated.villeRattachement)?.lat ?? null : null,
      villeLng: generated.villeRattachement ? findVille(generated.villeRattachement)?.lng ?? null : null,
      statutPublication: STATUT_PUBLICATION.BROUILLON,

      genereParIA: true,
      sourceCvTexte: cvText,
      sourceTranscriptTexte: transcriptText || null,
      cvFileUrl: savedCv?.storedName ?? null,
      cvFileNomOriginal: savedCv?.originalName ?? null,

      secteurs: { create: secteurIds.map((secteurId) => ({ secteurId })) },
      expertises: { create: expertiseIds.map((expertiseId) => ({ expertiseId })) },
      typesMobilite: { create: typeMobiliteIds.map((typeMobiliteId) => ({ typeMobiliteId })) },
      zonesGeographiques: { create: zoneIds.map((zoneGeographiqueId) => ({ zoneGeographiqueId })) },
      competences: {
        create: generated.competencesTechnologies.map((label) => ({
          competenceId: competenceIdByLabel.get(label)!,
          estCle: cles.has(label.toLowerCase()),
        })),
      },
      langues: {
        create: generated.langues.map((l) => ({
          langueId: langueIdByLabel.get(l.label)!,
          niveau: l.niveau,
          detail: l.detail,
        })),
      },
      competenceCategories: {
        create: generated.competenceCategories.map((c, i) => ({
          categorie: c.categorie,
          contenu: c.contenu,
          niveau: c.niveau,
          ordre: i,
        })),
      },
      formations: {
        create: generated.formations.map((f, i) => ({
          type: f.type,
          annee: f.annee,
          intitule: f.intitule,
          etablissement: f.etablissement,
          ordre: i,
        })),
      },
      experiences: {
        create: generated.experiences.map((e, i) => ({
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
      },
    },
  });

  const doublons = await findConsultantDuplicates(
    consultant.nom,
    consultant.prenom,
    consultant.email,
    consultant.id
  );
  const doublonsSuffix = doublons.length > 0 ? `&doublons=${doublons.map((d) => d.id).join(",")}` : "";
  redirect(`/admin/consultants/${consultant.id}?ia=1${doublonsSuffix}`);
}
