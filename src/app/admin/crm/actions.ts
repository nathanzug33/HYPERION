"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff, requireAdmin } from "@/lib/guards";
import {
  STATUT_ENTREPRISE_LABELS,
  SUIVI_COMMERCIAL_TYPE,
  canReassignReferent,
} from "@/lib/constants";
import { canAccessEntreprise } from "@/lib/crm-access";
import { findContactDuplicates } from "@/lib/duplicate-detection";

function getMulti(formData: FormData, key: string): string[] {
  return formData.getAll(key).map(String).filter(Boolean);
}

async function assertOwnership(entrepriseId: string) {
  const session = await requireStaff();
  const entreprise = await prisma.entreprise.findUnique({
    where: { id: entrepriseId },
  });
  if (!entreprise) redirect("/admin/crm");
  if (!canAccessEntreprise(session.user, entreprise)) {
    redirect("/admin/crm");
  }
  return { session, entreprise };
}

export async function createEntrepriseAction(formData: FormData) {
  const session = await requireStaff();

  const nom = String(formData.get("nom") ?? "").trim();
  if (!nom) return;

  const businessManagerId = canReassignReferent(session.user)
    ? String(formData.get("businessManagerId") ?? session.user.id)
    : session.user.id;

  const entreprise = await prisma.entreprise.create({
    data: {
      nom,
      secteurActivite: String(formData.get("secteurActivite") ?? "") || null,
      siteWeb: String(formData.get("siteWeb") ?? "") || null,
      adresse: String(formData.get("adresse") ?? "") || null,
      ville: String(formData.get("ville") ?? "") || null,
      codePostal: String(formData.get("codePostal") ?? "") || null,
      tailleEffectif: String(formData.get("tailleEffectif") ?? "") || null,
      notes: String(formData.get("notes") ?? "") || null,
      businessManagerId,
    },
  });

  revalidatePath("/admin/crm");
  redirect(`/admin/crm/${entreprise.id}`);
}

export async function updateEntrepriseAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { session, entreprise } = await assertOwnership(id);

  const statutCommercial = String(
    formData.get("statutCommercial") ?? entreprise.statutCommercial
  );

  const data = {
    nom: String(formData.get("nom") ?? "").trim() || entreprise.nom,
    secteurActivite: String(formData.get("secteurActivite") ?? "") || null,
    siteWeb: String(formData.get("siteWeb") ?? "") || null,
    adresse: String(formData.get("adresse") ?? "") || null,
    ville: String(formData.get("ville") ?? "") || null,
    codePostal: String(formData.get("codePostal") ?? "") || null,
    tailleEffectif: String(formData.get("tailleEffectif") ?? "") || null,
    notes: String(formData.get("notes") ?? "") || null,
    statutCommercial,
    businessManagerId:
      canReassignReferent(session.user) && formData.get("businessManagerId")
        ? String(formData.get("businessManagerId"))
        : entreprise.businessManagerId,
  };

  const statutChange =
    statutCommercial !== entreprise.statutCommercial
      ? { from: entreprise.statutCommercial, to: statutCommercial }
      : null;

  const secteurRechercheIds = getMulti(formData, "secteurRechercheIds");
  const expertiseRechercheIds = getMulti(formData, "expertiseRechercheIds");

  await prisma.$transaction([
    prisma.entreprise.update({ where: { id }, data }),
    ...(statutChange
      ? [
          prisma.suiviCommercial.create({
            data: {
              entrepriseId: id,
              type: SUIVI_COMMERCIAL_TYPE.STATUT,
              titre: `Statut commercial : ${
                STATUT_ENTREPRISE_LABELS[
                  statutChange.from as keyof typeof STATUT_ENTREPRISE_LABELS
                ] ?? statutChange.from
              } → ${
                STATUT_ENTREPRISE_LABELS[
                  statutChange.to as keyof typeof STATUT_ENTREPRISE_LABELS
                ] ?? statutChange.to
              }`,
              fait: true,
              createdById: session.user.id,
            },
          }),
        ]
      : []),
    prisma.entrepriseSecteurRecherche.deleteMany({ where: { entrepriseId: id } }),
    prisma.entrepriseSecteurRecherche.createMany({
      data: secteurRechercheIds.map((secteurId) => ({ entrepriseId: id, secteurId })),
    }),
    prisma.entrepriseExpertiseRecherchee.deleteMany({ where: { entrepriseId: id } }),
    prisma.entrepriseExpertiseRecherchee.createMany({
      data: expertiseRechercheIds.map((expertiseId) => ({ entrepriseId: id, expertiseId })),
    }),
  ]);

  revalidatePath(`/admin/crm/${id}`);
  revalidatePath("/admin/crm");
}

export async function deleteEntrepriseAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await prisma.entreprise.delete({ where: { id } });
  revalidatePath("/admin/crm");
  redirect("/admin/crm");
}

export async function createContactAction(formData: FormData) {
  const entrepriseId = String(formData.get("entrepriseId") ?? "");
  await assertOwnership(entrepriseId);

  const prenom = String(formData.get("prenom") ?? "").trim();
  const nom = String(formData.get("nom") ?? "").trim();
  if (!prenom || !nom) return;
  const email = String(formData.get("email") ?? "") || null;

  const contact = await prisma.contact.create({
    data: {
      entrepriseId,
      prenom,
      nom,
      fonction: String(formData.get("fonction") ?? "") || null,
      email,
      telephone: String(formData.get("telephone") ?? "") || null,
      notes: String(formData.get("notes") ?? "") || null,
      principal: formData.get("principal") === "on",
    },
  });

  revalidatePath(`/admin/crm/${entrepriseId}`);

  const doublons = await findContactDuplicates(entrepriseId, nom, prenom, email, contact.id);
  if (doublons.length > 0) {
    redirect(`/admin/crm/${entrepriseId}?doublonContact=${doublons.map((d) => d.id).join(",")}`);
  }
}

export async function updateContactAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact) return;
  await assertOwnership(contact.entrepriseId);

  const prenom = String(formData.get("prenom") ?? "").trim();
  const nom = String(formData.get("nom") ?? "").trim();
  if (!prenom || !nom) return;

  await prisma.contact.update({
    where: { id },
    data: {
      prenom,
      nom,
      fonction: String(formData.get("fonction") ?? "") || null,
      email: String(formData.get("email") ?? "") || null,
      telephone: String(formData.get("telephone") ?? "") || null,
      notes: String(formData.get("notes") ?? "") || null,
      principal: formData.get("principal") === "on",
    },
  });

  revalidatePath(`/admin/crm/${contact.entrepriseId}`);
}

export async function deleteContactAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact) return;
  await assertOwnership(contact.entrepriseId);

  await prisma.contact.delete({ where: { id } });

  revalidatePath(`/admin/crm/${contact.entrepriseId}`);
  // Supprimé depuis la fiche de l'interlocuteur lui-même — cette page
  // n'existe plus, on ramène vers la fiche entreprise.
  redirect(`/admin/crm/${contact.entrepriseId}`);
}
