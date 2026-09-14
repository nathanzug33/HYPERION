"use server";

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { sendAccountInvitationEmail } from "@/lib/mail";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/constants";

export type CreateUserState = { error?: string; success?: string };

export async function createUserAction(
  _prev: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  const session = await requireAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "");
  const newOrgName = String(formData.get("newOrgName") ?? "").trim();
  const existingOrgId = String(formData.get("clientOrganizationId") ?? "");

  if (!email || !name || !["ADMIN", "DIRECTEUR_BU", "BM", "CLIENT"].includes(role)) {
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
  await sendAccountInvitationEmail(
    email,
    {
      name,
      roleLabel: ROLE_LABELS[role as Role],
      setPasswordUrl: `${base}/reinitialiser/${token}`,
    },
    session.user.id
  );

  revalidatePath("/admin/utilisateurs");
  return {
    success: `Compte créé pour ${email}. Une invitation avec un lien de définition de mot de passe a été envoyée (valable 72h).`,
  };
}

/** Régénère un lien d'activation et le renvoie — utile quand l'invitation
 * initiale ne semble jamais être arrivée (boîte mail non vérifiée à
 * l'époque, filtre anti-spam…). Un nouveau token invalide l'ancien via son
 * expiration naturelle ; l'ancien reste inoffensif s'il traîne encore. */
export async function resendInvitationAction(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return;

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
    },
  });
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  await sendAccountInvitationEmail(
    user.email,
    {
      name: user.name,
      roleLabel: ROLE_LABELS[user.role as Role],
      setPasswordUrl: `${base}/reinitialiser/${token}`,
    },
    session.user.id
  );

  revalidatePath("/admin/utilisateurs");
}

export async function toggleUserActive(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  if (!id) return;
  await prisma.user.update({ where: { id }, data: { active: !active } });
  revalidatePath("/admin/utilisateurs");
}
