"use client";

import { disconnectGoogleAction } from "@/lib/google-actions";

export default function GoogleConnectionSection({
  connectedEmail,
  connectedAt,
}: {
  connectedEmail: string | null;
  connectedAt: Date | null;
}) {
  if (connectedEmail) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-brand-green">
          ✅ Connecté en tant que <span className="font-medium">{connectedEmail}</span>
          {connectedAt && (
            <span className="text-brand-gray">
              {" "}
              — depuis le {new Date(connectedAt).toLocaleDateString("fr-FR")}
            </span>
          )}
        </p>
        <p className="text-xs text-brand-gray">
          Les propositions candidats envoyées à des contacts CRM partent
          désormais depuis cette boîte, et les RDV/rappels que vous créez sont
          répliqués dans votre Google Agenda.
        </p>
        <form action={disconnectGoogleAction}>
          <button type="submit" className="btn btn-secondary">
            Déconnecter
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-brand-gray">
        Non connecté. Une fois connecté, vos emails de proposition candidat
        partent depuis votre propre boîte Gmail, et vos RDV/rappels
        apparaissent dans votre Google Agenda.
      </p>
      <a href="/api/google/connect" className="btn btn-primary inline-block">
        Connecter mon compte Google
      </a>
    </div>
  );
}
