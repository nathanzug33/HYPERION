"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type LoginState = { error?: string; twoFactorRequired?: boolean };

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  // Toujours une chaîne (jamais `undefined`) : next-auth sérialise un champ
  // absent en la chaîne littérale "undefined" lors du passage par signIn(),
  // ce qui ferait échouer le test `!code` côté authorize() dans auth.ts.
  const code = String(formData.get("code") ?? "").trim();
  const next = String(formData.get("next") ?? "/");

  try {
    await signIn("credentials", {
      email,
      password,
      code,
      redirectTo: next && next !== "null" ? next : "/",
    });
    return {};
  } catch (err) {
    if (err instanceof AuthError) {
      const type = err.type as string;
      if (type === "TwoFactorRequired") {
        return { twoFactorRequired: true };
      }
      if (type === "InvalidTwoFactorCode") {
        return { twoFactorRequired: true, error: "Code de vérification incorrect." };
      }
      return {
        error:
          "Identifiants incorrects, compte désactivé ou temporairement verrouillé après plusieurs échecs.",
      };
    }
    throw err;
  }
}
