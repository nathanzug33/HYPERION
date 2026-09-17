import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ROLES, type Role } from "@/lib/constants";

// Garde-fous côté serveur (défense en profondeur, en plus du middleware) :
// à utiliser dans les Server Components / Server Actions.

export async function requireSession() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  return session;
}

export async function requireRole(...roles: Role[]) {
  const session = await requireSession();
  if (!roles.includes(session.user.role as Role)) {
    redirect(session.user.role === ROLES.CLIENT ? "/bibliotheque" : "/admin");
  }
  return session;
}

// La 2FA est obligatoire pour tout le personnel interne (ADMIN, Directeur de
// BU, BM) — vérifiée en base à chaque appel plutôt que mise en cache dans le
// token de session, pour qu'une réinitialisation par un admin (fiche
// Utilisateurs) ou une activation qui vient d'avoir lieu prenne effet
// immédiatement, sans attendre une reconnexion. Jamais appliqué aux comptes
// CLIENT (bibliothèque) : hors périmètre de cette exigence.
async function requireTwoFactorEnabled(session: Awaited<ReturnType<typeof requireSession>>) {
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { twoFactorEnabled: true },
  });
  if (!user?.twoFactorEnabled) {
    redirect("/securite-2fa");
  }
}

export async function requireStaff() {
  const session = await requireRole(ROLES.ADMIN, ROLES.DIRECTEUR_BU, ROLES.BM);
  await requireTwoFactorEnabled(session);
  return session;
}

export async function requireAdmin() {
  const session = await requireRole(ROLES.ADMIN);
  await requireTwoFactorEnabled(session);
  return session;
}

/** Admin ou Directeur de BU : vue globale (ATS + CRM, tous BM confondus) et
 * réassignation du BM référent — mais pas la gestion utilisateurs /
 * référentiels / journaux / purge RGPD (réservée à requireAdmin). */
export async function requireAdminOrDirecteur() {
  const session = await requireRole(ROLES.ADMIN, ROLES.DIRECTEUR_BU);
  await requireTwoFactorEnabled(session);
  return session;
}

export async function requireClient() {
  return requireRole(ROLES.CLIENT);
}
