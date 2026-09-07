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
            ? "text-sm font-medium text-slate-900 underline hover:text-slate-700"
            : "rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        }
      >
        Ce profil m&apos;intéresse
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {state.success ? (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-900">
                  Demande envoyée
                </h3>
                <p className="text-sm text-slate-600">
                  Votre business manager a été notifié pour le profil{" "}
                  <span className="font-mono">{reference}</span> et reviendra
                  vers vous rapidement avec les disponibilités confirmées.
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-full rounded-md bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <form action={formAction} className="space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Profil {reference}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="text-slate-400 hover:text-slate-700"
                    aria-label="Fermer"
                  >
                    ✕
                  </button>
                </div>
                <input type="hidden" name="consultantId" value={consultantId} />
                <div>
                  <label className="block text-xs font-medium text-slate-700">
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
                    <label className="block text-xs font-medium text-slate-700">
                      Localisation
                    </label>
                    <input name="localisation" className="input mt-1" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
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
                  className="w-full rounded-md bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
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
