import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

export function isAiGenerationConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export type ReferentialVocab = {
  secteurs: string[];
  expertises: string[];
  seniorites: string[];
  typesMobilite: string[];
  zones: string[];
  langues: string[];
};

function enumOrString(values: string[]) {
  return values.length > 0
    ? z.enum(values as [string, ...string[]])
    : z.string();
}

function buildSchema(vocab: ReferentialVocab) {
  return z.object({
    // --- Champs internes (nominatifs), pour gagner du temps de saisie -------
    nom: z.string().nullable().describe("Nom de famille du candidat, tel que trouvé sur le CV"),
    prenom: z.string().nullable().describe("Prénom du candidat, tel que trouvé sur le CV"),
    email: z.string().nullable(),
    telephone: z.string().nullable(),

    // --- Champs exposables (projection anonymisée) --------------------------
    intitulePoste: z.string().describe("Intitulé de poste / spécialité, ex. 'Ingénieur DevOps'"),
    seniorite: enumOrString(vocab.seniorites).describe(
      "Choisir la valeur la plus proche parmi le référentiel fourni"
    ),
    anneesExperienceMin: z.number().int().min(0),
    anneesExperienceMax: z.number().int().min(0),
    secteurs: z.array(enumOrString(vocab.secteurs)).describe(
      "Secteurs pertinents, uniquement parmi le référentiel fourni"
    ),
    expertises: z.array(enumOrString(vocab.expertises)).describe(
      "Expertises / domaines, uniquement parmi le référentiel fourni"
    ),
    competencesTechnologies: z
      .array(z.string())
      .describe("Étiquettes libres : stack, outils, certifications (ex. AWS, Python, ISTQB)"),
    competencesCles: z
      .array(z.string())
      .max(3)
      .describe("Jusqu'à 3 compétences à mettre en avant dans l'en-tête, sous-ensemble de competencesTechnologies"),
    typesMobilite: z.array(enumOrString(vocab.typesMobilite)).describe(
      "Uniquement parmi le référentiel fourni"
    ),
    zonesGeographiques: z.array(enumOrString(vocab.zones)).describe(
      "Uniquement parmi le référentiel fourni"
    ),
    rayonKm: z.number().int().nullable(),
    ouvertGrandDeplacement: z.boolean(),
    villeRattachementZoneLarge: z
      .string()
      .nullable()
      .describe("Zone large uniquement (ex. région), jamais une adresse précise"),
    disponibilite: z.enum(["IMMEDIATE", "SOUS_1_MOIS", "SOUS_2_MOIS", "SUR_PREAVIS"]),
    typeContrat: z.enum(["REGIE", "FORFAIT", "TEMPS_PARTAGE"]).nullable(),
    resumeContexte: z
      .string()
      .describe("Résumé de 4 à 6 lignes, générique, sans aucune information identifiante"),

    langues: z.array(
      z.object({
        label: z.string(),
        niveau: z.number().int().min(1).max(5).describe("1=notions à 5=expert"),
        detail: z.string().nullable().describe("ex. 'Langue maternelle', 'TOEIC 850'"),
      })
    ),

    competenceCategories: z
      .array(
        z.object({
          categorie: z.enum([
            "DOMAINES",
            "LOGICIELS_OUTILS",
            "METHODES_NORMES",
            "SECTEURS",
            "MANAGEMENT",
          ]),
          contenu: z.string(),
          niveau: z.number().int().min(1).max(5),
        })
      )
      .describe("Une entrée par catégorie parmi les 5 (ne pas dupliquer une catégorie)"),

    formations: z.array(
      z.object({
        type: z.enum(["FORMATION", "CERTIFICATION"]),
        annee: z.string(),
        intitule: z.string(),
        etablissement: z.string().nullable(),
      })
    ),

    experiences: z
      .array(
        z.object({
          entreprise: z
            .string()
            .describe("Nom générique si NDA/confidentiel, ex. 'Entreprise cliente — secteur X'"),
          secteurActivite: z.string().nullable(),
          missionTitre: z.string(),
          dateDebut: z.string().nullable().describe("Format AAAA-MM"),
          dateFin: z.string().nullable().describe("Format AAAA-MM, null si mission en cours"),
          contexteObjectif: z.string().nullable(),
          realisations: z.array(z.string()).describe("2 à 4 réalisations, action + résultat mesurable si possible"),
          environnementTechnique: z.string().nullable(),
        })
      )
      .describe("De la plus récente à la plus ancienne"),
  });
}

export type GeneratedDC = z.infer<ReturnType<typeof buildSchema>>;

const SYSTEM_PROMPT = `Tu es l'assistant interne d'HYPERION Group, société de conseil en ingénierie IT et industrie qui place des consultants en régie.
Ta tâche : à partir d'un CV (ou d'un dossier de compétences existant, éventuellement dans un autre format que celui d'HYPERION) et, si elle est fournie, d'une transcription d'entretien de recrutement, générer un dossier de compétences (DC) structuré, prêt à être relu et publié par un business manager dans une bibliothèque de profils anonymisés.

Règles impératives :
- N'invente aucune information. Si une donnée n'est pas déductible des documents fournis, laisse le champ vide (null ou tableau vide) plutôt que d'halluciner.
- Aucune transcription d'entretien n'est fournie ? Base-toi uniquement sur le CV/dossier existant ; c'est une situation normale (candidat déjà rencontré, dossier reçu tel quel).
- Le résumé de contexte et les expériences détaillées ne doivent contenir AUCUNE information identifiante (pas de nom de personne, pas de nom d'entreprise cliente réel si un NDA est mentionné — utilise alors une formulation générique comme "Entreprise cliente du secteur X").
- Pour les champs contraints par un référentiel (secteurs, expertises, séniorité, mobilité, zones), choisis uniquement parmi les valeurs fournies dans le référentiel — n'en invente pas de nouvelles.
- La séniorité et le niveau des compétences/langues doivent être cohérents avec les années d'expérience et les informations disponibles.
- Sois factuel et concis, dans un français professionnel.`;

function describeAnthropicError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) {
    return "Clé ANTHROPIC_API_KEY invalide ou refusée. Vérifiez la valeur dans .env et relancez le serveur.";
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return "Accès refusé par l'API Anthropic (permissions/organisation). Vérifiez votre compte Anthropic.";
  }
  if (err instanceof Anthropic.RateLimitError) {
    return "Limite de requêtes Anthropic atteinte. Réessayez dans quelques instants.";
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return "Impossible de joindre l'API Anthropic (réseau). Vérifiez votre connexion internet.";
  }
  if (err instanceof Anthropic.APIError) {
    return `Erreur API Anthropic (${err.status ?? "?"}) : ${err.message}`;
  }
  if (err instanceof Error) return err.message;
  return "Erreur inconnue.";
}

export async function generateDCFromCvAndTranscript(params: {
  cvText: string;
  transcriptText: string | null;
  vocab: ReferentialVocab;
}): Promise<GeneratedDC> {
  const client = new Anthropic();
  const schema = buildSchema(params.vocab);

  const vocabBlock = `Référentiels disponibles (n'utilise que ces valeurs pour les champs concernés) :
- Secteurs : ${params.vocab.secteurs.join(", ") || "(aucun configuré)"}
- Expertises : ${params.vocab.expertises.join(", ") || "(aucun configuré)"}
- Séniorités : ${params.vocab.seniorites.join(", ") || "(aucun configuré)"}
- Types de mobilité : ${params.vocab.typesMobilite.join(", ") || "(aucun configuré)"}
- Zones géographiques : ${params.vocab.zones.join(", ") || "(aucun configuré)"}`;

  const transcriptBlock = params.transcriptText
    ? `=== TRANSCRIPTION D'ENTRETIEN ===\n${params.transcriptText}`
    : "=== TRANSCRIPTION D'ENTRETIEN ===\n(non fournie — base-toi uniquement sur le CV/dossier ci-dessus)";

  let response;
  try {
    response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "high", format: zodOutputFormat(schema) },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `${vocabBlock}

=== CV / DOSSIER EXISTANT ===
${params.cvText}

${transcriptBlock}`,
        },
      ],
    });
  } catch (err) {
    throw new Error(describeAnthropicError(err));
  }

  if (!response.parsed_output) {
    throw new Error(
      "La génération n'a pas produit de résultat structuré exploitable. Réessayez, ou complétez le dossier manuellement."
    );
  }

  return response.parsed_output;
}
