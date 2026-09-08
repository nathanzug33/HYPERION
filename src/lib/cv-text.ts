import { extractPdfText } from "@/lib/pdf-text";
import { extractDocxText } from "@/lib/docx-text";
import { extractDocText } from "@/lib/doc-text";

/** Extrait le texte d'un fichier CV/transcription (pdf, doc, docx, texte
 * brut) pour la génération IA et l'indexation en recherche. */
export async function extractFileText(
  fileValue: FormDataEntryValue | null
): Promise<string> {
  if (!(fileValue instanceof File) || fileValue.size === 0) return "";

  const name = fileValue.name.toLowerCase();
  const buffer = Buffer.from(await fileValue.arrayBuffer());

  if (fileValue.type === "application/pdf" || name.endsWith(".pdf")) {
    return (await extractPdfText(buffer)).trim();
  }
  if (
    fileValue.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    return (await extractDocxText(buffer)).trim();
  }
  if (fileValue.type === "application/msword" || name.endsWith(".doc")) {
    return (await extractDocText(buffer)).trim();
  }
  return buffer.toString("utf-8").trim();
}
