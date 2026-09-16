// Import dynamique (pas en tête de fichier) : pdfjs-dist ne doit être
// chargé qu'au moment réel d'extraire un PDF, jamais au chargement du
// module — voir l'historique de ce fichier pour le détail des problèmes
// que l'import statique causait sur Vercel.
//
// On utilise pdfjs-dist DIRECTEMENT (plutôt que pdf-parse) : pdf-parse
// embarque un module de rendu image qui exige le binaire natif
// @napi-rs/canvas (et la globale navigateur DOMMatrix qu'il fournit),
// lequel échoue à charger sur l'environnement serverless de Vercel selon
// les CV (présence d'une image/photo dans le PDF). Or l'extraction de
// texte pur n'a jamais besoin de rendu/canvas : en appelant nous-mêmes
// getTextContent() par page (sans jamais appeler page.render()), on évite
// tout le code de rendu qui en dépend.
//
// Reste un problème : pdfjs-dist lui-même référence, dès l'IMPORT du module
// (pas seulement au rendu), les globales navigateur DOMMatrix, ImageData et
// Path2D — il tente de se les fournir via ce même binaire natif
// @napi-rs/canvas, et se contente d'un avertissement s'il échoue plutôt que
// de fournir un vrai remplaçant, d'où des échecs au chargement puis pendant
// l'analyse du document. Comme on n'a besoin d'aucun vrai rendu (juste que
// le module s'importe et que le document s'ouvre sans planter), on fournit
// nous-mêmes ces trois globales via des shims purs JS (aucun binaire natif,
// donc portables partout) AVANT d'importer pdfjs-dist — si l'une existe déjà
// (le binaire natif a fonctionné pour elle), on ne la remplace pas.
class ImageDataPolyfill {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  colorSpace = "srgb";
  constructor(dataOrWidth: Uint8ClampedArray | number, widthOrHeight: number, height?: number) {
    if (dataOrWidth instanceof Uint8ClampedArray) {
      this.data = dataOrWidth;
      this.width = widthOrHeight;
      this.height = height!;
    } else {
      this.width = dataOrWidth;
      this.height = widthOrHeight;
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
    }
  }
}

async function ensureBrowserGlobalsPolyfill(): Promise<void> {
  if (typeof globalThis.DOMMatrix === "undefined") {
    const { default: CSSMatrix } = await import("@thednp/dommatrix");
    globalThis.DOMMatrix = CSSMatrix as unknown as typeof DOMMatrix;
  }
  if (typeof globalThis.ImageData === "undefined") {
    globalThis.ImageData = ImageDataPolyfill as unknown as typeof ImageData;
  }
  if (typeof globalThis.Path2D === "undefined") {
    const { Path2D: Path2DPolyfill } = await import("path2d");
    globalThis.Path2D = Path2DPolyfill as unknown as typeof Path2D;
  }
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  await ensureBrowserGlobalsPolyfill();
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
