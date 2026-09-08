"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { canAccessEntreprise } from "@/lib/crm-access";
import { SUIVI_COMMERCIAL_TYPE_SAISISSABLES, SUIVI_COMMERCIAL_TYPE, MODALITE_RDV } from "@/lib/constants";
import { saveCrmFile, deleteCrmFile } from "@/lib/crm-storage";
import { getValidAccessToken } from "@/lib/google-oauth";
import { createCalendarEvent, deleteCalendarEvent } from "@/lib/google-calendar";

async function assertEntrepriseAccess(entrepriseId: string) {
  const session = await requireStaff();
  const entreprise = await prisma.entreprise.findUnique({ where: { id: entrepriseId } });
  if (!entreprise) redirect("/admin/crm");
  if (!canAccessEntreprise(session.user, entreprise)) {
    redirect("/admin/crm");
  }
  return { session, entreprise };
}

export async function createSuiviCommercialAction(formData: FormData) {
  const entrepriseId = String(formData.get("entrepriseId") ?? "");
  const { session } = await assertEntrepriseAccess(entrepriseId);

  const type = String(formData.get("type") ?? "");
  if (
    !SUIVI_COMMERCIAL_TYPE_SAISISSABLES.includes(
      type as (typeof SUIVI_COMMERCIAL_TYPE_SAISISSABLES)[number]
    )
  ) {
    return;
  }
  const titre = String(formData.get("titre") ?? "").trim();
  if (!titre) return;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const dateProgrammeeRaw = String(formData.get("dateProgrammee") ?? "");
  const dateProgrammee = dateProgrammeeRaw ? new Date(dateProgrammeeRaw) : null;
  // Chaque action est désormais rattachée à un interlocuteur précis — elle
  // se saisit depuis la fiche de ce dernier, jamais depuis la fiche
  // entreprise (seul le log automatique de changement de statut reste
  // sans interlocuteur, voir updateEntrepriseAction).
  const contactId = String(formData.get("contactId") ?? "");
  if (!contactId) return;
  const modaliteRaw = String(formData.get("modalite") ?? "");
  const modalite =
    modaliteRaw && (Object.values(MODALITE_RDV) as string[]).includes(modaliteRaw)
      ? modaliteRaw
      : null;

  const fichier = formData.get("fichier");
  const savedFichier =
    fichier instanceof File && fichier.size > 0 ? await saveCrmFile(fichier) : null;

  // Réplique en miroir dans Google Agenda si le créateur a connecté son
  // compte — best-effort, ne bloque jamais la création du suivi.
  let googleEventId: string | null = null;
  if (
    dateProgrammee &&
    (type === SUIVI_COMMERCIAL_TYPE.RDV || type === SUIVI_COMMERCIAL_TYPE.RAPPEL)
  ) {
    const accessToken = await getValidAccessToken(session.user.id);
    if (accessToken) {
      googleEventId = await createCalendarEvent(accessToken, {
        summary: titre,
        description: notes ?? undefined,
        start: dateProgrammee,
      });
    }
  }

  await prisma.suiviCommercial.create({
    data: {
      entrepriseId,
      contactId,
      type,
      modalite,
      titre,
      notes,
      dateProgrammee,
      googleEventId,
      fichierUrl: savedFichier?.storedName ?? null,
      fichierNomOriginal: savedFichier?.originalName ?? null,
      createdById: session.user.id,
    },
  });

  revalidatePath(`/admin/crm/${entrepriseId}/contacts/${contactId}`);
  revalidatePath("/admin/crm/activites");
  revalidatePath("/admin");
}

export async function toggleSuiviCommercialFaitAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const suivi = await prisma.suiviCommercial.findUnique({ where: { id } });
  if (!suivi) return;
  await assertEntrepriseAccess(suivi.entrepriseId);

  await prisma.suiviCommercial.update({
    where: { id },
    data: { fait: !suivi.fait },
  });

  if (suivi.contactId) {
    revalidatePath(`/admin/crm/${suivi.entrepriseId}/contacts/${suivi.contactId}`);
  }
  revalidatePath("/admin/crm/activites");
  revalidatePath("/admin");
}

export async function deleteSuiviCommercialAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const suivi = await prisma.suiviCommercial.findUnique({ where: { id } });
  if (!suivi) return;
  await assertEntrepriseAccess(suivi.entrepriseId);

  await prisma.suiviCommercial.delete({ where: { id } });
  await deleteCrmFile(suivi.fichierUrl);

  if (suivi.googleEventId) {
    const accessToken = await getValidAccessToken(suivi.createdById);
    if (accessToken) await deleteCalendarEvent(accessToken, suivi.googleEventId);
  }

  if (suivi.contactId) {
    revalidatePath(`/admin/crm/${suivi.entrepriseId}/contacts/${suivi.contactId}`);
  }
  revalidatePath("/admin/crm/activites");
  revalidatePath("/admin");
}
