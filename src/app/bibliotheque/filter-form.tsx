"use client";

import { useRef } from "react";
import Link from "next/link";
import { DISPONIBILITE_LABELS } from "@/lib/constants";

type Ref = { id: string; label: string };

export default function FilterForm({
  secteurs,
  expertises,
  seniorites,
  typesMobilite,
  zones,
  defaults,
}: {
  secteurs: Ref[];
  expertises: Ref[];
  seniorites: Ref[];
  typesMobilite: Ref[];
  zones: Ref[];
  defaults: {
    q: string;
    secteur: string[];
    expertise: string[];
    seniorite: string[];
    mobilite: string[];
    zone: string[];
    disponibilite: string[];
    tri: string;
  };
}) {
  const formRef = useRef<HTMLFormElement>(null);

  function submitNow() {
    formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} method="get" className="card space-y-5 p-4">
      <div>
        <input
          type="search"
          name="q"
          defaultValue={defaults.q}
          placeholder="Rechercher (intitulé, compétences, contexte)…"
          className="input"
        />
      </div>

      <FilterGroup
        title="Secteur"
        name="secteur"
        options={secteurs}
        selected={defaults.secteur}
        onChange={submitNow}
      />
      <FilterGroup
        title="Expertise / domaine"
        name="expertise"
        options={expertises}
        selected={defaults.expertise}
        onChange={submitNow}
      />
      <FilterGroup
        title="Séniorité"
        name="seniorite"
        options={seniorites}
        selected={defaults.seniorite}
        onChange={submitNow}
      />
      <FilterGroup
        title="Type de mobilité"
        name="mobilite"
        options={typesMobilite}
        selected={defaults.mobilite}
        onChange={submitNow}
      />
      <FilterGroup
        title="Zone géographique"
        name="zone"
        options={zones}
        selected={defaults.zone}
        onChange={submitNow}
      />
      <FilterGroup
        title="Disponibilité"
        name="disponibilite"
        options={Object.entries(DISPONIBILITE_LABELS).map(([id, label]) => ({ id, label }))}
        selected={defaults.disponibilite}
        onChange={submitNow}
      />

      <div>
        <label className="block text-xs font-medium text-brand-body mb-1">Trier par</label>
        <select
          name="tri"
          defaultValue={defaults.tri}
          onChange={submitNow}
          className="input"
        >
          <option value="maj">Dernière mise à jour</option>
          <option value="seniorite">Séniorité</option>
          <option value="disponibilite">Disponibilité</option>
        </select>
      </div>

      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary flex-1 py-2">
          Filtrer
        </button>
        <Link href="/bibliotheque" className="btn btn-secondary">
          Réinitialiser
        </Link>
      </div>
    </form>
  );
}

function FilterGroup({
  title,
  name,
  options,
  selected,
  onChange,
}: {
  title: string;
  name: string;
  options: Ref[];
  selected: string[];
  onChange: () => void;
}) {
  if (options.length === 0) return null;
  const selectedSet = new Set(selected);
  return (
    <div className="border-t border-slate-100 pt-3.5 first:border-0 first:pt-0">
      <span className="block text-xs font-semibold uppercase tracking-wide text-brand-blue-dark mb-1.5">
        {title}
      </span>
      <div className="space-y-0.5 max-h-40 overflow-y-auto pr-1">
        {options.map((opt) => (
          <label
            key={opt.id}
            className="flex items-center gap-1.5 rounded px-1 py-0.5 text-sm text-brand-body transition-colors hover:bg-brand-blue-bg-soft"
          >
            <input
              type="checkbox"
              name={name}
              value={opt.id}
              defaultChecked={selectedSet.has(opt.id)}
              onChange={onChange}
              className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
}
