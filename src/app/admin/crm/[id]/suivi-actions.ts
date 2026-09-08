"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { canAccessEntreprise } from "@/lib/crm-access";
import { SUIVI_COMMERCIAL_TYPE_SAISISSABLES, MODALITE_RDV } from "@/lib/constants";

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

  await prisma.suiviCommercial.create({
    data: {
      entrepriseId,
      contactId,
      type,
      modalite,
      titre,
      notes,
      dateProgrammee,
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

  if (suivi.contactId) {
    revalidatePath(`/admin/crm/${suivi.entrepriseId}/contacts/${suivi.contactId}`);
  }
  revalidatePath("/admin/crm/activites");
  revalidatePath("/admin");
}
