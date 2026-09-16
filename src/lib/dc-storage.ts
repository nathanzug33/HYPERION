import { uploadObject, readObject, deleteObject, generateStoredName } from "@/lib/object-storage";

// Stockage des DC (Word) générés pour un candidat — un profil peut en
// accumuler plusieurs au fil des régénérations (tagging IA, mises à jour du
// dossier) : jamais écrasés, voir ConsultantFichier dans le schéma Prisma.
// Même principe que cv-storage.ts (bucket privé, jamais servi directement).

const FOLDER = "dc";
const MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function isValidStoredName(name: string): boolean {
  return /^[a-zA-Z0-9_-]+\.docx$/.test(name);
}

export function mimeTypeForDc(): string {
  return MIME_TYPE;
}

/** Enregistre un DC généré. Retourne le nom stocké (à conserver dans
 * ConsultantFichier.storedName). */
export async function saveDcFile(
  buffer: Buffer,
  originalName: string
): Promise<{ storedName: string; originalName: string }> {
  const storedName = generateStoredName("docx");
  await uploadObject(FOLDER, storedName, buffer);
  return { storedName, originalName };
}

export async function readDcFile(storedName: string): Promise<Buffer | null> {
  if (!isValidStoredName(storedName)) return null;
  return readObject(FOLDER, storedName);
}

export async function deleteDcFile(storedName: string | null): Promise<void> {
  if (!storedName || !isValidStoredName(storedName)) return;
  await deleteObject(FOLDER, storedName);
}
