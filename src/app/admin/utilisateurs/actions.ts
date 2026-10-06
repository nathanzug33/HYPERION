"use server";

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { sendAccountInvitationEmail } from "@/lib/mail";
import { getBaseUrl } from "@/lib/base-url";
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
  const base = getBaseUrl();
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
  const base = getBaseUrl();
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

/** La 2FA étant désormais obligatoire (voir requireTwoFactorEnabled dans
 * guards.ts), un utilisateur qui perd son appareil (téléphone perdu/changé)
 * ne peut plus produire de code valide et se retrouve bloqué avant même
 * d'atteindre une page où se désinscrire lui-même — seul un admin peut le
 * débloquer. La réinitialisation le renvoie vers /securite-2fa dès sa
 * prochaine requête, où il ré-enrôle un nouvel appareil. */
export async function resetTwoFactorAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.user.update({
    where: { id },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });
  revalidatePath("/admin/utilisateurs");
}

/** Suppression définitive (contrairement à « Révoquer l'accès », qui ne
 * fait que désactiver la connexion en conservant tout l'historique). Pour
 * un compte staff (ADMIN/DIRECTEUR_BU/BM), tous les dossiers dont il est
 * référent (candidat, entreprise, besoin, mission, offre) et les éléments
 * d'historique qu'il a créés (suivis, pièces jointes…) sont d'abord
 * réattribués à un administrateur — automatiquement s'il n'y en a qu'un,
 * sinon celui choisi dans le formulaire — plutôt que de bloquer la
 * suppression. Les comptes CLIENT ne sont pas concernés (leurs demandes leur
 * sont propres) : la contrainte de clé étrangère continue de protéger ce cas. */
export async function deleteUserAction(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const reassignToId = String(formData.get("reassignToId") ?? "") || null;
  if (!id) return;

  if (id === session.user.id) {
    redirect(
      `/admin/utilisateurs?error=${encodeURIComponent("Vous ne pouvez pas supprimer votre propre compte.")}`
    );
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return;

  if (target.role !== ROLES.CLIENT) {
    const admins = await prisma.user.findMany({
      where: { role: ROLES.ADMIN, id: { not: id } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    if (admins.length === 0) {
      redirect(
        `/admin/utilisateurs?error=${encodeURIComponent(
          "Impossible de supprimer ce compte : aucun autre compte administrateur n'existe pour reprendre ses dossiers. Créez-en un d'abord."
        )}`
      );
    }
    const reassignTo =
      (reassignToId && admins.find((a) => a.id === reassignToId)) ||
      (admins.length === 1 ? admins[0] : null);
    if (!reassignTo) {
      redirect(
        `/admin/utilisateurs?error=${encodeURIComponent(
          "Plusieurs administrateurs existent : choisissez à qui réattribuer les dossiers avant de supprimer ce compte."
        )}`
      );
    }

    await prisma.$transaction([
      prisma.consultant.updateMany({ where: { businessManagerId: id }, data: { businessManagerId: reassignTo.id } }),
      prisma.consultantFichier.updateMany({ where: { createdById: id }, data: { createdById: reassignTo.id } }),
      prisma.suiviCandidat.updateMany({ where: { createdById: id }, data: { createdById: reassignTo.id } }),
      prisma.entreprise.updateMany({ where: { businessManagerId: id }, data: { businessManagerId: reassignTo.id } }),
      prisma.suiviCommercial.updateMany({ where: { createdById: id }, data: { createdById: reassignTo.id } }),
      prisma.besoin.updateMany({ where: { businessManagerId: id }, data: { businessManagerId: reassignTo.id } }),
      prisma.besoinCandidat.updateMany({ where: { createdById: id }, data: { createdById: reassignTo.id } }),
      prisma.mission.updateMany({ where: { businessManagerId: id }, data: { businessManagerId: reassignTo.id } }),
      prisma.offre.updateMany({ where: { businessManagerId: id }, data: { businessManagerId: reassignTo.id } }),
    ]);
  }

  try {
    await prisma.user.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      redirect(
        `/admin/utilisateurs?error=${encodeURIComponent(
          "Impossible de supprimer ce compte : il a encore des éléments liés que la réattribution automatique ne couvre pas (ex. demandes d'un compte client). Utilisez « Révoquer l'accès » pour bloquer la connexion tout en conservant l'historique."
        )}`
      );
    }
    throw err;
  }

  revalidatePath("/admin/utilisateurs");
  redirect(`/admin/utilisateurs?success=${encodeURIComponent("Compte supprimé.")}`);
}
