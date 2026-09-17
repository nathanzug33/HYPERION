export default function CheckboxGroup({
  name,
  options,
  selectedIds,
}: {
  name: string;
  options: { id: string; label: string }[];
  selectedIds: Set<string>;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 rounded-lg border border-slate-200 bg-brand-blue-bg-soft/40 p-3">
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
  );
}
