export default function CheckboxGroup({
  name,
  options,
  selectedIds,
  cleName,
  cleSelectedIds,
}: {
  name: string;
  options: { id: string; label: string }[];
  selectedIds: Set<string>;
  /** Nom du champ « clé » (ex. compétence mise en avant dans l'en-tête du DC),
   * rendu comme une case à part à côté de chaque option quand fourni. */
  cleName?: string;
  cleSelectedIds?: Set<string>;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 rounded-lg border border-slate-200 bg-brand-blue-bg-soft/40 p-3">
      {options.map((opt) => (
        <span key={opt.id} className="flex items-center gap-2 text-sm text-brand-body">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              name={name}
              value={opt.id}
              defaultChecked={selectedIds.has(opt.id)}
              className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
            />
            {opt.label}
          </label>
          {cleName && (
            <label
              title="Compétence clé (mise en avant dans l'en-tête du DC)"
              className="flex items-center gap-1 text-xs text-amber-600"
            >
              <input
                type="checkbox"
                name={cleName}
                value={opt.id}
                defaultChecked={cleSelectedIds?.has(opt.id) ?? false}
                className="h-3.5 w-3.5 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
              />
              ★
            </label>
          )}
        </span>
      ))}
      {options.length === 0 && (
        <span className="text-xs text-brand-gray">
          Aucune valeur active dans ce référentiel.
        </span>
      )}
    </div>
  );
}
