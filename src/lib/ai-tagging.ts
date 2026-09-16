import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { describeAnthropicError, extractJsonObject } from "@/lib/ai-dc";

// Tagging IA "étroit" (§ distinct de la génération complète du DC, voir
// ai-dc.ts) : ne lit qu'un CV/dossier existant pour proposer secteurs,
// expertises et compétences — jamais l'identité, le résumé, la mobilité, les
// langues, formations ou expériences (ça, c'est "Générer un DC via IA").

const tagSchema = z.object({
  secteurs: z.array(z.string()).describe("Valeurs EXACTES parmi le référentiel « Secteurs » fourni"),
  expertises: z.array(z.string()).describe("Valeurs EXACTES parmi le référentiel « Expertises » fourni"),
  competencesTechnologies: z
    .array(z.string())
    .describe("Étiquettes libres : stack, outils, certifications (ex. AWS, Python, ISTQB)"),
  competencesCles: z
    .array(z.string())
    .max(3)
    .describe("Jusqu'à 3 compétences à mettre en avant dans l'en-tête, sous-ensemble de competencesTechnologies"),
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
});

export type GeneratedTags = z.infer<typeof tagSchema>;

function buildSystemPrompt(): string {
  const jsonSchema = JSON.stringify(z.toJSONSchema(tagSchema), null, 2);

  return `Tu es l'assistant interne d'HYPERION Group, société de conseil en ingénierie IT et industrie qui place des consultants en régie.
Ta tâche : à partir d'un CV (ou d'un dossier de compétences existant), identifier UNIQUEMENT les secteurs, expertises et compétences du candidat — pas son identité, son résumé, sa mobilité, ses langues, ses formations ni ses expériences détaillées, qui ne font pas partie de ce tagging.

Règles impératives :
- N'invente aucune information. Si une donnée n'est pas déductible du document fourni, laisse le champ vide (tableau vide) plutôt que d'halluciner.
- Pour les champs contraints par un référentiel (secteurs, expertises), choisis EXCLUSIVEMENT parmi les valeurs listées dans le référentiel fourni dans le message utilisateur — n'en invente pas de nouvelles, respecte l'orthographe exacte.
- Le niveau des compétences doit être cohérent avec le parcours décrit.
- Sois factuel et concis.

Réponds UNIQUEMENT avec un objet JSON valide respectant exactement ce schéma JSON Schema (aucun texte avant/après, aucun bloc de code markdown, pas de commentaire) :

${jsonSchema}`;
}

export async function generateTagsFromCv(params: {
  cvText: string;
  vocab: { secteurs: string[]; expertises: string[] };
}): Promise<GeneratedTags> {
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;
  const client = new Anthropic(
    workspaceId ? { defaultHeaders: { "anthropic-workspace-id": workspaceId } } : undefined
  );

  const vocabBlock = `Référentiels disponibles (n'utilise que ces valeurs pour les champs concernés) :
- Secteurs : ${params.vocab.secteurs.join(", ") || "(aucun configuré)"}
- Expertises : ${params.vocab.expertises.join(", ") || "(aucun configuré)"}`;

  let responseText: string;
  try {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system: buildSystemPrompt(),
      messages: [
        {
          role: "user",
          content: `${vocabBlock}

=== CV / DOSSIER EXISTANT ===
${params.cvText}`,
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
      "La réponse de l'IA n'était pas un JSON valide. Réessayez, ou taguez manuellement."
    );
  }

  const result = tagSchema.safeParse(parsedJson);
  if (!result.success) {
    console.error("[ai-tagging] JSON reçu ne respecte pas le schéma", result.error.issues);
    throw new Error(
      "La réponse de l'IA ne correspondait pas au format attendu. Réessayez, ou taguez manuellement."
    );
  }

  return result.data;
}
