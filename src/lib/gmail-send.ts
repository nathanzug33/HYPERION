// Envoi d'un email via l'API Gmail, au nom d'un BM ayant connecté son
// compte Google (§ intégration Gmail) — le message part réellement de sa
// boîte, les réponses du destinataire y atterrissent directement.

type Attachment = { filename: string; content: Buffer; contentType: string };

function encodeSubject(subject: string): string {
  return `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildMimeMessage(params: {
  to: string;
  subject: string;
  text: string;
  attachments?: Attachment[];
}): string {
  const boundary = `hyperion_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const lines: string[] = [
    `To: ${params.to}`,
    `Subject: ${encodeSubject(params.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(params.text, "utf8").toString("base64"),
  ];

  for (const att of params.attachments ?? []) {
    lines.push(
      "",
      `--${boundary}`,
      `Content-Type: ${att.contentType}; name="${att.filename}"`,
      `Content-Disposition: attachment; filename="${att.filename}"`,
      "Content-Transfer-Encoding: base64",
      "",
      att.content.toString("base64")
    );
  }

  lines.push("", `--${boundary}--`, "");
  return lines.join("\r\n");
}

/** Envoie un email via l'API Gmail avec le access token fourni. Retourne
 * `true` en cas de succès ; ne jette jamais (best-effort, appelant décide
 * du repli en cas d'échec). */
export async function sendViaGmail(
  accessToken: string,
  params: { to: string; subject: string; text: string; attachments?: Attachment[] }
): Promise<boolean> {
  try {
    const raw = base64url(buildMimeMessage(params));
    const res = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw }),
      }
    );
    if (!res.ok) {
      console.error(`[gmail-send] Échec (${res.status}) :`, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[gmail-send] Erreur réseau :", err);
    return false;
  }
}
