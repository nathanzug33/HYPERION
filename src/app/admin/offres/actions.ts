"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { canAccessOffre } from "@/lib/offre-access";
import { canAccessEntreprise } from "@/lib/crm-access";
import { generateNextOffreReference, generateNextReference } from "@/lib/reference-generator";
import { STATUT_OFFRE, STATUT_CANDIDATURE, STATUT_PUBLICATION } from "@/lib/constants";

function computeRetentionDate(dateCollecte: Date, dureeMois: number): Date {
  const d = new Date(dateCollecte);
  d.setMonth(d.getMonth() + dureeMois);
  return d;
}

async function assertOffreAccess(offreId: string) {
  const session = await requireStaff();
  const offre = await prisma.offre.findUnique({ where: { id: offreId } });
  if (!offre) redirect("/admin/offres");
  if (!canAccessOffre(session.user, offre)) redirect("/admin/offres");
  return { session, offre };
}

function readOffreFields(formData: FormData) {
  return {
    titre: String(formData.get("titre") ?? "").trim(),
    descriptif: String(formData.get("descriptif") ?? "").trim() || null,
    profilRecherche: String(formData.get("profilRecherche") ?? "").trim() || null,
    typeContratOffre: String(formData.get("typeContratOffre") ?? "") || null,
    tjmMin: formData.get("tjmMin") ? Number(formData.get("tjmMin")) : null,
    tjmMax: formData.get("tjmMax") ? Number(formData.get("tjmMax")) : null,
    salaireMin: formData.get("salaireMin") ? Number(formData.get("salaireMin")) : null,
    salaireMax: formData.get("salaireMax") ? Number(formData.get("salaireMax")) : null,
    localisation: String(formData.get("localisation") ?? "").trim() || null,
    dateDemarrage: formData.get("dateDemarrage")
      ? new Date(String(formData.get("dateDemarrage")))
      : null,
  };
}

/** Crée une offre — librement (sourcing proactif) ou à partir d'un besoin
 * (besoinId fourni depuis la fiche besoin, champs pré-remplis côté
 * formulaire). Un besoin peut donner lieu à plusieurs offres. */
export async function createOffreAction(formData: FormData) {
  const session = await requireStaff();

  const fields = readOffreFields(formData);
  if (!fields.titre) return;

  const besoinId = String(formData.get("besoinId") ?? "") || null;
  let entrepriseId: string | null = null;

  if (besoinId) {
    const besoin = await prisma.besoin.findUnique({ where: { id: besoinId } });
    if (!besoin) return;
    const entreprise = await prisma.entreprise.findUnique({ where: { id: besoin.entrepriseId } });
    if (!entreprise || !canAccessEntreprise(session.user, entreprise)) return;
    entrepriseId = besoin.entrepriseId;
  }

  const reference = await generateNextOffreReference();

  const offre = await prisma.offre.create({
    data: {
      ...fields,
      reference,
      besoinId,
      entrepriseId,
      businessManagerId: session.user.id,
    },
  });

  revalidatePath("/admin/offres");
  if (besoinId) {
    const besoin = await prisma.besoin.findUnique({ where: { id: besoinId } });
    if (besoin) revalidatePath(`/admin/crm/${besoin.entrepriseId}/besoins/${besoinId}`);
  }
  redirect(`/admin/offres/${offre.id}`);
}

export async function updateOffreAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await assertOffreAccess(id);

  const fields = readOffreFields(formData);
  if (!fields.titre) return;

  await prisma.offre.update({ where: { id }, data: fields });

  revalidatePath(`/admin/offres/${id}`);
  revalidatePath("/admin/offres");
  revalidatePath("/offres");
}

export async function publierOffreAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await assertOffreAccess(id);

  await prisma.offre.update({
    where: { id },
    data: { statut: STATUT_OFFRE.PUBLIEE, datePublication: new Date(), dateDepublication: null },
  });

  revalidatePath(`/admin/offres/${id}`);
  revalidatePath("/admin/offres");
  revalidatePath("/offres");
}

export async function depublierOffreAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await assertOffreAccess(id);

  await prisma.offre.update({
    where: { id },
    data: { statut: STATUT_OFFRE.DEPUBLIEE, dateDepublication: new Date() },
  });

  revalidatePath(`/admin/offres/${id}`);
  revalidatePath("/admin/offres");
  revalidatePath("/offres");
}

export async function marquerPourvueOffreAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await assertOffreAccess(id);

  await prisma.offre.update({ where: { id }, data: { statut: STATUT_OFFRE.POURVUE } });

  revalidatePath(`/admin/offres/${id}`);
  revalidatePath("/admin/offres");
  revalidatePath("/offres");
}

export async function archiverOffreAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await assertOffreAccess(id);

  await prisma.offre.update({ where: { id }, data: { statut: STATUT_OFFRE.ARCHIVEE } });

  revalidatePath(`/admin/offres/${id}`);
  revalidatePath("/admin/offres");
  revalidatePath("/offres");
}

/** Ajoute une candidature reçue au vivier ATS : crée un nouveau dossier
 * Consultant à partir des informations saisies (identité, coordonnées,
 * CV) et lie la candidature au dossier créé. */
export async function ajouterCandidatureAuVivierAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const candidature = await prisma.candidature.findUnique({
    where: { id },
    include: { offre: true },
  });
  if (!candidature) return;
  const session = await requireStaff();
  if (!canAccessOffre(session.user, candidature.offre)) return;

  const reference = await generateNextReference();
  const dateCollecte = new Date();

  const consultant = await prisma.consultant.create({
    data: {
      nom: candidature.nom,
      prenom: candidature.prenom,
      email: candidature.email,
      telephone: candidature.telephone,
      notesEntretien: `Candidature reçue sur l'offre ${candidature.offre.reference} — ${candidature.offre.titre}.${
        candidature.message ? `\n\n${candidature.message}` : ""
      }`,
      businessManagerId: candidature.offre.businessManagerId,
      dateRencontre: dateCollecte,
      referenceAnonyme: reference,
      dateCollecte,
      dateConservationLimite: computeRetentionDate(dateCollecte, 24),
      statutPublication: STATUT_PUBLICATION.BROUILLON,
      cvFileUrl: candidature.cvFileUrl,
      cvFileNomOriginal: candidature.cvFileNomOriginal,
      consentementRgpd: candidature.consentementRgpd,
      consentementDate: candidature.consentementRgpd ? candidature.createdAt : null,
    },
  });

  await prisma.candidature.update({
    where: { id },
    data: { statut: STATUT_CANDIDATURE.AJOUTEE_VIVIER, consultantId: consultant.id },
  });

  revalidatePath(`/admin/offres/${candidature.offreId}`);
  revalidatePath("/admin/consultants");
  redirect(`/admin/consultants/${consultant.id}`);
}

export async function rejeterCandidatureAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const candidature = await prisma.candidature.findUnique({
    where: { id },
    include: { offre: true },
  });
  if (!candidature) return;
  const session = await requireStaff();
  if (!canAccessOffre(session.user, candidature.offre)) return;

  await prisma.candidature.update({ where: { id }, data: { statut: STATUT_CANDIDATURE.REJETEE } });

  revalidatePath(`/admin/offres/${candidature.offreId}`);
}
