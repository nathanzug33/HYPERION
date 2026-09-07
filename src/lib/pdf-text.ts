import { PDFParse } from "pdf-parse";

export async function extractPdfText(buffer: Buffer): Promise<string> {
  let parser: PDFParse;
  try {
    parser = new PDFParse({ data: buffer });
  } catch {
    throw new Error(
      "Ce fichier PDF est illisible (corrompu ou protégé par mot de passe)."
    );
  }
  try {
    const result = await parser.getText();
    const text = result.text.trim();
    if (!text) {
      throw new Error(
        "Aucun texte n'a pu être extrait de ce PDF — c'est probablement un document scanné (image). Utilisez un PDF avec du texte sélectionnable, ou un fichier .docx/.txt."
      );
    }
    return text;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Aucun texte")) throw err;
    throw new Error(
      "Ce fichier PDF n'a pas pu être lu (corrompu ou protégé par mot de passe)."
    );
  } finally {
    await parser.destroy().catch(() => {});
  }
}
