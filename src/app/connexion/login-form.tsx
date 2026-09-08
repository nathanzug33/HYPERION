"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export default function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState
  );

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
          className="input mt-1.5"
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
          className="input mt-1.5"
        />
      </div>
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
        {pending ? "Connexion…" : "Se connecter"}
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
