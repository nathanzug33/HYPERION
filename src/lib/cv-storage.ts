import { uploadObject, readObject, deleteObject, generateStoredName } from "@/lib/object-storage";

// Stockage du fichier CV original (PDF/Word), séparé du texte extrait
// (Consultant.sourceCvTexte, utilisé par la génération IA). Jamais servi
// depuis /public : uniquement via la route de téléchargement protégée
// (auth + contrôle d'accès au dossier), voir
// src/app/admin/consultants/[id]/cv/route.ts.
//
// Stocké dans Supabase Storage (bucket privé "hyperion-storage", dossier
// "cv/") — voir src/lib/object-storage.ts.

const FOLDER = "cv";

const EXTENSION_MIME: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function extensionOf(filename: string): string | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext && ext in EXTENSION_MIME ? ext : null;
}

/** Nom de fichier stocké : uniquement des caractères sûrs, jamais dérivé du
 * nom original (évite toute traversée de chemin / fuite d'information). */
function isValidStoredName(name: string): boolean {
  return /^[a-zA-Z0-9_-]+\.(pdf|doc|docx)$/.test(name);
}

export function mimeTypeFor(storedName: string): string {
  const ext = extensionOf(storedName);
  return (ext && EXTENSION_MIME[ext]) || "application/octet-stream";
}

/** Enregistre le fichier CV. Retourne le nom stocké (à conserver dans
 * Consultant.cvFileUrl) ou null si le format n'est pas supporté. */
export async function saveCvFile(
  file: File
): Promise<{ storedName: string; originalName: string } | null> {
  const ext = extensionOf(file.name);
  if (!ext) return null;

  const storedName = generateStoredName(ext);
  const buffer = Buffer.from(await file.arrayBuffer());
  await uploadObject(FOLDER, storedName, buffer);

  return { storedName, originalName: file.name };
}

export async function readCvFile(storedName: string): Promise<Buffer | null> {
  if (!isValidStoredName(storedName)) return null;
  return readObject(FOLDER, storedName);
}

export async function deleteCvFile(storedName: string | null): Promise<void> {
  if (!storedName || !isValidStoredName(storedName)) return;
  await deleteObject(FOLDER, storedName);
}
