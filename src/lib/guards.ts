import { redirect } from "next/navigation";
import { auth } from "@/auth";
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

export async function requireStaff() {
  return requireRole(ROLES.ADMIN, ROLES.BM);
}

export async function requireAdmin() {
  return requireRole(ROLES.ADMIN);
}

export async function requireClient() {
  return requireRole(ROLES.CLIENT);
}
