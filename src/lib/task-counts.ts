import { prisma } from "@/lib/prisma";
import { consultantVisibilityWhere } from "@/lib/consultant-access";
import { entrepriseVisibilityWhere } from "@/lib/crm-access";

// Compte des tâches (rappels/RDV programmés, ATS + CRM confondus) en retard
// ou à venir sous 7 jours — alimente la pastille de notification dans le
// menu et le bandeau en haut du tableau de bord.

type SessionUser = { id: string; role: string };

export type TaskCounts = {
  enRetard: number;
  aVenir: number;
};

export async function getTaskCounts(user: SessionUser): Promise<TaskCounts> {
  const now = new Date();
  const dans7Jours = new Date(now);
  dans7Jours.setDate(now.getDate() + 7);

  const bmFilter = consultantVisibilityWhere(user);
  const entrepriseFilter = entrepriseVisibilityWhere(user);

  const [atsEnRetard, atsAVenir, crmEnRetard, crmAVenir] = await Promise.all([
    prisma.suiviCandidat.count({
      where: {
        fait: false,
        type: { in: ["RDV", "RAPPEL"] },
        dateProgrammee: { lt: now },
        consultant: bmFilter,
      },
    }),
    prisma.suiviCandidat.count({
      where: {
        fait: false,
        type: { in: ["RDV", "RAPPEL"] },
        dateProgrammee: { gte: now, lte: dans7Jours },
        consultant: bmFilter,
      },
    }),
    prisma.suiviCommercial.count({
      where: {
        fait: false,
        type: { in: ["RDV", "RAPPEL"] },
        dateProgrammee: { lt: now },
        entreprise: entrepriseFilter,
      },
    }),
    prisma.suiviCommercial.count({
      where: {
        fait: false,
        type: { in: ["RDV", "RAPPEL"] },
        dateProgrammee: { gte: now, lte: dans7Jours },
        entreprise: entrepriseFilter,
      },
    }),
  ]);

  return {
    enRetard: atsEnRetard + crmEnRetard,
    aVenir: atsAVenir + crmAVenir,
  };
}
