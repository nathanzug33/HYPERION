"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { STATUT_OFFRE } from "@/lib/constants";
import { saveCvFile } from "@/lib/cv-storage";

// Formulaire public, jamais authentifié : toujours revalider côté serveur,
// jamais faire confiance aux contraintes HTML (required, type="email"...).
const MAX_CV_SIZE = 5 * 1024 * 1024; // 5 Mo

export async function postulerAction(formData: FormData) {
  const offreId = String(formData.get("offreId") ?? "");
  const reference = String(formData.get("reference") ?? "");

  const offre = await prisma.offre.findUnique({ where: { id: offreId } });
  if (!offre || offre.statut !== STATUT_OFFRE.PUBLIEE || offre.reference !== reference) return;

  const nom = String(formData.get("nom") ?? "").trim();
  const prenom = String(formData.get("prenom") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const telephone = String(formData.get("telephone") ?? "").trim() || null;
  const message = String(formData.get("message") ?? "").trim() || null;
  const consentementRgpd = formData.get("consentementRgpd") === "on";

  if (!nom || !prenom || !email.includes("@") || !consentementRgpd) return;

  const cvFile = formData.get("cvFile");
  let savedCv: { storedName: string; originalName: string } | null = null;
  if (cvFile instanceof File && cvFile.size > 0 && cvFile.size <= MAX_CV_SIZE) {
    savedCv = await saveCvFile(cvFile);
  }

  await prisma.candidature.create({
    data: {
      offreId,
      nom,
      prenom,
      email,
      telephone,
      message,
      consentementRgpd,
      cvFileUrl: savedCv?.storedName ?? null,
      cvFileNomOriginal: savedCv?.originalName ?? null,
    },
  });

  redirect(`/offres/${reference}?candidature=envoyee`);
}
