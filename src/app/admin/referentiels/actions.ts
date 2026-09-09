"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import {
  isReferentialType,
  CATEGORIZABLE_REFERENTIAL_TYPES,
  type ReferentialType,
} from "@/lib/referentials";

function delegateFor(type: ReferentialType) {
  switch (type) {
    case "secteur":
      return prisma.secteur;
    case "expertise":
      return prisma.expertise;
    case "seniorite":
      return prisma.seniorite;
    case "typeMobilite":
      return prisma.typeMobilite;
    case "zoneGeographique":
      return prisma.zoneGeographique;
    case "competence":
      return prisma.competence;
    case "langue":
      return prisma.langue;
    case "industrie":
      return prisma.industrie;
  }
}

export async function addReferentialItem(formData: FormData) {
  await requireAdmin();
  const type = String(formData.get("type") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  if (!isReferentialType(type) || !label) return;

  const delegate = delegateFor(type);
  // @ts-expect-error — delegates share a compatible upsert shape for this use.
  await delegate.upsert({
    where: { label },
    update: { active: true },
    create: { label },
  });
  revalidatePath("/admin/referentiels");
}

export async function toggleReferentialActive(formData: FormData) {
  await requireAdmin();
  const type = String(formData.get("type") ?? "");
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  if (!isReferentialType(type) || !id) return;

  const delegate = delegateFor(type);
  // @ts-expect-error — delegates share a compatible update shape for this use.
  await delegate.update({ where: { id }, data: { active: !active } });
  revalidatePath("/admin/referentiels");
}

export async function setReferentialCategorieAction(formData: FormData) {
  await requireAdmin();
  const type = String(formData.get("type") ?? "");
  const id = String(formData.get("id") ?? "");
  const categorie = String(formData.get("categorie") ?? "");
  if (!isReferentialType(type) || !id) return;
  if (!CATEGORIZABLE_REFERENTIAL_TYPES.includes(type)) return;

  const delegate = delegateFor(type);
  // @ts-expect-error — delegates share a compatible update shape for this use.
  await delegate.update({ where: { id }, data: { categorie: categorie || null } });
  revalidatePath("/admin/referentiels");
}
