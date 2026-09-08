"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { canAccessConsultant } from "@/lib/consultant-access";

export async function updateContactRequestStatus(formData: FormData) {
  const session = await requireStaff();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !status) return;

  const request = await prisma.contactRequest.findUnique({
    where: { id },
    include: { consultant: true },
  });
  if (!request) return;
  if (!(await canAccessConsultant(session.user, request.consultant))) {
    return;
  }

  await prisma.contactRequest.update({ where: { id }, data: { status } });
  revalidatePath("/admin/demandes");
}

// Les demandes de besoin ne sont pas rattachées à un consultant précis (donc
// à aucun BM référent) : visibles et modifiables par tout le back-office.
export async function updateDemandeBesoinStatus(formData: FormData) {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !status) return;

  await prisma.demandeBesoin.update({ where: { id }, data: { status } });
  revalidatePath("/admin/demandes");
}
