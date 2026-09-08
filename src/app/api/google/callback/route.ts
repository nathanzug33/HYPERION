import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/guards";
import { exchangeCodeForTokens, fetchGoogleEmail, storeGoogleTokens } from "@/lib/google-oauth";

const STATE_COOKIE = "google_oauth_state";

export async function GET(req: Request) {
  const session = await requireStaff();
  const { searchParams } = new URL(req.url);

  const error = searchParams.get("error");
  if (error) {
    return NextResponse.redirect(
      new URL(`/admin/profil?google=error&reason=${encodeURIComponent(error)}`, req.url)
    );
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/admin/profil?google=error&reason=state", req.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const email = await fetchGoogleEmail(tokens.access_token);
    await storeGoogleTokens(session.user.id, tokens, email);
  } catch (err) {
    console.error("[google-oauth] Échec de la connexion :", err);
    return NextResponse.redirect(new URL("/admin/profil?google=error&reason=exchange", req.url));
  }

  return NextResponse.redirect(new URL("/admin/profil?google=connected", req.url));
}
