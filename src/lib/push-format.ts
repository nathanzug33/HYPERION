// Formatage pur pour l'email de proposition (push) — aucune dépendance DB ni
// fichier, utilisable aussi bien depuis un composant serveur (pré-remplissage
// des champs du formulaire) que depuis push-core.ts (construction de l'email).

/** Localisation lisible à partir de la ville de rattachement et du rayon de
 * mobilité du candidat. */
export function formatLocalisation(
  villeRattachement: string | null,
  rayonKm: number | null
): string | null {
  if (!villeRattachement) return null;
  return rayonKm ? `${villeRattachement} (rayon ${rayonKm} km)` : villeRattachement;
}

/** Mots-clés "Compétences" de l'email de proposition — le champ libre
 * (techno/outil/certification), pas les secteurs/expertises, plus génériques. */
export function competencesKeywords(
  competences: { competence: { label: string } }[],
  limit = 8
): string[] {
  return competences.slice(0, limit).map((c) => c.competence.label);
}
