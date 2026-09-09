import type { Prisma } from "@prisma/client";
import { canReassignReferent } from "@/lib/constants";

// Visibilité d'une offre pour un business manager : le référent
// (Offre.businessManagerId) a accès. Admin et Directeur de BU voient tout —
// même logique que le CRM (crm-access.ts), une offre reste rattachée à qui
// l'a créée même si elle est libre (sans besoin/entreprise associé).

type SessionUser = { id: string; role: string };

/** Clause `where` à utiliser sur `Offre` (liste, comptages). */
export function offreVisibilityWhere(user: SessionUser): Prisma.OffreWhereInput {
  if (canReassignReferent(user)) return {};
  return { businessManagerId: user.id };
}

/** Vérifie l'accès à une offre précise (déjà chargée). */
export function canAccessOffre(
  user: SessionUser,
  offre: { businessManagerId: string }
): boolean {
  return canReassignReferent(user) || offre.businessManagerId === user.id;
}
