"use client";

import { useState } from "react";
import Link from "next/link";
import { CIVILITE_LABELS, SUIVI_COMMERCIAL_TYPE } from "@/lib/constants";
import { quickUpdateContactAction } from "../actions";
import { createSuiviCommercialAction } from "./suivi-actions";

type Contact = {
  id: string;
  civilite: string | null;
  prenom: string;
  nom: string;
  email: string | null;
  telephone: string | null;
};

export default function ContactQuickEditPopover({
  entrepriseId,
  contact,
}: {
  entrepriseId: string;
  contact: Contact;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Modifier rapidement"
        aria-label="Modifier rapidement"
        className="link-underline text-xs text-brand-body hover:text-brand-ink"
      >
        ✏️
      </button>

      {open && (
        <div className="fixed bottom-4 right-4 z-50 w-[min(92vw,380px)] max-h-[80vh] overflow-y-auto card p-4 shadow-xl text-left">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-brand-ink">
              Modifier rapidement — {contact.prenom} {contact.nom}
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              className="text-brand-gray hover:text-brand-ink"
            >
              ✕
            </button>
          </div>

          <form
            action={quickUpdateContactAction}
            onSubmit={() => setOpen(false)}
            className="space-y-2 border-b border-slate-100 pb-4"
          >
            <input type="hidden" name="id" value={contact.id} />
            <div>
              <label className="block text-[11px] text-brand-gray">Civilité</label>
              <select
                name="civilite"
                defaultValue={contact.civilite ?? ""}
                className="input text-xs"
              >
                <option value="">—</option>
                {Object.entries(CIVILITE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-brand-gray">Prénom</label>
                <input
                  name="prenom"
                  defaultValue={contact.prenom}
                  required
                  className="input text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-brand-gray">Nom</label>
                <input name="nom" defaultValue={contact.nom} required className="input text-xs" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-brand-gray">Email</label>
              <input
                name="email"
                type="email"
                defaultValue={contact.email ?? ""}
                className="input text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] text-brand-gray">Téléphone</label>
              <input
                name="telephone"
                defaultValue={contact.telephone ?? ""}
                className="input text-xs"
              />
            </div>
            <button type="submit" className="btn btn-primary w-full py-1.5 text-xs">
              Enregistrer
            </button>
          </form>

          <form
            action={createSuiviCommercialAction}
            onSubmit={() => setOpen(false)}
            className="mt-3 space-y-2"
          >
            <input type="hidden" name="entrepriseId" value={entrepriseId} />
            <input type="hidden" name="contactId" value={contact.id} />
            <input type="hidden" name="type" value={SUIVI_COMMERCIAL_TYPE.NOTE} />
            <label className="block text-[11px] text-brand-gray">Note rapide</label>
            <input
              type="text"
              name="titre"
              required
              placeholder="Titre (ex. Relance à prévoir)"
              className="input text-xs"
            />
            <textarea
              name="notes"
              rows={2}
              placeholder="Détail (optionnel)"
              className="input text-xs"
            />
            <button type="submit" className="btn btn-secondary w-full py-1.5 text-xs">
              + Ajouter la note
            </button>
          </form>

          <Link
            href={`/admin/crm/${entrepriseId}/contacts/${contact.id}`}
            className="mt-3 block text-center text-xs text-brand-blue-dark link-underline"
          >
            Voir la fiche complète →
          </Link>
        </div>
      )}
    </>
  );
}
