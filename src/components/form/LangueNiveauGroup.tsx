"use client";

import { useState } from "react";
import { NIVEAU_LABELS } from "@/lib/constants";

type Ref = { id: string; label: string };
type Existing = { langueId: string; niveau: number; detail: string | null };

const DEFAULT_LABELS = ["Français", "Anglais"];

export default function LangueNiveauGroup({
  options,
  existing,
}: {
  options: Ref[];
  existing: Existing[];
}) {
  const byId = new Map(existing.map((e) => [e.langueId, e]));
  const defaults = options.filter((o) => DEFAULT_LABELS.includes(o.label));
  const defaultIds = new Set(defaults.map((d) => d.id));

  const [extraIds, setExtraIds] = useState<string[]>(
    existing.map((e) => e.langueId).filter((id) => !defaultIds.has(id))
  );
  const [toAdd, setToAdd] = useState("");

  const remaining = options.filter((o) => !defaultIds.has(o.id) && !extraIds.includes(o.id));
  const activeIds = [...defaults.map((d) => d.id), ...extraIds];

  function addLangue() {
    if (!toAdd) return;
    setExtraIds((ids) => [...ids, toAdd]);
    setToAdd("");
  }

  function removeLangue(id: string) {
    setExtraIds((ids) => ids.filter((x) => x !== id));
  }

  return (
    <div className="space-y-1 rounded-lg border border-slate-200 bg-brand-blue-bg-soft/40 p-3">
      {activeIds.map((id) => {
        const opt = options.find((o) => o.id === id);
        if (!opt) return null;
        const current = byId.get(id);
        const isDefault = defaultIds.has(id);
        return (
          <div
            key={id}
            className="flex flex-wrap items-center gap-2 rounded-md px-1 py-1 text-sm transition-colors hover:bg-white"
          >
            <input type="hidden" name="langueIds" value={id} />
            <span className="flex w-32 items-center gap-1.5 text-brand-body">{opt.label}</span>
            <select
              name={`langueNiveau_${id}`}
              defaultValue={current?.niveau ?? 3}
              className="rounded-md border border-slate-300 px-1.5 py-1 text-xs"
            >
              {Object.entries(NIVEAU_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <input
              type="text"
              name={`langueDetail_${id}`}
              defaultValue={current?.detail ?? ""}
              placeholder="Détail (ex. TOEIC 850)"
              className="flex-1 min-w-[10rem] rounded-md border border-slate-300 px-2 py-1 text-xs"
            />
            {!isDefault && (
              <button
                type="button"
                onClick={() => removeLangue(id)}
                aria-label="Retirer cette langue"
                className="text-brand-gray hover:text-red-600"
              >
                ✕
              </button>
            )}
          </div>
        );
      })}

      {remaining.length > 0 && (
        <div className="flex items-center gap-2 border-t border-slate-200 pt-2">
          <select
            value={toAdd}
            onChange={(e) => setToAdd(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs"
          >
            <option value="">+ Ajouter une langue…</option>
            {remaining.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addLangue}
            disabled={!toAdd}
            className="btn btn-secondary py-1 text-xs disabled:opacity-50"
          >
            Ajouter
          </button>
        </div>
      )}
    </div>
  );
}
