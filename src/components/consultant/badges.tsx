import { DISPONIBILITE_LABELS, TYPE_CONTRAT_LABELS } from "@/lib/constants";

export function DisponibiliteBadge({ value }: { value: string | null }) {
  if (!value) return null;
  const isImmediate = value === "IMMEDIATE";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isImmediate
          ? "bg-emerald-50 text-emerald-700"
          : "bg-sky-50 text-sky-700"
      }`}
    >
      {DISPONIBILITE_LABELS[value as keyof typeof DISPONIBILITE_LABELS] ?? value}
    </span>
  );
}

export function TypeContratBadge({ value }: { value: string | null }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
      {TYPE_CONTRAT_LABELS[value as keyof typeof TYPE_CONTRAT_LABELS] ?? value}
    </span>
  );
}

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600">
      {children}
    </span>
  );
}
