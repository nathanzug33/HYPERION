"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireClient } from "@/lib/guards";

export type UpdateProfileState = { error?: string; success?: boolean };

export async function updateClientProfileAction(
  _prev: UpdateProfileState,
  formData: FormData
): Promise<UpdateProfileState> {
  const session = await requireClient();

  const poste = String(formData.get("poste") ?? "").trim();
  const telephone = String(formData.get("telephone") ?? "").trim();

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      poste: poste || null,
      telephone: telephone || null,
    },
  });

  revalidatePath("/bibliotheque/profil");
  return { success: true };
}
