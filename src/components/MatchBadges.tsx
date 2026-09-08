import type { MatchResult } from "@/lib/matching";

/** Petits badges expliquant un score de matching candidat <-> entreprise
 * (secteurs/expertises communs, proximité géographique, disponibilité). */
export default function MatchBadges({ match }: { match: MatchResult }) {
  return (
    <span className="flex flex-wrap gap-1">
      <span className="rounded-full bg-brand-blue-bg px-2 py-0.5 text-[10px] font-medium text-brand-blue-dark">
        {match.score} pt{match.score > 1 ? "s" : ""}
      </span>
      {match.secteursCommuns > 0 && (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-brand-body">
          {match.secteursCommuns} secteur{match.secteursCommuns > 1 ? "s" : ""}
        </span>
      )}
      {match.expertisesCommunes > 0 && (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-brand-body">
          {match.expertisesCommunes} expertise{match.expertisesCommunes > 1 ? "s" : ""}
        </span>
      )}
      {match.proximite && (
        <span className="rounded-full bg-brand-green/10 px-2 py-0.5 text-[10px] font-medium text-brand-green">
          À proximité
        </span>
      )}
      {match.disponibleImmediat && (
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
          Disponible
        </span>
      )}
    </span>
  );
}
