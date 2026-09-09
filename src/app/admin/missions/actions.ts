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

/** Même déclaration que setJoursTravaillesAction, mais pour plusieurs mois
 * d'une même mission en un seul enregistrement — permet de rattraper des
 * prestations antérieures (ex. juin/juillet) sans changer le filtre de mois
 * à chaque fois. `moisCles` liste les mois affichés (ex. "2026-6,2026-7"),
 * chacun avec son propre champ `jours_<annee>_<mois>` ; un champ laissé vide
 * n'écrase pas une valeur déjà enregistrée pour ce mois-là. */
export async function setJoursTravaillesLotAction(formData: FormData) {
  const session = await requireStaff();
  const missionId = String(formData.get("missionId") ?? "");
  const mission = await prisma.mission.findUnique({ where: { id: missionId } });
  if (!mission) return;

  const entreprise = await prisma.entreprise.findUnique({ where: { id: mission.entrepriseId } });
  if (!entreprise || !canAccessEntreprise(session.user, entreprise)) return;

  const moisCles = String(formData.get("moisCles") ?? "")
    .split(",")
    .map((cle) => cle.trim())
    .filter(Boolean);

  for (const cle of moisCles) {
    const [anneeStr, moisStr] = cle.split("-");
    const annee = Number(anneeStr);
    const mois = Number(moisStr);
    if (!annee || !mois || mois < 1 || mois > 12) continue;

    const raw = formData.get(`jours_${annee}_${mois}`);
    if (raw == null || String(raw).trim() === "") continue;
    const joursTravailles = Number(raw);
    if (Number.isNaN(joursTravailles)) continue;

    await prisma.missionJoursTravailles.upsert({
      where: { missionId_annee_mois: { missionId, annee, mois } },
      update: { joursTravailles },
      create: { missionId, annee, mois, joursTravailles },
    });
  }

  revalidatePath("/admin/missions/marge");
}
