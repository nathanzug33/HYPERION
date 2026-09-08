import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/guards";
import { buildGoogleAuthUrl } from "@/lib/google-oauth";

const STATE_COOKIE = "google_oauth_state";

export async function GET() {
  await requireStaff();

  const state = crypto.randomBytes(24).toString("hex");
  (await cookies()).set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return NextResponse.redirect(buildGoogleAuthUrl(state));
}
