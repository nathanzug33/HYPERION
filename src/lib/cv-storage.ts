import { mkdir, writeFile, unlink, readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// Stockage local du fichier CV original (PDF/Word), séparé du texte extrait
// (Consultant.sourceCvTexte, utilisé par la génération IA). Jamais servi
// depuis /public : uniquement via la route de téléchargement protégée
// (auth + contrôle d'accès au dossier), voir
// src/app/admin/consultants/[id]/cv/route.ts.
//
// En production, storage/ doit pointer vers un volume persistant (ou être
// remplacé par un stockage objet S3-compatible) — le disque local d'un
// conteneur éphémère ne survit pas aux redéploiements.

const STORAGE_DIR = path.join(process.cwd(), "storage", "cv");

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

/** Enregistre le fichier CV sur disque. Retourne le nom stocké (à conserver
 * dans Consultant.cvFileUrl) ou null si le format n'est pas supporté. */
export async function saveCvFile(
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

export async function readCvFile(storedName: string): Promise<Buffer | null> {
  if (!isValidStoredName(storedName)) return null;
  try {
    return await readFile(path.join(STORAGE_DIR, storedName));
  } catch {
    return null;
  }
}

export async function deleteCvFile(storedName: string | null): Promise<void> {
  if (!storedName || !isValidStoredName(storedName)) return;
  try {
    await unlink(path.join(STORAGE_DIR, storedName));
  } catch {
    // Fichier déjà absent : rien à faire.
  }
}
