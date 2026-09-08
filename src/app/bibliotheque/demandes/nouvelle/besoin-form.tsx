"use client";

import { useActionState } from "react";
import { submitDemandeBesoin, type SubmitBesoinState } from "../actions";
import { DUREE_ESTIMEE_OPTIONS } from "@/lib/constants";

const initialState: SubmitBesoinState = {};

type Ref = { id: string; label: string };

export default function BesoinForm({ seniorites }: { seniorites: Ref[] }) {
  const [state, formAction, pending] = useActionState(submitDemandeBesoin, initialState);

  return (
    <form action={formAction} className="card space-y-4 p-5">
      <div>
        <label className="block text-xs font-medium text-brand-body">
          Intitulé du poste recherché
        </label>
        <input
          name="intitulePoste"
          required
          placeholder="Ex. Ingénieur DevOps confirmé"
          className="input mt-1.5"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-brand-body">
          Descriptif du besoin
        </label>
        <textarea
          name="descriptifPoste"
          required
          rows={5}
          placeholder="Contexte de la mission, compétences recherchées, environnement technique, enjeux…"
          className="input mt-1.5"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-brand-body">Séniorité souhaitée</label>
          <select name="seniorite" className="input mt-1.5">
            <option value="">— Indifférent —</option>
            {seniorites.map((s) => (
              <option key={s.id} value={s.label}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-body">Durée estimée</label>
          <select name="dureeEstimee" className="input mt-1.5">
            <option value="">— Non précisée —</option>
            {DUREE_ESTIMEE_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-body">TJM cible min (€)</label>
          <input name="tjmCibleMin" type="number" min={0} className="input mt-1.5" />
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-body">TJM cible max (€)</label>
          <input name="tjmCibleMax" type="number" min={0} className="input mt-1.5" />
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-body">Localisation</label>
          <input name="localisation" placeholder="Ex. Lyon, hybride" className="input mt-1.5" />
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-body">Démarrage souhaité</label>
          <input name="dateDemarrageSouhaitee" type="date" className="input mt-1.5" />
        </div>
      </div>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary disabled:opacity-60">
        {pending ? "Envoi…" : "Envoyer la demande"}
      </button>
    </form>
  );
}
