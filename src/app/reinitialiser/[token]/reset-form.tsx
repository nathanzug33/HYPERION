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
        <p className="text-sm text-brand-body">
          Votre mot de passe a été mis à jour.
        </p>
        <Link href="/connexion" className="btn btn-primary block w-full py-2.5 text-center">
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-brand-body">
          Nouveau mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          minLength={10}
          required
          className="input mt-1.5"
        />
      </div>
      <div>
        <label htmlFor="confirm" className="block text-sm font-medium text-brand-body">
          Confirmer le mot de passe
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          minLength={10}
          required
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
        {pending ? "Mise à jour…" : "Mettre à jour le mot de passe"}
      </button>
    </form>
  );
}
