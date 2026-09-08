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
            ? "link-underline text-sm font-medium text-brand-blue-dark"
            : "btn btn-primary"
        }
      >
        Ce profil m&apos;intéresse
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/50 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="animate-fade-in w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
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
                  className="btn btn-primary w-full py-2.5"
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
                  className="btn btn-primary w-full py-2.5 disabled:opacity-60"
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
