"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { ROLES, STATUT_PUBLICATION } from "@/lib/constants";
import { generateDCFromCvAndTranscript, isAiGenerationConfigured } from "@/lib/ai-dc";
import { extractPdfText } from "@/lib/pdf-text";
import { generateNextReference } from "@/lib/reference-generator";

export type GenerateIaState = { error?: string };

async function textFromInput(
  textValue: FormDataEntryValue | null,
  fileValue: FormDataEntryValue | null
): Promise<string> {
  const text = String(textValue ?? "").trim();
  if (text) return text;

  if (fileValue instanceof File && fileValue.size > 0) {
    const buffer = Buffer.from(await fileValue.arrayBuffer());
    if (fileValue.type === "application/pdf" || fileValue.name.toLowerCase().endsWith(".pdf")) {
      return (await extractPdfText(buffer)).trim();
    }
    return buffer.toString("utf-8").trim();
  }

  return "";
}

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

async function findOrCreateByLabel(
  delegate: {
    findMany: (args: {
      where: { active: boolean };
    }) => Promise<{ id: string; label: string }[]>;
    create: (args: {
      data: { label: string };
    }) => Promise<{ id: string; label: string }>;
  },
  labels: string[]
): Promise<Map<string, string>> {
  const existing = await delegate.findMany({ where: { active: true } });
  const byLower = new Map(existing.map((e) => [e.label.toLowerCase(), e.id]));
  const result = new Map<string, string>();
  for (const label of labels) {
    const key = label.toLowerCase();
    let id = byLower.get(key);
    if (!id) {
      const created = await delegate.create({ data: { label } });
      id = created.id;
      byLower.set(key, id);
    }
    result.set(label, id);
  }
  return result;
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

  const businessManagerId =
    session.user.role === ROLES.ADMIN
      ? String(formData.get("businessManagerId") ?? session.user.id)
      : session.user.id;

  let cvText: string;
  let transcriptText: string;
  try {
    cvText = await textFromInput(formData.get("cvText"), formData.get("cvFile"));
    transcriptText = await textFromInput(
      formData.get("transcriptText"),
      formData.get("transcriptFile")
    );
  } catch {
    return { error: "Impossible de lire le fichier fourni (CV ou transcription)." };
  }

  if (!cvText || !transcriptText) {
    return {
      error:
        "Merci de fournir à la fois le CV et la transcription d'entretien (texte collé ou fichier).",
    };
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
      transcriptText,
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
    return {
      error:
        "La génération par IA a échoué (service indisponible ou réponse invalide). Réessayez, ou créez le dossier manuellement.",
    };
  }

  const seniorityId = seniorites.find((s) => s.label === generated.seniorite)?.id ?? null;
  const secteurIds = secteurs
    .filter((s) => generated.secteurs.includes(s.label))
    .map((s) => s.id);
  const expertiseIds = expertises
    .filter((e) => generated.expertises.includes(e.label))
    .map((e) => e.id);
  const typeMobiliteIds = typesMobilite
    .filter((m) => generated.typesMobilite.includes(m.label))
    .map((m) => m.id);
  const zoneIds = zones
    .filter((z) => generated.zonesGeographiques.includes(z.label))
    .map((z) => z.id);

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
      disponibilite: generated.disponibilite,
      typeContrat: generated.typeContrat,
      rayonKm: generated.rayonKm,
      ouvertGrandDeplacement: generated.ouvertGrandDeplacement,
      villeRattachementZoneLarge: generated.villeRattachementZoneLarge,
      statutPublication: STATUT_PUBLICATION.BROUILLON,

      genereParIA: true,
      sourceCvTexte: cvText,
      sourceTranscriptTexte: transcriptText,

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

  redirect(`/admin/consultants/${consultant.id}?ia=1`);
}
