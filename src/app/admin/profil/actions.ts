"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";

/** Permet à un membre du staff de modifier son propre nom/email — jamais
 * son rôle (géré uniquement via /admin/utilisateurs par un admin). Le nom
 * affiché dans le JWT de session (topbar, emails envoyés...) ne se
 * rafraîchit qu'à la reconnexion suivante — comportement normal d'une
 * session JWT non re-fetchée à chaque requête. */
export async function updateOwnProfileAction(formData: FormData) {
  const session = await requireStaff();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!name || !email || !email.includes("@")) return;

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name, email },
    });
  } catch {
    redirect("/admin/profil?error=email_pris");
  }

  revalidatePath("/admin/profil");
  redirect("/admin/profil?maj=ok");
}

/** Changement de mot de passe par l'utilisateur lui-même, en étant déjà
 * connecté — distinct du flux "mot de passe oublié" (par email, pour un
 * compte qui n'a plus accès). Exige le mot de passe actuel. */
export async function changeOwnPasswordAction(formData: FormData) {
  const session = await requireStaff();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !newPassword || !confirmPassword) return;
  if (newPassword.length < 8) {
    redirect("/admin/profil?pwdError=trop_court");
  }
  if (newPassword !== confirmPassword) {
    redirect("/admin/profil?pwdError=confirmation");
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    redirect("/admin/profil?pwdError=actuel_incorrect");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash },
  });

  redirect("/admin/profil?pwdMaj=ok");
}
