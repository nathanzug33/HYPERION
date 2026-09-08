"use client";

import { useActionState } from "react";
import { updateClientProfileAction, type UpdateProfileState } from "./actions";

const initialState: UpdateProfileState = {};

export default function ProfileForm({
  poste,
  telephone,
}: {
  poste: string;
  telephone: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateClientProfileAction,
    initialState
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="poste" className="block text-xs font-medium text-brand-body">
            Poste / fonction
          </label>
          <input
            id="poste"
            name="poste"
            defaultValue={poste}
            placeholder="Ex. Responsable IT, DRH…"
            className="input mt-1.5"
          />
        </div>
        <div>
          <label htmlFor="telephone" className="block text-xs font-medium text-brand-body">
            Téléphone
          </label>
          <input
            id="telephone"
            name="telephone"
            type="tel"
            defaultValue={telephone}
            placeholder="Ex. 06 12 34 56 78"
            className="input mt-1.5"
          />
        </div>
      </div>

      {state.success && (
        <p className="text-sm text-brand-green">Profil mis à jour.</p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary disabled:opacity-60">
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
