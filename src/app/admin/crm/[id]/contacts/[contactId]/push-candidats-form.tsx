"use client";

import { useState } from "react";
import Link from "next/link";
import type { MatchResult } from "@/lib/matching";
import MatchBadges from "@/components/MatchBadges";
import { pushCandidatsToContactAction } from "./push-actions";

export type CandidatSuggestion = {
  consultantId: string;
  referenceAnonyme: string;
  intitulePoste: string | null;
  totalScore: number;
  match: MatchResult;
  fonctionMots: string[];
};

export default function PushCandidatsForm({
  entrepriseId,
  contactId,
  suggestions,
}: {
  entrepriseId: string;
  contactId: string;
  suggestions: CandidatSuggestion[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(consultantId: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(consultantId)) next.delete(consultantId);
      else next.add(consultantId);
      return next;
    });
  }

  function toggleAll() {
    setSelected((cur) =>
      cur.size === suggestions.length ? new Set() : new Set(suggestions.map((s) => s.consultantId))
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="card space-y-2.5 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-brand-ink">Candidats suggérés</h2>
        <button type="button" onClick={toggleAll} className="link-underline text-[11px] text-brand-blue-dark">
          {selected.size === suggestions.length ? "Tout désélectionner" : "Tout sélectionner"}
        </button>
      </div>
      <p className="text-xs text-brand-gray">
        Profils publiés correspondant aux secteurs/expertises recherchés par l&apos;entreprise et aux
        mots-clés du poste de ce contact.
      </p>

      <form action={pushCandidatsToContactAction} className="space-y-2.5">
        <input type="hidden" name="entrepriseId" value={entrepriseId} />
        <input type="hidden" name="contactId" value={contactId} />
        {[...selected].map((cid) => (
          <input key={cid} type="hidden" name="consultantIds" value={cid} />
        ))}

        <ul className="max-h-72 space-y-1.5 overflow-y-auto">
          {suggestions.map((s) => (
            <li key={s.consultantId}>
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-100 px-2.5 py-1.5 text-xs hover:border-brand-blue-light hover:bg-brand-blue-bg-soft">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={selected.has(s.consultantId)}
                  onChange={() => toggle(s.consultantId)}
                />
                <span className="flex-1">
                  <span className="block">
                    <Link
                      href={`/admin/consultants/${s.consultantId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-mono text-[11px] text-brand-gray hover:text-brand-blue-dark hover:underline"
                    >
                      {s.referenceAnonyme}
                    </Link>
                    {s.intitulePoste && (
                      <span className="ml-2 font-medium text-brand-ink">{s.intitulePoste}</span>
                    )}
                  </span>
                  <span className="mt-1 block">
                    <MatchBadges match={s.match} totalScore={s.totalScore} fonctionMots={s.fonctionMots} />
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>

        <textarea
          name="message"
          rows={2}
          placeholder="Message d'accompagnement (optionnel, envoyé pour chaque candidat sélectionné)"
          className="input text-xs"
        />
        <button type="submit" disabled={selected.size === 0} className="btn btn-secondary w-full py-1.5 text-xs">
          📤 Pousser la sélection ({selected.size})
        </button>
      </form>
    </div>
  );
}
