import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

// Connexion Gmail / Google Calendar par compte (OAuth 2.0, authorization
// code flow) — distincte de l'authentification à HYPERION (NextAuth
// Credentials) : ceci autorise l'appli à agir au nom du BM sur SA propre
// boîte Gmail / SON agenda, une fois déjà connecté à HYPERION.

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} manquant (voir .env).`);
  return value;
}

export function buildGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv("GOOGLE_CLIENT_ID"),
    redirect_uri: requireEnv("GOOGLE_REDIRECT_URI"),
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    // Force la réémission d'un refresh_token même si ce compte a déjà
    // autorisé l'appli auparavant (sinon Google ne le renvoie qu'une fois).
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
};

async function postForm(url: string, body: Record<string, string>): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const res = await postForm("https://oauth2.googleapis.com/token", {
    code,
    client_id: requireEnv("GOOGLE_CLIENT_ID"),
    client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
    redirect_uri: requireEnv("GOOGLE_REDIRECT_URI"),
    grant_type: "authorization_code",
  });
  if (!res.ok) {
    throw new Error(`Échec de l'échange du code Google : ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const res = await postForm("https://oauth2.googleapis.com/token", {
    refresh_token: refreshToken,
    client_id: requireEnv("GOOGLE_CLIENT_ID"),
    client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
    grant_type: "refresh_token",
  });
  if (!res.ok) {
    throw new Error(`Échec du rafraîchissement du token Google : ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function fetchGoogleEmail(accessToken: string): Promise<string | null> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.email ?? null;
}

/** Enregistre les tokens obtenus après l'échange initial (chiffrés). */
export async function storeGoogleTokens(
  userId: string,
  tokens: TokenResponse,
  email: string | null
) {
  if (!tokens.refresh_token) {
    // Ne devrait pas arriver avec prompt=consent, mais un refresh_token
    // manquant rendrait la connexion inutilisable après expiration du access
    // token — mieux vaut échouer franchement que stocker une connexion morte.
    throw new Error(
      "Google n'a pas renvoyé de jeton de rafraîchissement — réessayez la connexion."
    );
  }
  await prisma.user.update({
    where: { id: userId },
    data: {
      googleAccessTokenEnc: encryptSecret(tokens.access_token),
      googleRefreshTokenEnc: encryptSecret(tokens.refresh_token),
      googleTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      googleEmail: email,
      googleConnectedAt: new Date(),
    },
  });
}

/** Retourne un access token valide pour cet utilisateur (rafraîchi si
 * nécessaire), ou `null` si le compte n'est pas connecté à Google. */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleAccessTokenEnc: true, googleRefreshTokenEnc: true, googleTokenExpiresAt: true },
  });
  if (!user?.googleAccessTokenEnc || !user.googleRefreshTokenEnc) return null;

  const stillValid =
    user.googleTokenExpiresAt && user.googleTokenExpiresAt.getTime() > Date.now() + 60_000;
  if (stillValid) {
    return decryptSecret(user.googleAccessTokenEnc);
  }

  const refreshToken = decryptSecret(user.googleRefreshTokenEnc);
  const refreshed = await refreshAccessToken(refreshToken);
  await prisma.user.update({
    where: { id: userId },
    data: {
      googleAccessTokenEnc: encryptSecret(refreshed.access_token),
      googleTokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
    },
  });
  return refreshed.access_token;
}

export async function disconnectGoogle(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleAccessTokenEnc: true },
  });
  if (user?.googleAccessTokenEnc) {
    // Best-effort : révoque côté Google, mais on efface nos champs même en
    // cas d'échec (token peut-être déjà invalide/expiré).
    await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: decryptSecret(user.googleAccessTokenEnc) }).toString(),
    }).catch(() => {});
  }
  await prisma.user.update({
    where: { id: userId },
    data: {
      googleAccessTokenEnc: null,
      googleRefreshTokenEnc: null,
      googleTokenExpiresAt: null,
      googleEmail: null,
      googleConnectedAt: null,
    },
  });
}
