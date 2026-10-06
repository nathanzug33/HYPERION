"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { canAccessEntreprise } from "@/lib/crm-access";
import { getValidAccessToken } from "@/lib/google-oauth";
import { buildDcForConsultant, sendPushEmailAndLog } from "@/lib/push-core";

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

  const dc = await buildDcForConsultant(consultantId);
  if (!dc) return;

  const googleAccessToken = await getValidAccessToken(session.user.id);

  await sendPushEmailAndLog({
    consultant: dc.consultant,
    docxBuffer: dc.docxBuffer,
    docxFilename: dc.docxFilename,
    entrepriseId,
    contact,
    message,
    bmUserId: session.user.id,
    bmName: session.user.name || "Votre contact HYPERION",
    googleAccessToken,
  });

  revalidatePath(`/admin/consultants/${consultantId}`);
  revalidatePath(`/admin/crm/${entrepriseId}/contacts/${contactId}`);
  revalidatePath("/admin/crm/activites");

  redirect(`/admin/consultants/${consultantId}?propose=1`);
}

/** Push en masse : un candidat vers plusieurs contacts CRM sélectionnés
 * (typiquement depuis les suggestions par poste/secteur/expertise de la
 * fiche candidat). Le DC est généré une seule fois et réutilisé pour tous
 * les envois. */
export async function pushCandidatToManyAction(formData: FormData) {
  const session = await requireStaff();

  const consultantId = String(formData.get("consultantId") ?? "");
  const message = String(formData.get("message") ?? "").trim() || null;
  const contactIds = formData.getAll("contactIds").map(String).filter(Boolean);

  if (!consultantId || contactIds.length === 0) return;

  const dc = await buildDcForConsultant(consultantId);
  if (!dc) return;

  const contacts = await prisma.contact.findMany({
    where: { id: { in: contactIds } },
    include: { entreprise: true },
  });

  const googleAccessToken = await getValidAccessToken(session.user.id);
  const touchedEntrepriseIds = new Set<string>();
  let sent = 0;

  for (const contact of contacts) {
    if (!canAccessEntreprise(session.user, contact.entreprise) || !contact.email) continue;
    const ok = await sendPushEmailAndLog({
      consultant: dc.consultant,
      docxBuffer: dc.docxBuffer,
      docxFilename: dc.docxFilename,
      entrepriseId: contact.entrepriseId,
      contact,
      message,
      bmUserId: session.user.id,
      bmName: session.user.name || "Votre contact HYPERION",
      googleAccessToken,
    });
    if (ok) {
      sent += 1;
      touchedEntrepriseIds.add(contact.entrepriseId);
    }
  }

  revalidatePath(`/admin/consultants/${consultantId}`);
  for (const eid of touchedEntrepriseIds) revalidatePath(`/admin/crm/${eid}`);
  revalidatePath("/admin/crm/activites");

  redirect(`/admin/consultants/${consultantId}?pushedMany=${sent}`);
}
