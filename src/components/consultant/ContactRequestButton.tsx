"use client";

import { useActionState, useState } from "react";
import {
  submitContactRequest,
  type ContactRequestState,
} from "@/app/bibliotheque/actions";

const initialState: ContactRequestState = {};

export default function ContactRequestButton({
  consultantId,
  reference,
  compact,
}: {
  consultantId: string;
  reference: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    submitContactRequest,
    initialState
  );

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
        className={
          compact
            ? "text-sm font-medium text-brand-ink underline hover:text-brand-body"
            : "rounded-md bg-brand-ink px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark"
        }
      >
        Ce profil m&apos;intéresse
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {state.success ? (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-brand-ink">
                  Demande envoyée
                </h3>
                <p className="text-sm text-brand-body">
                  Votre business manager a été notifié pour le profil{" "}
                  <span className="font-mono">{reference}</span> et reviendra
                  vers vous rapidement avec les disponibilités confirmées.
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-full rounded-md bg-brand-ink py-2 text-sm font-medium text-white hover:bg-brand-blue-dark"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <form action={formAction} className="space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-brand-ink">
                    Profil {reference}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="text-brand-gray hover:text-brand-body"
                    aria-label="Fermer"
                  >
                    ✕
                  </button>
                </div>
                <input type="hidden" name="consultantId" value={consultantId} />
                <div>
                  <label className="block text-xs font-medium text-brand-body">
                    Votre besoin
                  </label>
                  <textarea
                    name="besoin"
                    required
                    rows={3}
                    placeholder="Contexte de la mission, compétences recherchées…"
                    className="input mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-brand-body">
                      Localisation
                    </label>
                    <input name="localisation" className="input mt-1" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-brand-body">
                      Démarrage souhaité
                    </label>
                    <input
                      name="dateDemarrageSouhaitee"
                      type="date"
                      className="input mt-1"
                    />
                  </div>
                </div>
                {state.error && (
                  <p className="text-sm text-red-600">{state.error}</p>
                )}
                <button
                  type="submit"
                  disabled={pending}
                  className="w-full rounded-md bg-brand-ink py-2 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:opacity-60"
                >
                  {pending ? "Envoi…" : "Envoyer la demande"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
