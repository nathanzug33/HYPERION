import { NIVEAU_LABELS } from "@/lib/constants";

type Ref = { id: string; label: string };
type Existing = { langueId: string; niveau: number; detail: string | null };

export default function LangueNiveauGroup({
  options,
  existing,
}: {
  options: Ref[];
  existing: Existing[];
}) {
  const byId = new Map(existing.map((e) => [e.langueId, e]));

  return (
    <div className="space-y-1 rounded-lg border border-slate-200 bg-brand-blue-bg-soft/40 p-3">
      {options.map((opt) => {
        const current = byId.get(opt.id);
        return (
          <div key={opt.id} className="flex flex-wrap items-center gap-2 rounded-md px-1 py-1 text-sm transition-colors hover:bg-white">
            <label className="flex w-40 items-center gap-1.5 text-brand-body">
              <input
                type="checkbox"
                name="langueIds"
                value={opt.id}
                defaultChecked={Boolean(current)}
                className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
              />
              {opt.label}
            </label>
            <select
              name={`langueNiveau_${opt.id}`}
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
              name={`langueDetail_${opt.id}`}
              defaultValue={current?.detail ?? ""}
              placeholder="Détail (ex. TOEIC 850)"
              className="flex-1 min-w-[10rem] rounded-md border border-slate-300 px-2 py-1 text-xs"
            />
          </div>
        );
      })}
      {options.length === 0 && (
        <span className="text-xs text-brand-gray">Aucune langue active dans ce référentiel.</span>
      )}
    </div>
  );
}
