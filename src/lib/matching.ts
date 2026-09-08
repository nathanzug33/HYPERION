import { findVille, distanceKm } from "@/lib/villes-france";
import { DISPONIBILITE } from "@/lib/constants";

// Score de correspondance candidat <-> entreprise, réutilisé dans les deux
// sens (suggestions de candidats sur une fiche entreprise, et suggestions de
// clients sur une fiche candidat). Pondération volontairement simple :
// secteur/expertise comptent le plus (le cœur du besoin exprimé par le
// client), la proximité géographique et la disponibilité immédiate sont des
// bonus secondaires.

export type MatchInput = {
  candidatSecteurIds: string[];
  candidatExpertiseIds: string[];
  candidatVilleLat: number | null;
  candidatVilleLng: number | null;
  candidatRayonKm: number | null;
  candidatDisponibilite: string | null;
  entrepriseSecteurIds: string[];
  entrepriseExpertiseIds: string[];
  entrepriseVille: string | null;
};

export type MatchResult = {
  score: number;
  secteursCommuns: number;
  expertisesCommunes: number;
  proximite: boolean;
  disponibleImmediat: boolean;
};

export function computeMatchScore(input: MatchInput): MatchResult {
  const secteursCommuns = input.candidatSecteurIds.filter((id) =>
    input.entrepriseSecteurIds.includes(id)
  ).length;
  const expertisesCommunes = input.candidatExpertiseIds.filter((id) =>
    input.entrepriseExpertiseIds.includes(id)
  ).length;

  let proximite = false;
  if (
    input.candidatVilleLat != null &&
    input.candidatVilleLng != null &&
    input.candidatRayonKm != null &&
    input.entrepriseVille
  ) {
    const ref = findVille(input.entrepriseVille);
    if (ref) {
      proximite =
        distanceKm(input.candidatVilleLat, input.candidatVilleLng, ref.lat, ref.lng) <=
        input.candidatRayonKm;
    }
  }

  const disponibleImmediat = input.candidatDisponibilite === DISPONIBILITE.IMMEDIATE;

  const score =
    secteursCommuns * 2 + expertisesCommunes * 2 + (proximite ? 2 : 0) + (disponibleImmediat ? 1 : 0);

  return { score, secteursCommuns, expertisesCommunes, proximite, disponibleImmediat };
}
