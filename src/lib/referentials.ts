export const REFERENTIAL_TYPES = [
  "secteur",
  "expertise",
  "seniorite",
  "typeMobilite",
  "zoneGeographique",
  "competence",
  "langue",
] as const;
export type ReferentialType = (typeof REFERENTIAL_TYPES)[number];

export function isReferentialType(value: string): value is ReferentialType {
  return (REFERENTIAL_TYPES as readonly string[]).includes(value);
}
