"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { canAccessEntreprise } from "@/lib/crm-access";
import { getValidAccessToken } from "@/lib/google-oauth";
import { DISPONIBILITE_LABELS, type Disponibilite } from "@/lib/constants";
import { buildDcForConsultant, resolveSenderInfo, sendPushEmailAndLog } from "@/lib/push-core";
import { competencesKeywords, formatLocalisation } from "@/lib/push-format";

/** Exécute réellement l'envoi d'une proposition préparée par l'agent IA
 * (outil preparer_push_candidat) — appelé uniquement après confirmation
 * explicite de l'utilisateur dans le chat, jamais par le modèle lui-même.
 * Réutilise exactement le même cœur d'envoi que les formulaires de push
 * classiques (src/lib/push-core.ts). */
export async function confirmAgentPushAction(params: {
  consultantId: string;
  entrepriseId: string;
  contactId: string;
  message: string | null;
}): Promise<{ ok: boolean; erreur?: string }> {
  const session = await requireStaff();

  const entreprise = await prisma.entreprise.findUnique({ where: { id: params.entrepriseId } });
  if (!entreprise || !canAccessEntreprise(session.user, entreprise)) {
    return { ok: false, erreur: "Entreprise introuvable ou inaccessible." };
  }
  const contact = await prisma.contact.findUnique({ where: { id: params.contactId } });
  if (!contact || contact.entrepriseId !== params.entrepriseId || !contact.email) {
    return { ok: false, erreur: "Interlocuteur introuvable ou sans email." };
  }
  const dc = await buildDcForConsultant(params.consultantId);
  if (!dc) return { ok: false, erreur: "Candidat introuvable." };

  const [googleAccessToken, sender] = await Promise.all([
    getValidAccessToken(session.user.id),
    resolveSenderInfo(session.user.id),
  ]);

  const dispoCode = dc.consultant.disponibilite;
  const ok = await sendPushEmailAndLog({
    consultant: dc.consultant,
    docxBuffer: dc.docxBuffer,
    docxFilename: dc.docxFilename,
    entrepriseId: params.entrepriseId,
    contact,
    disponibilite: dispoCode ? (DISPONIBILITE_LABELS[dispoCode as Disponibilite] ?? null) : null,
    localisation: formatLocalisation(dc.consultant.villeRattachement, dc.consultant.rayonKm),
    competences: competencesKeywords(dc.consultant.competences),
    message: params.message,
    bmUserId: session.user.id,
    sender,
    googleAccessToken,
  });

  if (!ok) return { ok: false, erreur: "Échec de l'envoi (email manquant ou erreur technique)." };

  revalidatePath(`/admin/consultants/${params.consultantId}`);
  revalidatePath(`/admin/crm/${params.entrepriseId}`);
  revalidatePath(`/admin/crm/${params.entrepriseId}/contacts/${params.contactId}`);
  revalidatePath("/admin/crm/activites");

  return { ok: true };
}
