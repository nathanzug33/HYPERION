"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { SAVED_LIST_SCOPE, SAVED_LIST_VISIBILITY } from "@/lib/constants";

const ALLOWED_SCOPES: string[] = Object.values(SAVED_LIST_SCOPE);
// Un chemin par portée — évite qu'un appel forgé n'enregistre une liste
// pointant n'importe où dans l'admin sous couvert d'un scope valide.
const PATH_BY_SCOPE: Record<string, string> = {
  ATS_CANDIDATS: "/admin/consultants/recherche",
  CRM_ENTREPRISES: "/admin/crm",
  CRM_CONTACTS: "/admin/crm/contacts",
};

export async function createSavedListAction(formData: FormData) {
  const session = await requireStaff();
  const name = String(formData.get("name") ?? "").trim();
  const scope = String(formData.get("scope") ?? "");
  const queryString = String(formData.get("queryString") ?? "").replace(/^\?/, "");
  const visibility =
    formData.get("visibility") === SAVED_LIST_VISIBILITY.PARTAGEE
      ? SAVED_LIST_VISIBILITY.PARTAGEE
      : SAVED_LIST_VISIBILITY.PRIVEE;

  if (!name || !ALLOWED_SCOPES.includes(scope)) return;

  await prisma.savedList.create({
    data: {
      name,
      scope,
      path: PATH_BY_SCOPE[scope],
      queryString,
      visibility,
      ownerId: session.user.id,
    },
  });

  revalidatePath("/admin/listes");
}

export async function deleteSavedListAction(formData: FormData) {
  const session = await requireStaff();
  const id = String(formData.get("id") ?? "");
  const list = await prisma.savedList.findUnique({ where: { id } });
  if (!list || list.ownerId !== session.user.id) return;

  await prisma.savedList.delete({ where: { id } });
  revalidatePath("/admin/listes");
}

export async function toggleSavedListVisibilityAction(formData: FormData) {
  const session = await requireStaff();
  const id = String(formData.get("id") ?? "");
  const list = await prisma.savedList.findUnique({ where: { id } });
  if (!list || list.ownerId !== session.user.id) return;

  await prisma.savedList.update({
    where: { id },
    data: {
      visibility:
        list.visibility === SAVED_LIST_VISIBILITY.PARTAGEE
          ? SAVED_LIST_VISIBILITY.PRIVEE
          : SAVED_LIST_VISIBILITY.PARTAGEE,
    },
  });
  revalidatePath("/admin/listes");
}
