"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/guards";
import {
  generateTwoFactorSecret,
  buildTwoFactorQrCode,
  verifyTwoFactorCode,
} from "@/lib/two-factor";

// Chemins revalidés après un changement d'état 2FA — les deux pages profil
// (staff et client) partagent ces actions.
const PROFILE_PATHS = ["/admin/profil", "/bibliotheque/profil"];

export type TwoFactorEnrollState = {
  qrCodeDataUrl?: string;
  manualKey?: string;
  error?: string;
};

export async function startTwoFactorEnrollmentAction(
  _prev: TwoFactorEnrollState,
  _formData: FormData
): Promise<TwoFactorEnrollState> {
  const session = await requireSession();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });

  const secret = generateTwoFactorSecret();
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorSecret: secret, twoFactorEnabled: false },
  });
  const qrCodeDataUrl = await buildTwoFactorQrCode(user.email, secret);

  return { qrCodeDataUrl, manualKey: secret };
}

export type TwoFactorConfirmState = { error?: string; enabled?: boolean };

export async function confirmTwoFactorEnrollmentAction(
  _prev: TwoFactorConfirmState,
  formData: FormData
): Promise<TwoFactorConfirmState> {
  const session = await requireSession();
  const code = String(formData.get("code") ?? "").trim();

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!user.twoFactorSecret) {
    return { error: "Aucune procédure d'activation en cours — recommencez." };
  }

  const valid = await verifyTwoFactorCode(user.twoFactorSecret, code);
  if (!valid) {
    return { error: "Code incorrect. Réessayez." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: true },
  });
  PROFILE_PATHS.forEach((path) => revalidatePath(path));

  return { enabled: true };
}

export type TwoFactorDisableState = { error?: string; disabled?: boolean };

export async function disableTwoFactorAction(
  _prev: TwoFactorDisableState,
  formData: FormData
): Promise<TwoFactorDisableState> {
  const session = await requireSession();
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { error: "Mot de passe incorrect." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });
  PROFILE_PATHS.forEach((path) => revalidatePath(path));

  return { disabled: true };
}
