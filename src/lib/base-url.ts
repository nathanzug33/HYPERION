/** URL de base de l'application (pour les liens envoyés par email — reset
 * de mot de passe, invitation de compte). Normalise NEXTAUTH_URL : une
 * valeur vide (chaîne vide, différente de "non définie" — `??` seul ne la
 * détecte pas) ou sans schéma http(s) produirait sinon un lien du type
 * "/reinitialiser/abc123" ou "monapp.exemple.fr/reinitialiser/abc123" dans
 * l'email — non cliquable, et menant à une erreur ERR_FILE_NOT_FOUND une
 * fois collé dans un navigateur (interprété comme un chemin de fichier
 * local faute de schéma reconnu). */
export function getBaseUrl(): string {
  const raw = process.env.NEXTAUTH_URL?.trim();
  if (!raw) return "http://localhost:3000";
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/+$/, "");
}
