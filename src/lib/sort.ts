// Tri de colonnes piloté par l'URL (?sort=cle_asc|cle_desc) pour les listes
// admin en table — cycle au clic sur l'en-tête : défaut → A→Z → Z→A → défaut.
// Rendu 100% serveur (pas de JS client), donc triable/partageable/bookmarkable.

export type SortDirection = "asc" | "desc";
export type SortState = { key: string | null; dir: SortDirection };

export function parseSort(sort: string | undefined, validKeys: readonly string[]): SortState {
  if (!sort) return { key: null, dir: "asc" };
  const idx = sort.lastIndexOf("_");
  if (idx === -1) return { key: null, dir: "asc" };
  const key = sort.slice(0, idx);
  const dir = sort.slice(idx + 1);
  if ((dir !== "asc" && dir !== "desc") || !validKeys.includes(key)) return { key: null, dir: "asc" };
  return { key, dir };
}

/** Valeur du prochain clic sur l'en-tête `key` : undefined = retour au tri par défaut. */
export function nextSort(key: string, current: SortState): string | undefined {
  if (current.key !== key) return `${key}_asc`;
  if (current.dir === "asc") return `${key}_desc`;
  return undefined;
}

export function buildSortHref(
  basePath: string,
  baseParams: Record<string, string | undefined>,
  sort: string | undefined,
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(baseParams)) {
    if (v) params.set(k, v);
  }
  if (sort) params.set("sort", sort);
  const qs = params.toString();
  return `${basePath}${qs ? `?${qs}` : ""}`;
}
