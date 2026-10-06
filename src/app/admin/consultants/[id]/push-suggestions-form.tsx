"use client";

import { useState } from "react";
import Link from "next/link";
import type { MatchResult } from "@/lib/matching";
import MatchBadges from "@/components/MatchBadges";
import { pushCandidatToManyAction } from "./push-actions";

export type ContactSuggestion = {
  contactId: string;
  contactNom: string;
  contactPrenom: string;
  contactFonction: string | null;
  entrepriseId: string;
  entrepriseNom: string;
  totalScore: number;
  match: MatchResult;
  fonctionMots: string[];
};

export default function PushSuggestionsForm({
  consultantId,
  suggestions,
}: {
  consultantId: string;
  suggestions: ContactSuggestion[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(contactId: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(contactId)) next.delete(contactId);
      else next.add(contactId);
      return next;
    });
  }

  function toggleAll() {
    setSelected((cur) =>
      cur.size === suggestions.length ? new Set() : new Set(suggestions.map((s) => s.contactId))
    );
  }

  return (
    <form action={pushCandidatToManyAction} className="space-y-2.5">
      <input type="hidden" name="consultantId" value={consultantId} />
      {[...selected].map((cid) => (
        <input key={cid} type="hidden" name="contactIds" value={cid} />
      ))}

      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-brand-ink">Contacts suggérés</h3>
        <button type="button" onClick={toggleAll} className="link-underline text-[11px] text-brand-blue-dark">
          {selected.size === suggestions.length ? "Tout désélectionner" : "Tout sélectionner"}
        </button>
      </div>
      <p className="text-[11px] text-brand-gray">
        Secteurs/expertises recherchés par l&apos;entreprise et mots-clés trouvés dans le poste de
        l&apos;interlocuteur.
      </p>

      <ul className="max-h-64 space-y-1.5 overflow-y-auto">
        {suggestions.map((s) => (
          <li key={s.contactId}>
            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-100 px-2.5 py-1.5 text-xs hover:border-brand-blue-light hover:bg-brand-blue-bg-soft">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={selected.has(s.contactId)}
                onChange={() => toggle(s.contactId)}
              />
              <span className="flex-1">
                <span className="block font-medium text-brand-ink">
                  {s.contactPrenom} {s.contactNom}
                  {s.contactFonction && <span className="font-normal text-brand-gray"> — {s.contactFonction}</span>}
                </span>
                <span className="block text-brand-gray">
                  <Link
                    href={`/admin/crm/${s.entrepriseId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="hover:text-brand-blue-dark hover:underline"
                  >
                    {s.entrepriseNom}
                  </Link>
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
        placeholder="Message d'accompagnement (optionnel, envoyé à tous les contacts sélectionnés)"
        className="input text-xs"
      />
      <button type="submit" disabled={selected.size === 0} className="btn btn-secondary w-full py-1.5 text-xs">
        📤 Pousser à la sélection ({selected.size})
      </button>
    </form>
  );
}
