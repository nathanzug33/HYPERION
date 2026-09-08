"use client";

import { useActionState } from "react";
import { transferPortefeuilleAction, type TransferState } from "./actions";

const initialState: TransferState = {};

export default function TransferForm({
  bms,
}: {
  bms: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    transferPortefeuilleAction,
    initialState
  );

  return (
    <form action={formAction} className="card space-y-4 p-5">
      <div>
        <label className="block text-xs font-medium text-brand-body">
          BM source (dont on transfère le portefeuille)
        </label>
        <select name="sourceId" required className="input mt-1.5">
          <option value="">— Sélectionner —</option>
          {bms.map((bm) => (
            <option key={bm.id} value={bm.id}>
              {bm.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-brand-body">BM destination</label>
        <select name="targetId" required className="input mt-1.5">
          <option value="">— Sélectionner —</option>
          {bms.map((bm) => (
            <option key={bm.id} value={bm.id}>
              {bm.name}
            </option>
          ))}
        </select>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-700">{state.success}</p>}
      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary w-full py-2.5 disabled:opacity-60"
      >
        {pending ? "Transfert en cours…" : "Transférer tout le portefeuille"}
      </button>
    </form>
  );
}
