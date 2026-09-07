// Abstraction d'envoi d'email. En l'absence de fournisseur SMTP configuré
// (SMTP_HOST), les emails sont simplement journalisés côté serveur — ce qui
// suffit pour la recette. Pour la mise en production, brancher un fournisseur
// (SMTP, Resend, Postmark…) dans `deliver()` ci-dessous.

type MailInput = {
  to: string;
  subject: string;
  text: string;
};

async function deliver({ to, subject, text }: MailInput) {
  if (!process.env.SMTP_HOST) {
    console.log(
      `[mail:dev] À: ${to}\nObjet: ${subject}\n---\n${text}\n---`
    );
    return;
  }
  // TODO production : intégrer un fournisseur SMTP/transactionnel réel.
  console.log(`[mail] Envoi à ${to} — ${subject}`);
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
