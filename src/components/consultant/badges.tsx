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

export function TypeContratBadge({ value }: { value: string | null }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-brand-blue-bg-soft px-2.5 py-0.5 text-xs font-medium text-brand-body">
      {TYPE_CONTRAT_LABELS[value as keyof typeof TYPE_CONTRAT_LABELS] ?? value}
    </span>
  );
}

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border border-slate-200 bg-brand-blue-bg-soft px-2 py-0.5 text-xs text-brand-body">
      {children}
    </span>
  );
}

// Niveau (1 à 5) affiché en points, comme le gabarit HYPERION (●●●●○).
export function NiveauDots({ niveau, label }: { niveau: number; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-brand-body">
      <span className="tracking-tighter text-brand-blue" aria-hidden>
        {"●".repeat(Math.max(0, Math.min(5, niveau)))}
        {"○".repeat(5 - Math.max(0, Math.min(5, niveau)))}
      </span>
      {label && <span className="text-brand-gray">{label}</span>}
    </span>
  );
}
