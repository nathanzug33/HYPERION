import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/constants";

// Visibilité d'un dossier candidat pour un business manager : le référent
// (Consultant.businessManagerId) a toujours accès, plus tout BM à qui
// l'administrateur a explicitement accordé un accès élargi
// (ConsultantAccess) — dossier par dossier, pour le travail en équipe.
// L'administrateur voit tout.

type SessionUser = { id: string; role: string };

/** Clause `where` à utiliser sur `Consultant` (liste, comptages). */
export function consultantVisibilityWhere(user: SessionUser): Prisma.ConsultantWhereInput {
  if (user.role === ROLES.ADMIN) return {};
  return {
    OR: [
      { businessManagerId: user.id },
      { accesEquipe: { some: { userId: user.id } } },
    ],
  };
}

/** Vérifie l'accès à un dossier précis (déjà chargé). */
export async function canAccessConsultant(
  user: SessionUser,
  consultant: { id: string; businessManagerId: string }
): Promise<boolean> {
  if (user.role === ROLES.ADMIN) return true;
  if (consultant.businessManagerId === user.id) return true;
  const access = await prisma.consultantAccess.findUnique({
    where: { consultantId_userId: { consultantId: consultant.id, userId: user.id } },
  });
  return Boolean(access);
}
