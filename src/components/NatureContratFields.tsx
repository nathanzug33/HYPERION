"use client";

import { useState } from "react";
import {
  NATURE_CONTRAT,
  NATURE_CONTRAT_LABELS,
  OBJECTIF_MARGE_BRUTE_JOURNALIERE,
} from "@/lib/constants";
import { coutJournalier } from "@/lib/marge";

/** Salaire (CDI/CDIC) ou TJM payé (indépendant) — jamais les deux à la fois,
 * donc on n'affiche/n'exige que le champ pertinent selon le contrat choisi.
 * Utilisé à la fois sur la fiche consultant et dans « Gagner ce besoin »
 * (staffing) — ce dernier avec `required` pour garantir que le coût/marge
 * est calculable dès la création de la mission.
 *
 * `hideFraisAnnuels` : sur la fiche candidat, ce champ n'a de sens qu'une
 * fois le profil réellement staffé (frais réels connus à ce moment-là,
 * saisis via « Gagner ce besoin ») — on le garde alors en input caché pour
 * ne pas écraser une valeur déjà renseignée au staffing. */
export default function NatureContratFields({
  defaultNatureContrat = "",
  defaultSalaireBrutAnnuel = "",
  defaultTjmAchat = "",
  defaultFraisAnnuels = "",
  required = false,
  compact = false,
  hideFraisAnnuels = false,
}: {
  defaultNatureContrat?: string;
  defaultSalaireBrutAnnuel?: number | string;
  defaultTjmAchat?: number | string;
  defaultFraisAnnuels?: number | string;
  required?: boolean;
  compact?: boolean;
  hideFraisAnnuels?: boolean;
}) {
  const [nature, setNature] = useState(defaultNatureContrat);
  const [salaireBrutAnnuel, setSalaireBrutAnnuel] = useState(String(defaultSalaireBrutAnnuel));
  const [tjmAchat, setTjmAchat] = useState(String(defaultTjmAchat));
  const [fraisAnnuels, setFraisAnnuels] = useState(String(defaultFraisAnnuels));
  const inputClass = compact ? "input text-xs" : "input";
  const labelClass = compact ? "block text-[11px] text-brand-gray" : "block text-xs font-medium text-brand-body";

  const coutJour = coutJournalier({
    natureContrat: nature || null,
    salaireBrutAnnuel: salaireBrutAnnuel ? Number(salaireBrutAnnuel) : null,
    fraisAnnuels: fraisAnnuels ? Number(fraisAnnuels) : null,
    tjmAchat: tjmAchat ? Number(tjmAchat) : null,
  });
  const tjmMini = coutJour != null ? Math.ceil(coutJour + OBJECTIF_MARGE_BRUTE_JOURNALIERE) : null;

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
            value={tjmAchat}
            onChange={(e) => setTjmAchat(e.target.value)}
            className={`${inputClass} mt-1.5`}
          />
        </div>
      ) : (
        <div>
          <label className={labelClass}>Salaire brut annuel (€) — indicatif, ajusté au staffing</label>
          <input
            type="number"
            name="salaireBrutAnnuel"
            min={0}
            required={required && nature !== ""}
            value={salaireBrutAnnuel}
            onChange={(e) => setSalaireBrutAnnuel(e.target.value)}
            className={`${inputClass} mt-1.5`}
          />
        </div>
      )}

      {tjmMini != null && (
        <div className="flex items-end">
          <p className={`${compact ? "text-[11px]" : "text-xs"} text-brand-blue-dark`}>
            TJM mini à proposer : <span className="font-semibold">{tjmMini} €/j</span>{" "}
            <span className="text-brand-gray">(coût {Math.round(coutJour!)} €/j + {OBJECTIF_MARGE_BRUTE_JOURNALIERE} € de marge cible)</span>
          </p>
        </div>
      )}

      {hideFraisAnnuels ? (
        <input type="hidden" name="fraisAnnuels" value={fraisAnnuels} />
      ) : (
        <div>
          <label className={labelClass}>Frais annuels (€) — IGD, IK…</label>
          <input
            type="number"
            name="fraisAnnuels"
            min={0}
            value={fraisAnnuels}
            onChange={(e) => setFraisAnnuels(e.target.value)}
            className={`${inputClass} mt-1.5`}
          />
        </div>
      )}
    </>
  );
}
