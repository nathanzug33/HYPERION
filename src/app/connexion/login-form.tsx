"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export default function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState
  );
  // Champs contrôlés : React réinitialise les champs non contrôlés d'un
  // <form action={...Server Action}> après chaque soumission — sans ça,
  // email/mot de passe seraient vidés au moment de demander le code 2FA,
  // et la seconde soumission (avec le code) échouerait silencieusement.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-brand-body">
          Email professionnel
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          readOnly={state.twoFactorRequired}
          className={
            state.twoFactorRequired
              ? "input mt-1.5 bg-slate-50 text-brand-gray"
              : "input mt-1.5"
          }
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-brand-body">
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          readOnly={state.twoFactorRequired}
          className={
            state.twoFactorRequired
              ? "input mt-1.5 bg-slate-50 text-brand-gray"
              : "input mt-1.5"
          }
        />
      </div>
      {state.twoFactorRequired && (
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-brand-body">
            Code de vérification (application d&apos;authentification)
          </label>
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            autoComplete="one-time-code"
            autoFocus
            required
            className="input mt-1.5"
          />
        </div>
      )}
      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary w-full py-2.5 disabled:opacity-60"
      >
        {pending
          ? "Connexion…"
          : state.twoFactorRequired
            ? "Vérifier le code"
            : "Se connecter"}
      </button>
      <div className="text-center">
        <Link
          href="/mot-de-passe-oublie"
          className="link-underline text-xs text-brand-gray hover:text-brand-ink"
        >
          Mot de passe oublié ?
        </Link>
      </div>
    </form>
  );
}
