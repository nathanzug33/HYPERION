// Import dynamique (pas en tête de fichier) : pdf-parse ne doit être chargé
// qu'au moment réel d'extraire un PDF, jamais au chargement du module. En
// import statique, n'importe quelle Server Action du même fichier (y
// compris sans rapport avec les CV, ex. suppression d'un dossier) échouait
// au chargement sur Vercel avec "ReferenceError: DOMMatrix is not defined"
// — une dépendance de pdf-parse référence une API navigateur dès son
// évaluation, incompatible avec l'environnement serverless.
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  let parser: InstanceType<typeof PDFParse>;
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
