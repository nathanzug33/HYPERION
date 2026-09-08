"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminOrDirecteur } from "@/lib/guards";

export type TransferState = { error?: string; success?: string };

export async function transferPortefeuilleAction(
  _prev: TransferState,
  formData: FormData
): Promise<TransferState> {
  await requireAdminOrDirecteur();

  const sourceId = String(formData.get("sourceId") ?? "");
  const targetId = String(formData.get("targetId") ?? "");

  if (!sourceId || !targetId) {
    return { error: "Sélectionnez le BM source et le BM destination." };
  }
  if (sourceId === targetId) {
    return { error: "Le BM source et le BM destination doivent être différents." };
  }

  const [source, target] = await Promise.all([
    prisma.user.findUnique({ where: { id: sourceId } }),
    prisma.user.findUnique({ where: { id: targetId } }),
  ]);
  if (!source || !target) {
    return { error: "Business manager introuvable." };
  }

  const [candidatsResult, entreprisesResult] = await prisma.$transaction([
    prisma.consultant.updateMany({
      where: { businessManagerId: sourceId },
      data: { businessManagerId: targetId },
    }),
    prisma.entreprise.updateMany({
      where: { businessManagerId: sourceId },
      data: { businessManagerId: targetId },
    }),
  ]);

  revalidatePath("/admin/consultants");
  revalidatePath("/admin/crm");
  revalidatePath("/admin");

  return {
    success: `${candidatsResult.count} candidat(s) et ${entreprisesResult.count} entreprise(s) transférés de ${source.name} vers ${target.name}.`,
  };
}
