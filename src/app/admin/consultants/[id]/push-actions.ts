"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { canAccessEntreprise } from "@/lib/crm-access";
import { buildDcDocx, dcConsultantInclude } from "@/lib/dc-docx";
import { sendCandidatPropositionEmail } from "@/lib/mail";
import { SUIVI_COMMERCIAL_TYPE } from "@/lib/constants";

/** Propose un candidat (DC) à un contact CRM : trace visible sur la fiche
 * candidat ET sur la fiche du contact (même ligne, un SuiviCommercial
 * rattaché aux deux), + email avec le DC en pièce jointe. */
export async function pushCandidatToClientAction(formData: FormData) {
  const session = await requireStaff();

  const consultantId = String(formData.get("consultantId") ?? "");
  const entrepriseId = String(formData.get("entrepriseId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  const message = String(formData.get("message") ?? "").trim() || null;

  if (!consultantId || !entrepriseId || !contactId) return;

  const entreprise = await prisma.entreprise.findUnique({ where: { id: entrepriseId } });
  if (!entreprise || !canAccessEntreprise(session.user, entreprise)) {
    return;
  }

  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!contact || contact.entrepriseId !== entrepriseId || !contact.email) return;

  const consultant = await prisma.consultant.findUnique({
    where: { id: consultantId },
    include: dcConsultantInclude,
  });
  if (!consultant) return;

  const docxBuffer = await buildDcDocx(consultant);
  const docxFilename = `DC_HYPERION_${consultant.referenceAnonyme}.docx`
    .replace(/\s+/g, "_")
    .replace(/[^\w.-]/g, "");

  await sendCandidatPropositionEmail(contact.email, {
    contactName: `${contact.prenom} ${contact.nom}`,
    bmName: session.user.name || "Votre contact HYPERION",
    reference: consultant.referenceAnonyme,
    intitulePoste: consultant.intitulePoste,
    message,
    docxBuffer,
    docxFilename,
  });

  await prisma.suiviCommercial.create({
    data: {
      entrepriseId,
      contactId,
      consultantId,
      type: SUIVI_COMMERCIAL_TYPE.PROPOSITION_ENVOYEE,
      titre: `Proposition envoyée : ${consultant.referenceAnonyme}${
        consultant.intitulePoste ? ` — ${consultant.intitulePoste}` : ""
      }`,
      notes: message,
      fait: true,
      createdById: session.user.id,
    },
  });

  revalidatePath(`/admin/consultants/${consultantId}`);
  revalidatePath(`/admin/crm/${entrepriseId}/contacts/${contactId}`);
  revalidatePath("/admin/crm/activites");

  redirect(`/admin/consultants/${consultantId}?propose=1`);
}
