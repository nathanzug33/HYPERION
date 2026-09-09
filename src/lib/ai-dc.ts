import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export function isAiGenerationConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export type ReferentialVocab = {
  secteurs: string[];
  expertises: string[];
  typesMobilite: string[];
  zones: string[];
  langues: string[];
};

// Remarque : on ne force plus le format de sortie via output_config.format
// (sortie structurée / "strict tool"). Avec un schéma aussi riche
// (plusieurs tableaux d'objets imbriqués), l'API refusait la requête avec
// "The compiled grammar is too large" — un plafond de complexité du côté du
// décodage contraint, indépendant du nombre de valeurs de référentiel.
// À la place : on demande un JSON via le prompt (le schéma JSON généré à
// partir de ce même schéma Zod sert de spécification dans le prompt), puis
// on parse et on valide la réponse avec ce schéma Zod côté serveur.
const schema = z.object({
  // --- Champs internes (nominatifs), pour gagner du temps de saisie -------
  nom: z.string().nullable().describe("Nom de famille du candidat, tel que trouvé sur le CV"),
  prenom: z.string().nullable().describe("Prénom du candidat, tel que trouvé sur le CV"),
  email: z.string().nullable(),
  telephone: z.string().nullable(),

  // --- Champs exposables (projection anonymisée) --------------------------
  intitulePoste: z.string().describe("Intitulé de poste / spécialité, ex. 'Ingénieur DevOps'"),
  anneesExperience: z
    .number()
    .int()
    .min(0)
    .describe("Nombre d'années d'expérience professionnelle, déduit du parcours (la séniorité en est dérivée automatiquement, pas besoin de la deviner)"),
  secteurs: z.array(z.string()).describe("Valeurs EXACTES parmi le référentiel « Secteurs » fourni"),
  expertises: z.array(z.string()).describe("Valeurs EXACTES parmi le référentiel « Expertises » fourni"),
  competencesTechnologies: z
    .array(z.string())
    .describe("Étiquettes libres : stack, outils, certifications (ex. AWS, Python, ISTQB)"),
  competencesCles: z
    .array(z.string())
    .max(3)
    .describe("Jusqu'à 3 compétences à mettre en avant dans l'en-tête, sous-ensemble de competencesTechnologies"),
  typesMobilite: z
    .array(z.string())
    .describe("Valeurs EXACTES parmi le référentiel « Types de mobilité » fourni"),
  zonesGeographiques: z
    .array(z.string())
    .describe("Valeurs EXACTES parmi le référentiel « Zones géographiques » fourni"),
  rayonKm: z.number().int().nullable(),
  ouvertGrandDeplacement: z.boolean(),
  villeRattachement: z
    .string()
    .nullable()
    .describe(
      "Ville de rattachement du consultant (ex. 'Lyon'), telle que trouvée sur le CV/transcript — jamais une adresse précise (pas de rue ni de numéro)"
    ),
  disponibilite: z.enum(["IMMEDIATE", "SOUS_1_MOIS", "SOUS_2_MOIS", "SUR_PREAVIS"]),
  typeContrat: z.enum(["REGIE", "FORFAIT", "TEMPS_PARTAGE"]).nullable(),
  resumeContexte: z
    .string()
    .describe("Résumé de 4 à 6 lignes, générique, sans aucune information identifiante"),
  presentationCourte: z
    .string()
    .describe(
      "Résumé très court (2 à 3 phrases maximum), accrocheur, pour une carte de présentation dans une bibliothèque de profils — sans aucune information identifiante, distinct de resumeContexte (plus détaillé)"
    ),

  langues: z
    .array(
      z.object({
        label: z.string(),
        niveau: z.number().int().min(1).max(5).describe("1=notions à 5=expert"),
        detail: z.string().nullable().describe("ex. 'Langue maternelle', 'TOEIC 850'"),
      })
    )
    .describe(
      "Exactement une entrée par langue réellement mentionnée dans les documents — ni plus (n'invente pas de langue), ni moins (n'en omets aucune). Peut être 1 seule langue ou plus de 5 : aucune limite fixe, le gabarit s'adapte au nombre réel."
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

  formations: z
    .array(
      z.object({
        type: z.enum(["FORMATION", "CERTIFICATION"]),
        annee: z.string(),
        intitule: z.string(),
        etablissement: z.string().nullable(),
      })
    )
    .describe(
      "Exactement une entrée par formation/certification réellement mentionnée — ni plus, ni moins. Peut être vide, 1 seule, ou plus de 5 : aucune limite fixe, le gabarit s'adapte au nombre réel."
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
    .describe(
      "Exactement une entrée par expérience/mission réellement présente dans les documents — de la plus récente à la plus ancienne. Un junior avec une seule mission n'a qu'UNE entrée, un profil senior peut en avoir 6, 8 ou plus : aucune limite fixe ni minimum, le gabarit se duplique automatiquement pour s'adapter au nombre réel. N'ajoute jamais d'expérience fictive pour 'compléter' un dossier."
    ),
});

export type GeneratedDC = z.infer<typeof schema>;

function buildSystemPrompt(): string {
  const jsonSchema = JSON.stringify(z.toJSONSchema(schema), null, 2);

  return `Tu es l'assistant interne d'HYPERION Group, société de conseil en ingénierie IT et industrie qui place des consultants en régie.
Ta tâche : à partir d'un CV (ou d'un dossier de compétences existant, éventuellement dans un autre format que celui d'HYPERION) et, si elle est fournie, d'une transcription d'entretien de recrutement, générer un dossier de compétences (DC) structuré, prêt à être relu et publié par un business manager dans une bibliothèque de profils anonymisés.

Règles impératives :
- N'invente aucune information. Si une donnée n'est pas déductible des documents fournis, laisse le champ vide (null ou tableau vide) plutôt que d'halluciner.
- Aucune transcription d'entretien n'est fournie ? Base-toi uniquement sur le CV/dossier existant ; c'est une situation normale (candidat déjà rencontré, dossier reçu tel quel).
- Le résumé de contexte, la présentation courte et les expériences détaillées ne doivent contenir AUCUNE information identifiante (pas de nom de personne, pas de nom d'entreprise cliente réel si un NDA est mentionné — utilise alors une formulation générique comme "Entreprise cliente du secteur X").
- Pour les champs contraints par un référentiel (secteurs, expertises, mobilité, zones), choisis EXCLUSIVEMENT parmi les valeurs listées dans les référentiels fournis dans le message utilisateur — n'en invente pas de nouvelles, respecte l'orthographe exacte.
- Le niveau des compétences/langues doit être cohérent avec les années d'expérience et les informations disponibles.
- Sois factuel et concis, dans un français professionnel.
- Le gabarit HYPERION s'adapte automatiquement au nombre réel d'entrées : ne complète JAMAIS les listes (langues, formations, expériences) pour atteindre un nombre "rond", et ne tronque JAMAIS une liste pour rester sous une limite — restitue exactement ce qui est présent dans les documents fournis, qu'il y en ait 1 ou 10. Un candidat junior avec une seule expérience et une seule langue est un cas normal et attendu ; ne pas inventer d'entrées supplémentaires pour "remplir" le dossier.

Réponds UNIQUEMENT avec un objet JSON valide respectant exactement ce schéma JSON Schema (aucun texte avant/après, aucun bloc de code markdown, pas de commentaire) :

${jsonSchema}`;
}

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
  if (err instanceof Anthropic.BadRequestError && err.message.includes("workspace")) {
    return "Cette clé API Anthropic est une clé d'organisation non rattachée à un workspace. Solution la plus simple : créez une clé API scopée à un workspace dans la Console Anthropic. Alternative : renseignez ANTHROPIC_WORKSPACE_ID dans .env avec l'identifiant du workspace à utiliser.";
  }
  if (err instanceof Anthropic.APIError) {
    return `Erreur API Anthropic (${err.status ?? "?"}) : ${err.message}`;
  }
  if (err instanceof Error) return err.message;
  return "Erreur inconnue.";
}

function extractJsonObject(text: string): unknown {
  // Retire un éventuel bloc de code markdown (```json ... ``` ou ``` ... ```)
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const candidate = fenced ? fenced[1] : text;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("La réponse de l'IA ne contient pas de JSON exploitable.");
  }

  return JSON.parse(candidate.slice(start, end + 1));
}

export async function generateDCFromCvAndTranscript(params: {
  cvText: string;
  transcriptText: string | null;
  vocab: ReferentialVocab;
}): Promise<GeneratedDC> {
  // Nécessaire si la clé API est une clé d'organisation non rattachée à un
  // workspace précis (l'API renvoie alors une 400 demandant cet en-tête).
  // Non requis pour une clé déjà scopée à un workspace.
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;
  const client = new Anthropic(
    workspaceId
      ? { defaultHeaders: { "anthropic-workspace-id": workspaceId } }
      : undefined
  );

  const vocabBlock = `Référentiels disponibles (n'utilise que ces valeurs pour les champs concernés) :
- Secteurs : ${params.vocab.secteurs.join(", ") || "(aucun configuré)"}
- Expertises : ${params.vocab.expertises.join(", ") || "(aucun configuré)"}
- Types de mobilité : ${params.vocab.typesMobilite.join(", ") || "(aucun configuré)"}
- Zones géographiques : ${params.vocab.zones.join(", ") || "(aucun configuré)"}`;

  const transcriptBlock = params.transcriptText
    ? `=== TRANSCRIPTION D'ENTRETIEN ===\n${params.transcriptText}`
    : "=== TRANSCRIPTION D'ENTRETIEN ===\n(non fournie — base-toi uniquement sur le CV/dossier ci-dessus)";

  let responseText: string;
  try {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
      system: buildSystemPrompt(),
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
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("La génération n'a produit aucun texte exploitable.");
    }
    responseText = textBlock.text;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("La génération")) throw err;
    throw new Error(describeAnthropicError(err));
  }

  let parsedJson: unknown;
  try {
    parsedJson = extractJsonObject(responseText);
  } catch {
    throw new Error(
      "La réponse de l'IA n'était pas un JSON valide. Réessayez, ou complétez le dossier manuellement."
    );
  }

  const result = schema.safeParse(parsedJson);
  if (!result.success) {
    console.error("[generation-ia] JSON reçu ne respecte pas le schéma", result.error.issues);
    throw new Error(
      "La réponse de l'IA ne correspondait pas au format attendu. Réessayez, ou complétez le dossier manuellement."
    );
  }

  return result.data;
}
