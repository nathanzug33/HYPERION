import type { Prisma } from "@prisma/client";

// Vivier candidats commun : tout membre du staff (BM, Directeur de BU,
// admin) voit et peut modifier tous les candidats, quelle que soit la
// personne qui les a saisis — utile pour une politique multi-agences où un
// profil peut être mobile n'importe où. Le "BM référent" reste affiché sur
// chaque fiche à titre d'information (qui a rencontré/rentré le candidat),
// mais n'est plus une restriction d'accès (l'ancien mécanisme d'accès
// élargi par dossier, ConsultantAccess, est donc devenu inutile et a été
// retiré).

type SessionUser = { id: string; role: string };

/** Clause `where` à utiliser sur `Consultant` (liste, comptages). */
export function consultantVisibilityWhere(
  _user: SessionUser
): Prisma.ConsultantWhereInput {
  return {};
}

/** Vérifie l'accès à un dossier précis. Toujours vrai pour le staff —
 * conservé en fonction (plutôt qu'un simple `true` en ligne) pour garder un
 * point d'entrée unique si une restriction devait un jour être réintroduite. */
export async function canAccessConsultant(
  _user: SessionUser,
  _consultant: { id: string; businessManagerId: string }
): Promise<boolean> {
  return true;
}
