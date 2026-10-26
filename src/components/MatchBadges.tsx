import type { MatchResult } from "@/lib/matching";

/** Petits badges expliquant un score de matching candidat <-> entreprise
 * (secteurs/expertises communs, proximité géographique, disponibilité), avec
 * en option les mots-clés de poste trouvés dans l'intitulé d'un interlocuteur
 * (§ push en masse, matching par fonction). */
export default function MatchBadges({
  match,
  totalScore,
  fonctionMots,
}: {
  match: MatchResult;
  totalScore?: number;
  fonctionMots?: string[];
}) {
  return (
    <span className="flex flex-wrap gap-1">
      <span className="rounded-full bg-brand-blue-bg px-2 py-0.5 text-[10px] font-medium text-brand-blue-dark">
        {totalScore ?? match.score} pt{(totalScore ?? match.score) > 1 ? "s" : ""}
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
      {fonctionMots && fonctionMots.length > 0 && (
        <span
          className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700"
          title={`Mot(s)-clé(s) trouvé(s) dans le poste : ${fonctionMots.join(", ")}`}
        >
          Poste : {fonctionMots.join(", ")}
        </span>
      )}
    </span>
  );
}
