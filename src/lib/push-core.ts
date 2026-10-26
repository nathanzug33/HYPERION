import { prisma } from "@/lib/prisma";
import { ensureReferenceAnonyme } from "@/lib/reference-generator";
import { buildDcDocx, dcConsultantInclude, type DcConsultant } from "@/lib/dc-docx";
import { sendCandidatPropositionEmail, buildCandidatPropositionEmail } from "@/lib/mail";
import { sendViaGmail } from "@/lib/gmail-send";
import { SUIVI_COMMERCIAL_TYPE, formatSalutationNom } from "@/lib/constants";

/** Cœur de l'envoi d'une proposition candidat (push) : email avec le DC en
 * pièce jointe + trace SuiviCommercial, réutilisé par le push unitaire et les
 * deux sens de push en masse (un candidat -> plusieurs contacts, et
 * plusieurs candidats -> un contact). Ne fait aucune vérification d'accès :
 * l'appelant doit avoir validé que l'entreprise/le candidat sont accessibles
 * à l'utilisateur courant. */
export async function sendPushEmailAndLog(params: {
  consultant: Pick<DcConsultant, "id" | "referenceAnonyme" | "intitulePoste">;
  docxBuffer: Buffer;
  docxFilename: string;
  entrepriseId: string;
  contact: { id: string; civilite?: string | null; prenom: string; nom: string; email: string | null };
  disponibilite: string | null;
  localisation: string | null;
  competences: string[];
  message: string | null;
  bmUserId: string;
  sender: { name: string; poste: string | null; email: string; telephone: string | null };
  googleAccessToken: string | null;
}): Promise<boolean> {
  const {
    consultant,
    docxBuffer,
    docxFilename,
    entrepriseId,
    contact,
    disponibilite,
    localisation,
    competences,
    message,
    bmUserId,
    sender,
    googleAccessToken,
  } = params;
  if (!contact.email) return false;

  const propositionParams = {
    contactName: formatSalutationNom(contact),
    profilTitre: consultant.intitulePoste || consultant.referenceAnonyme || "ce profil",
    disponibilite,
    localisation,
    competences,
    message,
    sender,
    docxBuffer,
    docxFilename,
  };

  // Si le BM a connecté son compte Google, l'email part réellement de sa
  // boîte Gmail (réponses du contact dans sa messagerie). Sinon, repli sur
  // le canal générique (SMTP en prod, journal en dev).
  let sentViaGmail = false;
  if (googleAccessToken) {
    const { subject, text } = buildCandidatPropositionEmail(propositionParams);
    sentViaGmail = await sendViaGmail(googleAccessToken, {
      to: contact.email,
      subject,
      text,
      attachments: [
        {
          filename: docxFilename,
          content: docxBuffer,
          contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        },
      ],
    });
  }
  if (!sentViaGmail) {
    await sendCandidatPropositionEmail(contact.email, propositionParams);
  }

  await prisma.suiviCommercial.create({
    data: {
      entrepriseId,
      contactId: contact.id,
      consultantId: consultant.id,
      type: SUIVI_COMMERCIAL_TYPE.PROPOSITION_ENVOYEE,
      titre: `Proposition envoyée : ${consultant.referenceAnonyme}${
        consultant.intitulePoste ? ` — ${consultant.intitulePoste}` : ""
      }`,
      notes: message,
      fait: true,
      createdById: bmUserId,
    },
  });

  return true;
}

export async function buildDcForConsultant(consultantId: string) {
  await ensureReferenceAnonyme(consultantId);
  const consultant = await prisma.consultant.findUnique({
    where: { id: consultantId },
    include: dcConsultantInclude,
  });
  if (!consultant) return null;
  const docxBuffer = await buildDcDocx(consultant);
  const docxFilename = `DC_HYPERION_${consultant.referenceAnonyme}.docx`
    .replace(/\s+/g, "_")
    .replace(/[^\w.-]/g, "");
  return { consultant, docxBuffer, docxFilename };
}

/** Coordonnées de l'expéditeur pour la signature de l'email de proposition
 * (§ pas de signature Gmail automatique, voir mail.ts) — lues depuis la
 * fiche BM (page Mon compte), pas depuis le JWT de session. */
export async function resolveSenderInfo(
  userId: string
): Promise<{ name: string; poste: string | null; email: string; telephone: string | null }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, poste: true, email: true, telephone: true },
  });
  return {
    name: user?.name || "Votre contact HYPERION",
    poste: user?.poste ?? null,
    email: user?.email ?? "",
    telephone: user?.telephone ?? null,
  };
}
