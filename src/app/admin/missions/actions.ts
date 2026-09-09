"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { canAccessEntreprise } from "@/lib/crm-access";

/** Déclare/met à jour les jours travaillés d'une mission pour un mois donné
 * — base de la marge mensuelle (§ pilotage financier). À saisir chaque
 * début de mois pour le mois précédent ou en cours. */
export async function setJoursTravaillesAction(formData: FormData) {
  const session = await requireStaff();
  const missionId = String(formData.get("missionId") ?? "");
  const mission = await prisma.mission.findUnique({ where: { id: missionId } });
  if (!mission) return;

  const entreprise = await prisma.entreprise.findUnique({ where: { id: mission.entrepriseId } });
  if (!entreprise || !canAccessEntreprise(session.user, entreprise)) return;

  const annee = Number(formData.get("annee") ?? "");
  const mois = Number(formData.get("mois") ?? "");
  const joursTravailles = Number(formData.get("joursTravailles") ?? "");
  if (!annee || !mois || mois < 1 || mois > 12 || Number.isNaN(joursTravailles)) return;

  await prisma.missionJoursTravailles.upsert({
    where: { missionId_annee_mois: { missionId, annee, mois } },
    update: { joursTravailles },
    create: { missionId, annee, mois, joursTravailles },
  });

  revalidatePath("/admin/missions/marge");
}
