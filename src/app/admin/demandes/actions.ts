"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { ROLES } from "@/lib/constants";

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
  if (
    session.user.role !== ROLES.ADMIN &&
    request.consultant.businessManagerId !== session.user.id
  ) {
    return;
  }

  await prisma.contactRequest.update({ where: { id }, data: { status } });
  revalidatePath("/admin/demandes");
}
