"use client";

import { useActionState, useState } from "react";
import { createUserAction, type CreateUserState } from "./actions";

const initialState: CreateUserState = {};

export default function CreateUserForm({
  organizations,
}: {
  organizations: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    createUserAction,
    initialState
  );
  const [role, setRole] = useState("CLIENT");

  return (
    <form
      action={formAction}
      className="card p-5 space-y-3"
    >
      <h2 className="text-sm font-semibold text-brand-ink">
        Créer un compte
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-brand-body">Nom</label>
          <input
            name="name"
            required
            className="input mt-1.5"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-body">Email professionnel</label>
          <input
            name="email"
            type="email"
            required
            className="input mt-1.5"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-body">Rôle</label>
          <select
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="input mt-1.5"
          >
            <option value="CLIENT">Client / prospect</option>
            <option value="BM">Business manager</option>
            <option value="DIRECTEUR_BU">Directeur de BU</option>
            <option value="ADMIN">Administrateur</option>
          </select>
        </div>
        {role === "CLIENT" && (
          <div>
            <label className="block text-xs font-medium text-brand-body">
              Organisation cliente
            </label>
            <select
              name="clientOrganizationId"
              className="input mt-1.5"
            >
              <option value="">— Nouvelle organisation ci-dessous —</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            <input
              name="newOrgName"
              placeholder="Ou nom d'une nouvelle organisation"
              className="input mt-1.5"
            />
          </div>
        )}
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-emerald-700">{state.success}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary disabled:opacity-60"
      >
        {pending ? "Création…" : "Créer le compte"}
      </button>
    </form>
  );
}
