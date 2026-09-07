"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type LoginState = { error?: string };

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: next && next !== "null" ? next : "/",
    });
    return {};
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Identifiants incorrects ou compte désactivé." };
    }
    throw err;
  }
}
