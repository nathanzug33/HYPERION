import crypto from "node:crypto";

// Chiffrement au repos des tokens OAuth Google (AES-256-GCM) — la clé
// GOOGLE_TOKEN_ENCRYPTION_KEY (32 octets hex) doit rester stable : la faire
// tourner rend illisibles les tokens déjà stockés (comptes à reconnecter).

function getKey(): Buffer {
  const hex = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY manquante (voir .env).");
  }
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) {
    throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY doit faire 32 octets (64 caractères hex).");
  }
  return key;
}

/** Retourne `iv:authTag:ciphertext` (base64, séparés par ":"). */
export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(
    ":"
  );
}

export function decryptSecret(payload: string): string {
  const [ivB64, authTagB64, dataB64] = payload.split(":");
  if (!ivB64 || !authTagB64 || !dataB64) {
    throw new Error("Format de secret chiffré invalide.");
  }
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
