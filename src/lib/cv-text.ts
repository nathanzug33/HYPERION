import { extractPdfText } from "@/lib/pdf-text";
import { extractDocxText } from "@/lib/docx-text";
import { extractDocText } from "@/lib/doc-text";

// Postgres refuse tout octet NUL (0x00) dans une colonne texte ("invalid
// byte sequence for encoding UTF8: 0x00"), quelle que soit la colonne visée
// — l'insertion entière échoue. Un fichier .doc (format binaire legacy) ou
// un PDF mal encodé peuvent en laisser passer lors de l'extraction, ce
// n'est jamais du contenu voulu. On retire aussi les autres caractères de
// contrôle C0 (hors tabulation/saut de ligne/retour chariot, légitimes
// dans un texte) par la même occasion : même nature de bruit d'extraction.
function sanitizeExtractedText(text: string): string {
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

/** Extrait le texte d'un buffer déjà en mémoire (pdf, doc, docx, texte brut)
 * — utilisé aussi bien pour un fichier tout juste déposé que pour une pièce
 * jointe déjà stockée (voir ConsultantFichier), à partir de son seul nom. */
export async function extractTextFromBuffer(buffer: Buffer, filename: string): Promise<string> {
  const name = filename.toLowerCase();

  if (name.endsWith(".pdf")) {
    return sanitizeExtractedText(await extractPdfText(buffer)).trim();
  }
  if (name.endsWith(".docx")) {
    return sanitizeExtractedText(await extractDocxText(buffer)).trim();
  }
  if (name.endsWith(".doc")) {
    return sanitizeExtractedText(await extractDocText(buffer)).trim();
  }
  return sanitizeExtractedText(buffer.toString("utf-8")).trim();
}

/** Extrait le texte d'un fichier CV/transcription (pdf, doc, docx, texte
 * brut) pour la génération IA et l'indexation en recherche. */
export async function extractFileText(
  fileValue: FormDataEntryValue | null
): Promise<string> {
  if (!(fileValue instanceof File) || fileValue.size === 0) return "";
  const buffer = Buffer.from(await fileValue.arrayBuffer());
  return extractTextFromBuffer(buffer, fileValue.name);
}
