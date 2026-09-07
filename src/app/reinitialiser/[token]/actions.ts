"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export type ResetState = { error?: string; done?: boolean };

export async function resetPasswordAction(
  token: string,
  _prev: ResetState,
  formData: FormData
): Promise<ResetState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 10) {
    return { error: "Le mot de passe doit contenir au moins 10 caractères." };
  }
  if (password !== confirm) {
    return { error: "Les deux mots de passe ne correspondent pas." };
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (
    !resetToken ||
    resetToken.usedAt ||
    resetToken.expiresAt < new Date()
  ) {
    return { error: "Ce lien est invalide ou a expiré." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { token },
      data: { usedAt: new Date() },
    }),
  ]);

  return { done: true };
}
