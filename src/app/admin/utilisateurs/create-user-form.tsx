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
      className="rounded-lg border border-slate-200 bg-white p-4 space-y-3"
    >
      <h2 className="text-sm font-semibold text-slate-900">
        Créer un compte
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-700">Nom</label>
          <input
            name="name"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-slate-900 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">Email professionnel</label>
          <input
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-slate-900 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">Rôle</label>
          <select
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-slate-900 focus:outline-none"
          >
            <option value="CLIENT">Client / prospect</option>
            <option value="BM">Business manager</option>
            <option value="ADMIN">Administrateur</option>
          </select>
        </div>
        {role === "CLIENT" && (
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Organisation cliente
            </label>
            <select
              name="clientOrganizationId"
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-slate-900 focus:outline-none"
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
              className="mt-1.5 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-slate-900 focus:outline-none"
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
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
      >
        {pending ? "Création…" : "Créer le compte"}
      </button>
    </form>
  );
}
