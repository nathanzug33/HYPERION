const MOIS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

export function formatMoisAnnee(date: Date | null): string {
  if (!date) return "aujourd'hui";
  return `${MOIS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDuree(debut: Date | null, fin: Date | null): string {
  if (!debut) return "";
  const end = fin ?? new Date();
  let months =
    (end.getFullYear() - debut.getFullYear()) * 12 + (end.getMonth() - debut.getMonth());
  months = Math.max(0, months) + 1; // mois inclusifs
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} an${years > 1 ? "s" : ""}`);
  if (remMonths > 0 || years === 0) parts.push(`${remMonths} mois`);
  return parts.join(" et ");
}
