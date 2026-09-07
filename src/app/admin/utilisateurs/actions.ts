"use server";

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { sendPasswordResetEmail } from "@/lib/mail";
import { ROLES } from "@/lib/constants";

export type CreateUserState = { error?: string; success?: string };

export async function createUserAction(
  _prev: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  await requireAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "");
  const newOrgName = String(formData.get("newOrgName") ?? "").trim();
  const existingOrgId = String(formData.get("clientOrganizationId") ?? "");

  if (!email || !name || !["ADMIN", "BM", "CLIENT"].includes(role)) {
    return { error: "Merci de renseigner tous les champs obligatoires." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Un compte existe déjà avec cet email." };
  }

  let clientOrganizationId: string | null = null;
  if (role === ROLES.CLIENT) {
    if (newOrgName) {
      const org = await prisma.clientOrganization.create({
        data: { name: newOrgName },
      });
      clientOrganizationId = org.id;
    } else if (existingOrgId) {
      clientOrganizationId = existingOrgId;
    } else {
      return {
        error: "Sélectionnez ou créez une organisation cliente pour un compte client.",
      };
    }
  }

  const temporaryPassword = crypto.randomBytes(16).toString("hex");
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  const user = await prisma.user.create({
    data: { email, name, role, passwordHash, clientOrganizationId },
  });

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
    },
  });
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  await sendPasswordResetEmail(email, `${base}/reinitialiser/${token}`);

  revalidatePath("/admin/utilisateurs");
  return {
    success: `Compte créé pour ${email}. Un lien de définition de mot de passe a été envoyé (valable 72h).`,
  };
}

export async function toggleUserActive(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  if (!id) return;
  await prisma.user.update({ where: { id }, data: { active: !active } });
  revalidatePath("/admin/utilisateurs");
}
