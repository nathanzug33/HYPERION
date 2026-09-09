import { COEFFICIENT_CHARGES_PATRONALES, JOURS_FACTURABLES_PAR_AN } from "@/lib/constants";

// Calcul de coût/marge consultant (§ pilotage financier). Le salaire et les
// frais sont saisis mensuellement (plus naturel pour un BM/admin) puis
// annualisés ici avant d'appliquer le forfait de 218 jours/an — mélanger un
// coût mensuel et un diviseur annuel donnerait un résultat faux d'un facteur
// ~12, donc TOUTE la logique d'annualisation reste centralisée ici plutôt
// que dupliquée à chaque appelant.

/** Coût employeur journalier moyen, ou `null` si le salaire n'est pas
 * renseigné (fiche consultant incomplète — cas normal avant saisie admin). */
export function coutJournalier(consultant: {
  salaireBrutMensuel: number | null;
  fraisMensuels: number | null;
}): number | null {
  if (!consultant.salaireBrutMensuel) return null;
  const coutAnnuelCharge = consultant.salaireBrutMensuel * 12 * COEFFICIENT_CHARGES_PATRONALES;
  const fraisAnnuels = (consultant.fraisMensuels ?? 0) * 12;
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
