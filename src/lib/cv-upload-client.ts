import { createClient } from "@supabase/supabase-js";

// Upload direct navigateur → Supabase Storage, via un jeton signé obtenu au
// préalable côté serveur (voir object-storage.ts::createSignedUploadObjectUrl
// et cv-storage.ts::prepareCvUpload) — le contenu du fichier ne transite
// jamais par notre fonction serverless, pour rester sous la limite de
// 4,5 Mo que Vercel impose au corps d'une requête Server Action/Route
// Handler (limite d'infrastructure, non contournable par configuration).
//
// Clé publique (anon) uniquement : le jeton signé porte à lui seul
// l'autorisation d'écrire à cet emplacement précis (aucune permission RLS
// supplémentaire requise sur storage.objects, voir la doc Supabase de
// uploadToSignedUrl) — rien de plus sensible n'est exposé côté client.
function browserStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Upload direct non configuré (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY absents)."
    );
  }
  return createClient(url, anonKey, { auth: { persistSession: false } });
}

export type PreparedUpload = {
  storedName: string;
  originalName: string;
  token: string;
  bucket: string;
  folder: string;
};

export async function uploadFileDirect(
  file: File,
  prepared: PreparedUpload
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await browserStorageClient()
    .storage.from(prepared.bucket)
    .uploadToSignedUrl(`${prepared.folder}/${prepared.storedName}`, prepared.token, file);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
