"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireClient } from "@/lib/guards";
import { sendDemandeBesoinNotification } from "@/lib/mail";
import { CONTACT_REQUEST_STATUS, ROLES } from "@/lib/constants";

export type SubmitBesoinState = { error?: string };

export async function submitDemandeBesoin(
  _prev: SubmitBesoinState,
  formData: FormData
): Promise<SubmitBesoinState> {
  const session = await requireClient();

  const intitulePoste = String(formData.get("intitulePoste") ?? "").trim();
  const descriptifPoste = String(formData.get("descriptifPoste") ?? "").trim();
  const seniorite = String(formData.get("seniorite") ?? "").trim() || null;
  const tjmCibleMin = formData.get("tjmCibleMin")
    ? Number(formData.get("tjmCibleMin"))
    : null;
  const tjmCibleMax = formData.get("tjmCibleMax")
    ? Number(formData.get("tjmCibleMax"))
    : null;
  const localisation = String(formData.get("localisation") ?? "").trim() || null;
  const dureeEstimee = String(formData.get("dureeEstimee") ?? "").trim() || null;
  const dateDemarrage = String(formData.get("dateDemarrageSouhaitee") ?? "");

  if (!intitulePoste || !descriptifPoste) {
    return { error: "Merci de préciser au moins l'intitulé et le descriptif du poste." };
  }

  await prisma.demandeBesoin.create({
    data: {
      clientUserId: session.user.id,
      intitulePoste,
      descriptifPoste,
      seniorite,
      tjmCibleMin,
      tjmCibleMax,
      localisation,
      dureeEstimee,
      dateDemarrageSouhaitee: dateDemarrage ? new Date(dateDemarrage) : null,
      status: CONTACT_REQUEST_STATUS.NOUVELLE,
    },
  });

  const staff = await prisma.user.findMany({
    where: { active: true, role: { in: [ROLES.ADMIN, ROLES.BM] } },
    select: { email: true },
  });
  await Promise.all(
    staff.map((u) =>
      sendDemandeBesoinNotification(u.email, {
        clientName: session.user.name ?? session.user.email ?? "Un client",
        intitulePoste,
        descriptifPoste,
      })
    )
  );

  revalidatePath("/admin/demandes");
  revalidatePath("/bibliotheque/demandes");
  redirect("/bibliotheque/demandes?envoye=1");
}
