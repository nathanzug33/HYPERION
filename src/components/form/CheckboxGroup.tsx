"use client";

import { useRef } from "react";

export default function CheckboxGroup({
  name,
  options,
  selectedIds,
  selectAllLabel,
}: {
  name: string;
  options: { id: string; label: string }[];
  selectedIds: Set<string>;
  /** Si fourni, affiche un bouton qui coche/décoche toutes les options d'un
   * coup (ex. "France entière" pour les régions de mobilité). */
  selectAllLabel?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  function toggleAll() {
    const boxes = containerRef.current?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    if (!boxes || boxes.length === 0) return;
    const allChecked = Array.from(boxes).every((b) => b.checked);
    boxes.forEach((b) => {
      b.checked = !allChecked;
    });
  }

  return (
    <div className="space-y-1.5">
      {selectAllLabel && options.length > 0 && (
        <button type="button" onClick={toggleAll} className="link-underline text-xs text-brand-blue-dark">
          {selectAllLabel} (tout cocher/décocher)
        </button>
      )}
      <div
        ref={containerRef}
        className="flex flex-wrap gap-x-4 gap-y-1.5 rounded-lg border border-slate-200 bg-brand-blue-bg-soft/40 p-3"
      >
        {options.map((opt) => (
          <label key={opt.id} className="flex items-center gap-1.5 text-sm text-brand-body">
            <input
              type="checkbox"
              name={name}
              value={opt.id}
              defaultChecked={selectedIds.has(opt.id)}
              className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
            />
            {opt.label}
          </label>
        ))}
        {options.length === 0 && (
          <span className="text-xs text-brand-gray">
            Aucune valeur active dans ce référentiel.
          </span>
        )}
      </div>
    </div>
  );
}
