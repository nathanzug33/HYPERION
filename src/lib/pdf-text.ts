// Import dynamique (pas en tête de fichier) : pdf-parse ne doit être chargé
// qu'au moment réel d'extraire un PDF, jamais au chargement du module. En
// import statique, n'importe quelle Server Action du même fichier (y
// compris sans rapport avec les CV, ex. suppression d'un dossier) échouait
// au chargement sur Vercel avec "ReferenceError: DOMMatrix is not defined"
// — une dépendance de pdf-parse référence une API navigateur dès son
// évaluation, incompatible avec l'environnement serverless.
//
// Même en appelant pdf-parse uniquement au bon moment, l'erreur persiste en
// production (Vercel) : pdf-parse tente de fournir DOMMatrix lui-même via le
// binaire natif @napi-rs/canvas, qui échoue silencieusement à charger sur
// l'environnement serverless de Vercel (mismatch de plateforme). Comme on
// n'a besoin que d'extraire du texte (jamais de rendu image), on fournit
// nous-mêmes un DOMMatrix "shim" pur JS (aucun binaire natif, donc portable
// partout) avant d'importer pdf-parse — s'il en existe déjà un (le binaire
// natif a fonctionné), on ne le remplace pas.
async function ensureDOMMatrixPolyfill(): Promise<void> {
  if (typeof globalThis.DOMMatrix !== "undefined") return;
  const { default: CSSMatrix } = await import("@thednp/dommatrix");
  globalThis.DOMMatrix = CSSMatrix as unknown as typeof DOMMatrix;
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  await ensureDOMMatrixPolyfill();
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
