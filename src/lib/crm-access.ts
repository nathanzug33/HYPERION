import type { Prisma } from "@prisma/client";
import { canReassignReferent } from "@/lib/constants";

// Visibilité d'une entreprise CRM pour un business manager : le référent
// (Entreprise.businessManagerId) a accès. Admin et Directeur de BU voient
// tout (ATS + CRM), tous BM confondus. Contrairement à l'ATS (vivier
// commun), le CRM reste cloisonné par référent pour les BM : un client
// démarché par un commercial lui reste rattaché.

type SessionUser = { id: string; role: string };

/** Clause `where` à utiliser sur `Entreprise` (liste, comptages). */
export function entrepriseVisibilityWhere(
  user: SessionUser
): Prisma.EntrepriseWhereInput {
  if (canReassignReferent(user)) return {};
  return { businessManagerId: user.id };
}

/** Vérifie l'accès à une entreprise précise (déjà chargée). */
export function canAccessEntreprise(
  user: SessionUser,
  entreprise: { businessManagerId: string }
): boolean {
  return canReassignReferent(user) || entreprise.businessManagerId === user.id;
}
