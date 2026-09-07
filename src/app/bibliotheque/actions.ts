"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireClient } from "@/lib/guards";
import { sendContactRequestNotification } from "@/lib/mail";
import { CONTACT_REQUEST_STATUS } from "@/lib/constants";

export type ContactRequestState = { error?: string; success?: boolean };

export async function submitContactRequest(
  _prev: ContactRequestState,
  formData: FormData
): Promise<ContactRequestState> {
  const session = await requireClient();

  const consultantId = String(formData.get("consultantId") ?? "");
  const besoin = String(formData.get("besoin") ?? "").trim();
  const localisation = String(formData.get("localisation") ?? "").trim();
  const dateDemarrage = String(formData.get("dateDemarrageSouhaitee") ?? "");

  if (!consultantId || !besoin) {
    return { error: "Merci de préciser votre besoin." };
  }

  const consultant = await prisma.consultant.findUnique({
    where: { id: consultantId },
    include: { businessManager: true },
  });
  if (!consultant || consultant.statutPublication !== "PUBLIEE") {
    return { error: "Ce profil n'est plus disponible." };
  }

  await prisma.contactRequest.create({
    data: {
      consultantId,
      clientUserId: session.user.id,
      besoin,
      localisation: localisation || null,
      dateDemarrageSouhaitee: dateDemarrage ? new Date(dateDemarrage) : null,
      status: CONTACT_REQUEST_STATUS.NOUVELLE,
      bmNotifieId: consultant.businessManagerId,
    },
  });

  if (consultant.businessManager.email) {
    await sendContactRequestNotification(consultant.businessManager.email, {
      clientName: session.user.name ?? session.user.email ?? "Un client",
      reference: consultant.referenceAnonyme,
      besoin,
    });
  }

  revalidatePath("/admin/demandes");
  return { success: true };
}
