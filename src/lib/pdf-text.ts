// Import dynamique (pas en tête de fichier) : pdfjs-dist ne doit être
// chargé qu'au moment réel d'extraire un PDF, jamais au chargement du
// module — voir l'historique de ce fichier pour le détail des problèmes
// que l'import statique causait sur Vercel.
//
// On utilise pdfjs-dist DIRECTEMENT (plutôt que pdf-parse) : pdf-parse
// embarque un module de rendu image qui exige le binaire natif
// @napi-rs/canvas (et la globale navigateur DOMMatrix qu'il fournit),
// lequel échoue à charger sur l'environnement serverless de Vercel selon
// les CV (présence d'une image/photo dans le PDF) — d'où des échecs
// intermittents ("DOMMatrix is not defined", puis, après un premier
// correctif partiel, "fichier illisible"). Or l'extraction de texte pur
// n'a jamais besoin de rendu/canvas : en appelant nous-mêmes
// getTextContent() par page (sans jamais appeler page.render()), on
// élimine complètement cette dépendance et la classe de bugs qui va avec.
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  let doc;
  try {
    doc = await pdfjs.getDocument({
      data: new Uint8Array(buffer),
      isEvalSupported: false,
      disableFontFace: true,
      useSystemFonts: false,
    }).promise;
  } catch (err) {
    console.error("[pdf-text] Échec d'ouverture du PDF :", err);
    throw new Error(
      "Ce fichier PDF est illisible (corrompu ou protégé par mot de passe)."
    );
  }

  try {
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      pages.push(
        content.items.map((item) => ("str" in item ? item.str : "")).join(" ")
      );
    }
    const text = pages.join("\n").trim();
    if (!text) {
      throw new Error(
        "Aucun texte n'a pu être extrait de ce PDF — c'est probablement un document scanné (image). Utilisez un PDF avec du texte sélectionnable, ou un fichier .docx/.txt."
      );
    }
    return text;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Aucun texte")) throw err;
    console.error("[pdf-text] Échec d'extraction du texte :", err);
    throw new Error(
      "Ce fichier PDF n'a pas pu être lu (corrompu ou protégé par mot de passe)."
    );
  } finally {
    await doc.destroy().catch(() => {});
  }
}
