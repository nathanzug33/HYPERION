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
    <div className="relative min-h-screen overflow-hidden">
      <div className="topbar-gradient absolute inset-0" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div className="animate-fade-in w-full max-w-sm rounded-2xl bg-white p-7 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.35)]">
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
                <input id="email" name="email" type="email" required className="input mt-1.5" />
              </div>
              <button
                type="submit"
                disabled={pending}
                className="btn btn-primary w-full py-2.5 disabled:opacity-60"
              >
                {pending ? "Envoi…" : "Envoyer le lien"}
              </button>
            </form>
          )}
          <div className="mt-4 text-center">
            <Link href="/connexion" className="link-underline text-xs text-brand-gray hover:text-brand-ink">
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
