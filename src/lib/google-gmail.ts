// Envoi d'email via l'API Gmail, au nom du compte Google connecté (§
// intégration Google) — le message part réellement de l'adresse
// professionnelle @hyperiongroup.fr du BM/admin connecté, pas d'une adresse
// technique : Gmail ignore tout "From" fourni et utilise systématiquement
// le compte authentifié, donc rien à renseigner de ce côté. Best-effort :
// un échec ne doit jamais empêcher la création du suivi qui déclenche cet
// envoi.

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Encodage MIME "encoded-word" (RFC 2047) pour un sujet contenant des
 * caractères non-ASCII (accents) — nécessaire, l'API Gmail n'encode pas
 * les en-têtes à notre place. */
function encodeHeaderUtf8(value: string): string {
  return `=?UTF-8?B?${Buffer.from(value, "utf-8").toString("base64")}?=`;
}

function buildRawMessage(input: { to: string; subject: string; bodyHtml: string }): string {
  const message = [
    `To: ${input.to}`,
    `Subject: ${encodeHeaderUtf8(input.subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    input.bodyHtml,
  ].join("\r\n");
  return base64UrlEncode(message);
}

/** Corps HTML simple de l'email d'invitation à un entretien/RDV en visio —
 * réutilisé côté ATS (candidat) et CRM (interlocuteur client). */
export function buildMeetInviteHtml(input: {
  destinataire: string;
  titre: string;
  date: Date;
  meetLink: string;
}): string {
  const dateFormatee = input.date.toLocaleString("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
  });
  return `
    <p>Bonjour ${input.destinataire},</p>
    <p>Vous êtes invité(e) à un rendez-vous en visio :</p>
    <p><strong>${input.titre}</strong><br/>${dateFormatee}</p>
    <p><a href="${input.meetLink}">${input.meetLink}</a></p>
  `.trim();
}

export async function sendGmailMessage(
  accessToken: string,
  input: { to: string; subject: string; bodyHtml: string }
): Promise<boolean> {
  try {
    const res = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: buildRawMessage(input) }),
      }
    );
    if (!res.ok) {
      console.error(`[google-gmail] Envoi échoué (${res.status}) :`, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[google-gmail] Erreur réseau (envoi) :", err);
    return false;
  }
}
