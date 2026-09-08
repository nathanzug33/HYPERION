"use client";

import { useState } from "react";
import { pushCandidatToClientAction } from "./push-actions";

type Contact = { id: string; prenom: string; nom: string; email: string | null };
type EntrepriseOption = { id: string; nom: string; contacts: Contact[] };

export default function PushCandidatForm({
  consultantId,
  entreprises,
}: {
  consultantId: string;
  entreprises: EntrepriseOption[];
}) {
  const [entrepriseId, setEntrepriseId] = useState("");
  const selected = entreprises.find((e) => e.id === entrepriseId);
  const contactsAvecEmail = selected?.contacts.filter((c) => c.email) ?? [];

  return (
    <form action={pushCandidatToClientAction} className="space-y-2">
      <input type="hidden" name="consultantId" value={consultantId} />
      <select
        name="entrepriseId"
        value={entrepriseId}
        onChange={(e) => setEntrepriseId(e.target.value)}
        required
        className="input text-xs"
      >
        <option value="">Choisir une entreprise…</option>
        {entreprises.map((e) => (
          <option key={e.id} value={e.id}>
            {e.nom}
          </option>
        ))}
      </select>
      <select name="contactId" required disabled={!selected} className="input text-xs">
        <option value="">Choisir un interlocuteur…</option>
        {contactsAvecEmail.map((c) => (
          <option key={c.id} value={c.id}>
            {c.prenom} {c.nom} ({c.email})
          </option>
        ))}
      </select>
      {selected && contactsAvecEmail.length === 0 && (
        <p className="text-[11px] text-amber-700">
          Aucun interlocuteur avec email pour cette entreprise.
        </p>
      )}
      <textarea
        name="message"
        rows={2}
        placeholder="Message d'accompagnement (optionnel)"
        className="input text-xs"
      />
      <button type="submit" className="btn btn-secondary w-full py-1.5 text-xs">
        📤 Envoyer la proposition (DC en pièce jointe)
      </button>
    </form>
  );
}
