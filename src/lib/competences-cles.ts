// Résolution des compétences clés générées par l'IA (jusqu'à 3, à mettre en
// avant sur le DC) contre la liste complète des compétences/technologies —
// utilisé par les 3 actions qui persistent une génération IA (tagging étroit,
// génération complète, création initiale).
//
// L'IA reçoit pour seule consigne que `competencesCles` est un "sous-ensemble"
// de `competencesTechnologies", mais rien ne garantit une égalité de chaîne
// stricte (elle peut reformuler légèrement, ex. "SAP R3 (key-user)" pour une
// technologie listée "SAP R3") — une comparaison exacte insensible à la casse
// laisse alors le DC sans aucune compétence clé, silencieusement. On tolère
// donc une correspondance partielle avant de renoncer, et à défaut de toute
// correspondance on retombe sur les premières technologies listées plutôt que
// de laisser l'en-tête du DC vide.
function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function resolveCompetencesCles(
  competencesTechnologies: string[],
  competencesCles: string[]
): Set<string> {
  const resolved = new Set<string>();
  const remaining = competencesTechnologies.map((label) => ({ label, norm: normalize(label) }));

  for (const cle of competencesCles) {
    const cleNorm = normalize(cle);
    const exactIdx = remaining.findIndex((t) => t.norm === cleNorm);
    const idx =
      exactIdx !== -1
        ? exactIdx
        : remaining.findIndex((t) => t.norm.includes(cleNorm) || cleNorm.includes(t.norm));
    if (idx !== -1) {
      resolved.add(remaining[idx].label);
      remaining.splice(idx, 1);
    }
  }

  if (resolved.size === 0 && competencesTechnologies.length > 0) {
    for (const label of competencesTechnologies.slice(0, 3)) resolved.add(label);
  }

  return resolved;
}
