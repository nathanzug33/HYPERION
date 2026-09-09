"use client";

import { useState } from "react";
import { SECTEUR_CATEGORIE, SECTEUR_CATEGORIE_LABELS } from "@/lib/constants";

type Industrie = { id: string; label: string };

export default function SecteurActiviteFields({
  industries,
  defaultCategorie,
  defaultIndustrieId,
}: {
  industries: Industrie[];
  defaultCategorie?: string | null;
  defaultIndustrieId?: string | null;
}) {
  const [categorie, setCategorie] = useState(defaultCategorie ?? "");

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-xs font-medium text-brand-body">Secteur d&apos;activité</label>
        <select
          name="secteurCategorie"
          value={categorie}
          onChange={(e) => setCategorie(e.target.value)}
          className="input mt-1.5"
        >
          <option value="">—</option>
          {Object.entries(SECTEUR_CATEGORIE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      {categorie === SECTEUR_CATEGORIE.INDUSTRIE && (
        <div>
          <label className="block text-xs font-medium text-brand-body">Industrie</label>
          <select name="industrieId" defaultValue={defaultIndustrieId ?? ""} className="input mt-1.5">
            <option value="">—</option>
            {industries.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
