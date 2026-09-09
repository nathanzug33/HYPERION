"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type SearchResults = {
  candidats: { id: string; nom: string; prenom: string; reference: string }[];
  contacts: {
    id: string;
    nom: string;
    prenom: string;
    entrepriseId: string;
    entrepriseNom: string;
  }[];
};

const EMPTY: SearchResults = { candidats: [], contacts: [] };

export default function GlobalSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const query = q.trim();
    // Rien à faire pour une requête trop courte : le rendu masque déjà le
    // panneau de résultats via `hasQuery`, pas besoin de réinitialiser
    // `results` ici.
    if (query.length < 2) return;
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((data: SearchResults) => setResults(data))
        .catch(() => setResults(EMPTY))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  const hasQuery = q.trim().length >= 2;
  const hasResults = results.candidats.length > 0 || results.contacts.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Rechercher un candidat, un client…"
          className="w-full rounded-lg border border-white/15 bg-white/10 py-2 pl-8 pr-3 text-xs text-white placeholder:text-white/50 focus:border-white/30 focus:bg-white/15 focus:outline-none"
        />
      </div>

      {open && hasQuery && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-80 overflow-y-auto rounded-xl border border-slate-100 bg-white py-1.5 shadow-lg">
          {loading && <p className="px-3 py-2 text-xs text-brand-gray">Recherche…</p>}
          {!loading && !hasResults && (
            <p className="px-3 py-2 text-xs text-brand-gray">Aucun résultat.</p>
          )}
          {!loading &&
            results.candidats.map((c) => (
              <Link
                key={`candidat-${c.id}`}
                href={`/admin/consultants/${c.id}`}
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-sm transition-colors hover:bg-brand-blue-bg-soft"
              >
                <div className="truncate font-medium text-brand-ink">
                  {c.prenom} {c.nom}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-[10px] font-medium text-brand-blue-dark">
                    Candidat
                  </span>
                  <span className="truncate text-[11px] text-brand-gray">{c.reference}</span>
                </div>
              </Link>
            ))}
          {!loading &&
            results.contacts.map((c) => (
              <Link
                key={`contact-${c.id}`}
                href={`/admin/crm/${c.entrepriseId}/contacts/${c.id}`}
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-sm transition-colors hover:bg-brand-blue-bg-soft"
              >
                <div className="truncate font-medium text-brand-ink">
                  {c.prenom} {c.nom}
                </div>
                <div className="mt-0.5">
                  <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-brand-green/10 px-2 py-0.5 text-[10px] font-medium text-brand-green">
                    Client · {c.entrepriseNom}
                  </span>
                </div>
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}
