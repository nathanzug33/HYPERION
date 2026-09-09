export const REFERENTIAL_TYPES = [
  "secteur",
  "expertise",
  "seniorite",
  "typeMobilite",
  "zoneGeographique",
  "competence",
  "langue",
  "industrie",
] as const;
export type ReferentialType = (typeof REFERENTIAL_TYPES)[number];

export function isReferentialType(value: string): value is ReferentialType {
  return (REFERENTIAL_TYPES as readonly string[]).includes(value);
}

// Types pour lesquels les fiches candidat affichent 2 blocs (IT / Industrie)
// — voir onglets Compétences et Secteurs de la fiche candidat.
export const CATEGORIZABLE_REFERENTIAL_TYPES: ReferentialType[] = [
  "secteur",
  "expertise",
  "competence",
];
