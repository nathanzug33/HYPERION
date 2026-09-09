"use client";

import { useState } from "react";
import { NATURE_CONTRAT, NATURE_CONTRAT_LABELS } from "@/lib/constants";

/** Salaire (CDI/CDIC) ou TJM payé (indépendant) — jamais les deux à la fois,
 * donc on n'affiche/n'exige que le champ pertinent selon le contrat choisi.
 * Utilisé à la fois sur la fiche consultant et dans « Gagner ce besoin »
 * (staffing) — ce dernier avec `required` pour garantir que le coût/marge
 * est calculable dès la création de la mission. */
export default function NatureContratFields({
  defaultNatureContrat = "",
  defaultSalaireBrutAnnuel = "",
  defaultTjmAchat = "",
  defaultFraisAnnuels = "",
  required = false,
  compact = false,
}: {
  defaultNatureContrat?: string;
  defaultSalaireBrutAnnuel?: number | string;
  defaultTjmAchat?: number | string;
  defaultFraisAnnuels?: number | string;
  required?: boolean;
  compact?: boolean;
}) {
  const [nature, setNature] = useState(defaultNatureContrat);
  const inputClass = compact ? "input text-xs" : "input";
  const labelClass = compact ? "block text-[11px] text-brand-gray" : "block text-xs font-medium text-brand-body";

  return (
    <>
      <div>
        <label className={labelClass}>Nature du contrat</label>
        <select
          name="natureContrat"
          required={required}
          value={nature}
          onChange={(e) => setNature(e.target.value)}
          className={`${inputClass} mt-1.5`}
        >
          <option value="" disabled={required}>
            {required ? "— Choisir —" : "—"}
          </option>
          {Object.entries(NATURE_CONTRAT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {nature === NATURE_CONTRAT.INDEPENDANT ? (
        <div>
          <label className={labelClass}>TJM payé (€/j) — sans coefficient</label>
          <input
            type="number"
            name="tjmAchat"
            min={0}
            required={required}
            defaultValue={defaultTjmAchat}
            className={`${inputClass} mt-1.5`}
          />
        </div>
      ) : (
        <div>
          <label className={labelClass}>Salaire brut annuel (€)</label>
          <input
            type="number"
            name="salaireBrutAnnuel"
            min={0}
            required={required && nature !== ""}
            defaultValue={defaultSalaireBrutAnnuel}
            className={`${inputClass} mt-1.5`}
          />
        </div>
      )}

      <div>
        <label className={labelClass}>Frais annuels (€) — IGD, IK…</label>
        <input
          type="number"
          name="fraisAnnuels"
          min={0}
          defaultValue={defaultFraisAnnuels}
          className={`${inputClass} mt-1.5`}
        />
      </div>
    </>
  );
}
