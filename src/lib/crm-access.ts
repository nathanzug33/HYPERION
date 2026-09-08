import type { Prisma } from "@prisma/client";
import { ROLES } from "@/lib/constants";

// Visibilité d'une entreprise CRM pour un business manager : le référent
// (Entreprise.businessManagerId) a accès, l'administrateur voit tout. Plus
// simple que côté ATS (pas d'accès élargi géré ici) — à étendre de la même
// façon que ConsultantAccess si le travail en équipe sur un même prospect
// le justifie un jour.

type SessionUser = { id: string; role: string };

/** Clause `where` à utiliser sur `Entreprise` (liste, comptages). */
export function entrepriseVisibilityWhere(
  user: SessionUser
): Prisma.EntrepriseWhereInput {
  if (user.role === ROLES.ADMIN) return {};
  return { businessManagerId: user.id };
}

/** Vérifie l'accès à une entreprise précise (déjà chargée). */
export function canAccessEntreprise(
  user: SessionUser,
  entreprise: { businessManagerId: string }
): boolean {
  return user.role === ROLES.ADMIN || entreprise.businessManagerId === user.id;
}
