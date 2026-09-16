import { extractPdfText } from "@/lib/pdf-text";
import { extractDocxText } from "@/lib/docx-text";
import { extractDocText } from "@/lib/doc-text";

/** Extrait le texte d'un buffer déjà en mémoire (pdf, doc, docx, texte brut)
 * — utilisé aussi bien pour un fichier tout juste déposé que pour une pièce
 * jointe déjà stockée (voir ConsultantFichier), à partir de son seul nom. */
export async function extractTextFromBuffer(buffer: Buffer, filename: string): Promise<string> {
  const name = filename.toLowerCase();

  if (name.endsWith(".pdf")) {
    return (await extractPdfText(buffer)).trim();
  }
  if (name.endsWith(".docx")) {
    return (await extractDocxText(buffer)).trim();
  }
  if (name.endsWith(".doc")) {
    return (await extractDocText(buffer)).trim();
  }
  return buffer.toString("utf-8").trim();
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
