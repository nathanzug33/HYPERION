import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

// Stockage objet (Supabase Storage) pour les pièces jointes sensibles (CV,
// pièces jointes CRM) — remplace le disque local, qui ne survit pas aux
// redéploiements sur une plateforme serverless (Vercel). Un seul bucket
// privé ("hyperion-storage", jamais accédé en public), organisé par
// dossier logique (ex. "cv/", "crm/") — voir cv-storage.ts / crm-storage.ts,
// qui restent les points d'entrée métier (extensions autorisées, validation
// du nom stocké) et délèguent la lecture/écriture/suppression physique ici.

const BUCKET = "hyperion-storage";

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
