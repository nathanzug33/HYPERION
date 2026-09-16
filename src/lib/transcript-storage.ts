import { uploadObject, readObject, deleteObject, generateStoredName } from "@/lib/object-storage";

// Stockage des transcripts d'entretien — déposés après chaque entretien,
// utilisés (avec un CV) comme source pour "Générer un DC via IA". Soit un
// vrai fichier (PDF/Word/texte), soit des notes tapées directement dans le
// formulaire (converties en .txt pour rester dans le même format de pièce
// jointe que le reste). Même principe que cv-storage.ts (bucket privé,
// jamais servi directement).

const FOLDER = "transcript";

const EXTENSION_MIME: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
};

function extensionOf(filename: string): string | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext && ext in EXTENSION_MIME ? ext : null;
}

function isValidStoredName(name: string): boolean {
  return /^[a-zA-Z0-9_-]+\.(pdf|doc|docx|txt)$/.test(name);
}

export function mimeTypeForTranscript(storedName: string): string {
  const ext = extensionOf(storedName);
  return (ext && EXTENSION_MIME[ext]) || "application/octet-stream";
}

/** Enregistre un fichier de transcript déposé (PDF/Word/texte). Retourne
 * null si le format n'est pas supporté. */
export async function saveTranscriptFile(
  file: File
): Promise<{ storedName: string; originalName: string } | null> {
  const ext = extensionOf(file.name);
  if (!ext) return null;

  const storedName = generateStoredName(ext);
  const buffer = Buffer.from(await file.arrayBuffer());
  await uploadObject(FOLDER, storedName, buffer);

  return { storedName, originalName: file.name };
}

/** Enregistre des notes d'entretien tapées directement (pas de fichier
 * déposé) — converties en .txt pour apparaître comme n'importe quelle autre
 * pièce jointe (aperçu/téléchargement identiques). */
export async function saveTranscriptText(
  text: string,
  label: string
): Promise<{ storedName: string; originalName: string }> {
  const storedName = generateStoredName("txt");
  await uploadObject(FOLDER, storedName, Buffer.from(text, "utf-8"));
  return { storedName, originalName: `${label}.txt` };
}

export async function readTranscriptFile(storedName: string): Promise<Buffer | null> {
  if (!isValidStoredName(storedName)) return null;
  return readObject(FOLDER, storedName);
}

export async function deleteTranscriptFile(storedName: string | null): Promise<void> {
  if (!storedName || !isValidStoredName(storedName)) return;
  await deleteObject(FOLDER, storedName);
}
