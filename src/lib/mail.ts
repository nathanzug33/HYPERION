// Abstraction d'envoi d'email. En l'absence de fournisseur SMTP configuré
// (SMTP_HOST), les emails sont simplement journalisés côté serveur — ce qui
// suffit pour la recette. Pour la mise en production, brancher un fournisseur
// (SMTP, Resend, Postmark…) dans `deliver()` ci-dessous.

type MailAttachment = {
  filename: string;
  content: Buffer;
  contentType: string;
};

type MailInput = {
  to: string;
  subject: string;
  text: string;
  attachments?: MailAttachment[];
};

async function deliver({ to, subject, text, attachments }: MailInput) {
  const attachmentNote = attachments?.length
    ? `\n[pièce(s) jointe(s) : ${attachments.map((a) => a.filename).join(", ")}]`
    : "";
  if (!process.env.SMTP_HOST) {
    console.log(
      `[mail:dev] À: ${to}\nObjet: ${subject}\n---\n${text}${attachmentNote}\n---`
    );
    return;
  }
  // TODO production : intégrer un fournisseur SMTP/transactionnel réel
  // (transmettre `attachments` au client d'envoi choisi).
  console.log(`[mail] Envoi à ${to} — ${subject}${attachmentNote}`);
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await deliver({
    to,
    subject: "Réinitialisation de votre mot de passe",
    text: `Pour réinitialiser votre mot de passe, suivez ce lien (valable 1h) :\n${resetUrl}`,
  });
}

/** Invitation à la création d'un compte (BM, directeur de BU, admin, client) —
 * même mécanisme que la réinitialisation (lien à durée limitée), mais texte
 * dédié pour un premier accès plutôt qu'un oubli de mot de passe. */
export async function sendAccountInvitationEmail(
  to: string,
  params: { name: string; roleLabel: string; setPasswordUrl: string }
) {
  await deliver({
    to,
    subject: "Bienvenue sur HYPERION — activez votre compte",
    text: `Bonjour ${params.name},\n\nUn compte ${params.roleLabel} vient d'être créé pour vous sur HYPERION.\n\nPour définir votre mot de passe et accéder à votre compte, suivez ce lien (valable 72h) :\n${params.setPasswordUrl}`,
  });
}

export async function sendContactRequestNotification(
  to: string,
  params: { clientName: string; reference: string; besoin: string }
) {
  await deliver({
    to,
    subject: `Nouvelle demande de contact — ${params.reference}`,
    text: `${params.clientName} s'intéresse au profil ${params.reference}.\n\nBesoin exprimé :\n${params.besoin}\n\nConsultez le back-office pour donner suite.`,
  });
}

export async function sendDemandeBesoinNotification(
  to: string,
  params: { clientName: string; intitulePoste: string; descriptifPoste: string }
) {
  await deliver({
    to,
    subject: `Nouvelle demande de besoin — ${params.intitulePoste}`,
    text: `${params.clientName} a décrit un nouveau besoin, sans profil précis en cible.\n\nPoste recherché : ${params.intitulePoste}\n\n${params.descriptifPoste}\n\nConsultez le back-office pour donner suite.`,
  });
}

type CandidatPropositionParams = {
  contactName: string;
  bmName: string;
  reference: string;
  intitulePoste: string | null;
  message: string | null;
  docxBuffer: Buffer;
  docxFilename: string;
};

/** Sujet + corps du texte de proposition — exposé séparément pour être
 * réutilisé par l'envoi via Gmail (compte du BM) en plus du repli générique
 * ci-dessous (voir src/app/admin/consultants/[id]/push-actions.ts). */
export function buildCandidatPropositionEmail(params: CandidatPropositionParams) {
  const lignesIntro = [
    `Bonjour ${params.contactName},`,
    "",
    `${params.bmName} vous propose le profil ${params.reference}${
      params.intitulePoste ? ` — ${params.intitulePoste}` : ""
    }.`,
  ];
  if (params.message) {
    lignesIntro.push("", params.message);
  }
  lignesIntro.push(
    "",
    "Vous trouverez le dossier de compétences complet (anonymisé) en pièce jointe.",
    "",
    `${params.bmName} — HYPERION`
  );

  return {
    subject: `Proposition de profil — ${params.reference}`,
    text: lignesIntro.join("\n"),
  };
}

/** Push d'un candidat (DC) vers un contact CRM — email avec le dossier de
 * compétences en pièce jointe (§ lien ATS ↔ CRM). Repli générique (journal
 * dev / SMTP) — voir push-actions.ts pour l'envoi via Gmail quand le BM a
 * connecté son compte. */
export async function sendCandidatPropositionEmail(to: string, params: CandidatPropositionParams) {
  const { subject, text } = buildCandidatPropositionEmail(params);
  await deliver({
    to,
    subject,
    text,
    attachments: [
      {
        filename: params.docxFilename,
        content: params.docxBuffer,
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
    ],
  });
}
