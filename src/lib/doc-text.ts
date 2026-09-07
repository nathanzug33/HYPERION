import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { extractDocxText } from "./docx-text";

const execFileAsync = promisify(execFile);

// Les .doc (ancien format binaire Word) n'ont pas de parseur JS fiable :
// on passe par LibreOffice (s'il est installé) pour convertir en .docx,
// puis on réutilise l'extraction docx habituelle.
export async function extractDocText(buffer: Buffer): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "hyperion-doc-"));
  const inputPath = path.join(dir, "input.doc");
  try {
    await writeFile(inputPath, buffer);
    await execFileAsync(
      "soffice",
      ["--headless", "--convert-to", "docx", "--outdir", dir, inputPath],
      { timeout: 60000 }
    );
    const docxBuffer = await readFile(path.join(dir, "input.docx"));
    return await extractDocxText(docxBuffer);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") {
      throw new Error(
        "Les fichiers .doc (ancien format Word) nécessitent LibreOffice sur ce serveur. Installez-le (macOS : « brew install --cask libreoffice ») puis relancez le serveur, ou enregistrez le fichier en .docx/.pdf avant de le déposer."
      );
    }
    throw new Error(
      "Impossible de convertir ce fichier .doc. Essayez de l'enregistrer en .docx ou .pdf."
    );
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
