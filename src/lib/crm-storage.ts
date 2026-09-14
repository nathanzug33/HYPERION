import { uploadObject, readObject, deleteObject, generateStoredName } from "@/lib/object-storage";

// Stockage des pièces jointes commerciales (devis, propositions,
// contrats…) attachées à une action de suivi CRM (SuiviCommercial). Même
// principe que src/lib/cv-storage.ts : jamais servi depuis /public,
// uniquement via la route de téléchargement protégée (auth + contrôle
// d'accès à l'entreprise), voir src/app/admin/crm/[id]/fichiers/[suiviId]/route.ts.
//
// Stocké dans Supabase Storage (bucket privé "hyperion-storage", dossier
// "crm/") — voir src/lib/object-storage.ts.

const FOLDER = "crm";

const EXTENSION_MIME: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function extensionOf(filename: string): string | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext && ext in EXTENSION_MIME ? ext : null;
}

function isValidStoredName(name: string): boolean {
  return /^[a-zA-Z0-9_-]+\.(pdf|doc|docx|xls|xlsx)$/.test(name);
}

export function mimeTypeFor(storedName: string): string {
  const ext = extensionOf(storedName);
  return (ext && EXTENSION_MIME[ext]) || "application/octet-stream";
}

/** Enregistre la pièce jointe. Retourne le nom stocké (à conserver dans
 * SuiviCommercial.fichierUrl) ou null si le format n'est pas supporté. */
export async function saveCrmFile(
  file: File
): Promise<{ storedName: string; originalName: string } | null> {
  const ext = extensionOf(file.name);
  if (!ext) return null;

  const storedName = generateStoredName(ext);
  const buffer = Buffer.from(await file.arrayBuffer());
  await uploadObject(FOLDER, storedName, buffer);

  return { storedName, originalName: file.name };
}

export async function readCrmFile(storedName: string): Promise<Buffer | null> {
  if (!isValidStoredName(storedName)) return null;
  return readObject(FOLDER, storedName);
}

export async function deleteCrmFile(storedName: string | null): Promise<void> {
  if (!storedName || !isValidStoredName(storedName)) return;
  await deleteObject(FOLDER, storedName);
}
