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

/** Push d'un candidat (DC) vers un contact CRM — email avec le dossier de
 * compétences en pièce jointe (§ lien ATS ↔ CRM). */
export async function sendCandidatPropositionEmail(
  to: string,
  params: {
    contactName: string;
    bmName: string;
    reference: string;
    intitulePoste: string | null;
    message: string | null;
    docxBuffer: Buffer;
    docxFilename: string;
  }
) {
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

  await deliver({
    to,
    subject: `Proposition de profil — ${params.reference}`,
    text: lignesIntro.join("\n"),
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
