"use server";

import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/mail";
import { getBaseUrl } from "@/lib/base-url";

export type ForgotState = { done?: boolean };

export async function requestPasswordReset(
  _prev: ForgotState,
  formData: FormData
): Promise<ForgotState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  const user = await prisma.user.findUnique({ where: { email } });

  // Toujours répondre pareil, qu'un compte existe ou non (pas d'énumération de comptes).
  if (user && user.active) {
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    await sendPasswordResetEmail(email, `${getBaseUrl()}/reinitialiser/${token}`);
  }

  return { done: true };
}
