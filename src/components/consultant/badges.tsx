import { DISPONIBILITE_LABELS, TYPE_CONTRAT_LABELS } from "@/lib/constants";

export function DisponibiliteBadge({ value }: { value: string | null }) {
  if (!value) return null;
  const isImmediate = value === "IMMEDIATE";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isImmediate
          ? "bg-brand-green text-white"
          : "bg-brand-blue-bg text-brand-blue-dark"
      }`}
    >
      {DISPONIBILITE_LABELS[value as keyof typeof DISPONIBILITE_LABELS] ?? value}
    </span>
  );
}

export function TypeContratBadge({ value, light }: { value: string | null; light?: boolean }) {
  if (!value) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        light ? "bg-white/12 text-white ring-1 ring-white/25" : "bg-brand-blue-bg-soft text-brand-body"
      }`}
    >
      {TYPE_CONTRAT_LABELS[value as keyof typeof TYPE_CONTRAT_LABELS] ?? value}
    </span>
  );
}

export function Tag({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs ${
        light
          ? "border border-white/25 bg-white/10 text-white"
          : "border border-brand-blue-light/40 bg-brand-blue-bg-soft text-brand-body"
      }`}
    >
      {children}
    </span>
  );
}
