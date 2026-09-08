import { mkdir, writeFile, unlink, readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// Stockage local des pièces jointes commerciales (devis, propositions,
// contrats…) attachées à une action de suivi CRM (SuiviCommercial). Même
// principe que src/lib/cv-storage.ts : jamais servi depuis /public,
// uniquement via la route de téléchargement protégée (auth + contrôle
// d'accès à l'entreprise), voir src/app/admin/crm/[id]/fichiers/[suiviId]/route.ts.
//
// En production, storage/ doit pointer vers un volume persistant (ou être
// remplacé par un stockage objet S3-compatible).

const STORAGE_DIR = path.join(process.cwd(), "storage", "crm");

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

/** Enregistre la pièce jointe sur disque. Retourne le nom stocké (à
 * conserver dans SuiviCommercial.fichierUrl) ou null si le format n'est pas
 * supporté. */
export async function saveCrmFile(
  file: File
): Promise<{ storedName: string; originalName: string } | null> {
  const ext = extensionOf(file.name);
  if (!ext) return null;

  await mkdir(STORAGE_DIR, { recursive: true });
  const storedName = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(STORAGE_DIR, storedName), buffer);

  return { storedName, originalName: file.name };
}

export async function readCrmFile(storedName: string): Promise<Buffer | null> {
  if (!isValidStoredName(storedName)) return null;
  try {
    return await readFile(path.join(STORAGE_DIR, storedName));
  } catch {
    return null;
  }
}

export async function deleteCrmFile(storedName: string | null): Promise<void> {
  if (!storedName || !isValidStoredName(storedName)) return;
  try {
    await unlink(path.join(STORAGE_DIR, storedName));
  } catch {
    // Fichier déjà absent : rien à faire.
  }
}
