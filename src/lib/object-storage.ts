import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

// Stockage objet (Supabase Storage) pour les pièces jointes sensibles (CV,
// pièces jointes CRM) — remplace le disque local, qui ne survit pas aux
// redéploiements sur une plateforme serverless (Vercel). Un seul bucket
// privé ("hyperion-storage", jamais accédé en public), organisé par
// dossier logique (ex. "cv/", "crm/") — voir cv-storage.ts / crm-storage.ts,
// qui restent les points d'entrée métier (extensions autorisées, validation
// du nom stocké) et délèguent la lecture/écriture/suppression physique ici.

// Exporté : le nom du bucket n'est pas sensible, le client (navigateur) en a
// besoin pour l'upload direct (voir createSignedUploadObjectUrl ci-dessous).
export const BUCKET = "hyperion-storage";

function client() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY absents — stockage des pièces jointes non configuré."
    );
  }
  // Clé de service : jamais exposée côté client, uniquement utilisée dans du
  // code serveur (Server Actions / Route Handlers) qui applique déjà ses
  // propres contrôles d'accès avant d'appeler ce module.
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function uploadObject(
  folder: string,
  storedName: string,
  buffer: Buffer
): Promise<void> {
  const { error } = await client()
    .storage.from(BUCKET)
    .upload(`${folder}/${storedName}`, buffer, { upsert: false });
  if (error) throw new Error(`Échec de l'envoi vers le stockage : ${error.message}`);
}

export async function readObject(folder: string, storedName: string): Promise<Buffer | null> {
  const { data, error } = await client().storage.from(BUCKET).download(`${folder}/${storedName}`);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export async function deleteObject(folder: string, storedName: string): Promise<void> {
  await client().storage.from(BUCKET).remove([`${folder}/${storedName}`]);
}

export function generateStoredName(extension: string): string {
  return `${randomUUID()}.${extension}`;
}

/** Jeton d'upload à usage unique (Supabase Storage "signed upload URL") —
 * permet au navigateur d'envoyer un fichier directement vers le bucket,
 * sans passer par notre fonction serverless. Nécessaire pour les fichiers
 * volumineux (CV avec photos/mise en forme) : Vercel plafonne à 4,5 Mo le
 * corps d'une requête reçue par une Server Action/Route Handler, une limite
 * d'infrastructure qu'aucune configuration applicative ne peut lever — le
 * fichier doit donc éviter ce chemin entièrement. Le jeton est généré ici
 * avec la clé de service (jamais exposée) ; l'upload lui-même, côté
 * navigateur, n'a besoin que de ce jeton (voir StorageFileApi.uploadToSignedUrl
 * — aucune permission RLS supplémentaire requise sur storage.objects). */
export async function createSignedUploadObjectUrl(
  folder: string,
  storedName: string
): Promise<{ token: string; path: string }> {
  const { data, error } = await client()
    .storage.from(BUCKET)
    .createSignedUploadUrl(`${folder}/${storedName}`);
  if (error || !data) {
    throw new Error(`Échec de préparation de l'upload : ${error?.message ?? "inconnu"}`);
  }
  return { token: data.token, path: data.path };
}
