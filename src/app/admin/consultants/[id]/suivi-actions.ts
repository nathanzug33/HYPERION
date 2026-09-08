"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { canAccessConsultant } from "@/lib/consultant-access";
import { SUIVI_TYPE_SAISISSABLES } from "@/lib/constants";

async function assertConsultantAccess(consultantId: string) {
  const session = await requireStaff();
  const consultant = await prisma.consultant.findUnique({ where: { id: consultantId } });
  if (!consultant) redirect("/admin/consultants");
  if (!(await canAccessConsultant(session.user, consultant))) {
    redirect("/admin/consultants");
  }
  return { session, consultant };
}

export async function createSuiviAction(formData: FormData) {
  const consultantId = String(formData.get("consultantId") ?? "");
  const { session } = await assertConsultantAccess(consultantId);

  const type = String(formData.get("type") ?? "");
  if (!SUIVI_TYPE_SAISISSABLES.includes(type as (typeof SUIVI_TYPE_SAISISSABLES)[number])) {
    return;
  }
  const titre = String(formData.get("titre") ?? "").trim();
  if (!titre) return;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const dateProgrammeeRaw = String(formData.get("dateProgrammee") ?? "");
  const dateProgrammee = dateProgrammeeRaw ? new Date(dateProgrammeeRaw) : null;

  await prisma.suiviCandidat.create({
    data: {
      consultantId,
      type,
      titre,
      notes,
      dateProgrammee,
      createdById: session.user.id,
    },
  });

  revalidatePath(`/admin/consultants/${consultantId}`);
}

export async function toggleSuiviFaitAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const suivi = await prisma.suiviCandidat.findUnique({ where: { id } });
  if (!suivi) return;
  await assertConsultantAccess(suivi.consultantId);

  await prisma.suiviCandidat.update({
    where: { id },
    data: { fait: !suivi.fait },
  });

  revalidatePath(`/admin/consultants/${suivi.consultantId}`);
  revalidatePath("/admin");
}

export async function deleteSuiviAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const suivi = await prisma.suiviCandidat.findUnique({ where: { id } });
  if (!suivi) return;
  await assertConsultantAccess(suivi.consultantId);

  await prisma.suiviCandidat.delete({ where: { id } });

  revalidatePath(`/admin/consultants/${suivi.consultantId}`);
  revalidatePath("/admin");
}
