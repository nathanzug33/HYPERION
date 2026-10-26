"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { canAccessEntreprise } from "@/lib/crm-access";
import { getValidAccessToken } from "@/lib/google-oauth";
import { DISPONIBILITE_LABELS, type Disponibilite } from "@/lib/constants";
import { buildDcForConsultant, resolveSenderInfo, sendPushEmailAndLog } from "@/lib/push-core";
import { competencesKeywords, formatLocalisation } from "@/lib/push-format";

/** Push en masse, sens inverse : plusieurs candidats sélectionnés vers un
 * seul contact CRM (typiquement depuis les suggestions par poste/secteur de
 * la fiche contact). Un DC différent est généré par candidat. */
export async function pushCandidatsToContactAction(formData: FormData) {
  const session = await requireStaff();

  const entrepriseId = String(formData.get("entrepriseId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  const message = String(formData.get("message") ?? "").trim() || null;
  const consultantIds = formData.getAll("consultantIds").map(String).filter(Boolean);

  if (!entrepriseId || !contactId || consultantIds.length === 0) return;

  const entreprise = await prisma.entreprise.findUnique({ where: { id: entrepriseId } });
  if (!entreprise || !canAccessEntreprise(session.user, entreprise)) return;

  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!contact || contact.entrepriseId !== entrepriseId || !contact.email) return;

  const [googleAccessToken, sender] = await Promise.all([
    getValidAccessToken(session.user.id),
    resolveSenderInfo(session.user.id),
  ]);
  let sent = 0;

  for (const consultantId of consultantIds) {
    const dc = await buildDcForConsultant(consultantId);
    if (!dc) continue;
    // Pas de saisie manuelle ici (plusieurs candidats différents dans le même
    // envoi) : disponibilité/localisation sont toujours celles de la fiche de
    // chaque candidat.
    const dispoCode = dc.consultant.disponibilite;
    const ok = await sendPushEmailAndLog({
      consultant: dc.consultant,
      docxBuffer: dc.docxBuffer,
      docxFilename: dc.docxFilename,
      entrepriseId,
      contact,
      disponibilite: dispoCode ? (DISPONIBILITE_LABELS[dispoCode as Disponibilite] ?? null) : null,
      localisation: formatLocalisation(dc.consultant.villeRattachement, dc.consultant.rayonKm),
      competences: competencesKeywords(dc.consultant.competences),
      message,
      bmUserId: session.user.id,
      sender,
      googleAccessToken,
    });
    if (ok) sent += 1;
  }

  revalidatePath(`/admin/crm/${entrepriseId}/contacts/${contactId}`);
  revalidatePath(`/admin/crm/${entrepriseId}`);
  revalidatePath("/admin/crm/activites");
  for (const consultantId of consultantIds) revalidatePath(`/admin/consultants/${consultantId}`);

  redirect(`/admin/crm/${entrepriseId}/contacts/${contactId}?pushedMany=${sent}`);
}
