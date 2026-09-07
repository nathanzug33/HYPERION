"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPasswordAction, type ResetState } from "./actions";

const initialState: ResetState = {};

export default function ResetForm({ token }: { token: string }) {
  const boundAction = resetPasswordAction.bind(null, token);
  const [state, formAction, pending] = useActionState(
    boundAction,
    initialState
  );

  if (state.done) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Votre mot de passe a été mis à jour.
        </p>
        <Link
          href="/connexion"
          className="block text-center rounded-md bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700">
          Nouveau mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          minLength={10}
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="confirm" className="block text-sm font-medium text-slate-700">
          Confirmer le mot de passe
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          minLength={10}
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
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
        className="w-full rounded-md bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
      >
        {pending ? "Mise à jour…" : "Mettre à jour le mot de passe"}
      </button>
    </form>
  );
}
