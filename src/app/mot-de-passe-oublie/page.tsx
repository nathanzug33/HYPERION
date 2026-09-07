"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, type ForgotState } from "./actions";

const initialState: ForgotState = {};

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    initialState
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-blue-bg-soft px-4">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-brand-ink mb-4">
          Mot de passe oublié
        </h1>
        {state.done ? (
          <p className="text-sm text-brand-body">
            Si un compte actif existe avec cet email, un lien de
            réinitialisation valable 1 heure vient d&apos;être envoyé.
          </p>
        ) : (
          <form action={formAction} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-brand-body">
                Email professionnel
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-md bg-brand-ink py-2 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:opacity-60"
            >
              {pending ? "Envoi…" : "Envoyer le lien"}
            </button>
          </form>
        )}
        <div className="mt-4 text-center">
          <Link href="/connexion" className="text-xs text-brand-gray underline">
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
