import { COEFFICIENT_CHARGES_PATRONALES, JOURS_FACTURABLES_PAR_AN, NATURE_CONTRAT } from "@/lib/constants";

// Calcul de coût/marge consultant (§ pilotage financier). Le coût journalier
// diffère selon la nature du contrat : un salarié (CDI/CDIC) coûte son
// salaire brut annuel × le coefficient de charges patronales, un indépendant
// coûte exactement le TJM qu'on lui paie (aucun coefficient employeur à
// appliquer sur un TJM d'achat). Toute cette logique reste centralisée ici
// plutôt que dupliquée à chaque appelant.

/** Coût employeur/achat journalier moyen, ou `null` si les données de coût
 * ne sont pas renseignées (fiche consultant incomplète — cas normal avant
 * saisie admin, typiquement avant le staffing sur une mission). */
export function coutJournalier(consultant: {
  natureContrat: string | null;
  salaireBrutAnnuel: number | null;
  fraisAnnuels: number | null;
  tjmAchat: number | null;
}): number | null {
  const fraisAnnuels = consultant.fraisAnnuels ?? 0;

  if (consultant.natureContrat === NATURE_CONTRAT.INDEPENDANT) {
    if (!consultant.tjmAchat) return null;
    return consultant.tjmAchat + fraisAnnuels / JOURS_FACTURABLES_PAR_AN;
  }

  if (!consultant.salaireBrutAnnuel) return null;
  const coutAnnuelCharge = consultant.salaireBrutAnnuel * COEFFICIENT_CHARGES_PATRONALES;
  return (coutAnnuelCharge + fraisAnnuels) / JOURS_FACTURABLES_PAR_AN;
}

/** Marge par jour facturé = TJM - coût journalier. */
export function margeJournaliere(tjm: number | null, coutJour: number | null): number | null {
  if (tjm == null || coutJour == null) return null;
  return tjm - coutJour;
}

/** Marge sur un mois donné = marge journalière × jours travaillés déclarés. */
export function margeMensuelle(margeJour: number | null, joursTravailles: number): number | null {
  if (margeJour == null) return null;
  return margeJour * joursTravailles;
}
