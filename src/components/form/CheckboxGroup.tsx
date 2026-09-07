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
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 rounded-md border border-slate-200 p-2.5">
      {options.map((opt) => (
        <label key={opt.id} className="flex items-center gap-1.5 text-sm text-slate-700">
          <input
            type="checkbox"
            name={name}
            value={opt.id}
            defaultChecked={selectedIds.has(opt.id)}
            className="rounded border-slate-300"
          />
          {opt.label}
        </label>
      ))}
      {options.length === 0 && (
        <span className="text-xs text-slate-400">
          Aucune valeur active dans ce référentiel.
        </span>
      )}
    </div>
  );
}
