"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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
