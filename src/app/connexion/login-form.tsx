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
    <form
      action={formAction}
      className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4"
    >
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
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
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
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
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
        className="w-full rounded-md bg-brand-ink py-2 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:opacity-60"
      >
        {pending ? "Connexion…" : "Se connecter"}
      </button>
      <div className="text-center">
        <Link
          href="/mot-de-passe-oublie"
          className="text-xs text-brand-gray hover:text-brand-ink underline"
        >
          Mot de passe oublié ?
        </Link>
      </div>
    </form>
  );
}
