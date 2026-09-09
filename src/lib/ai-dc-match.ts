// Rapprochement des valeurs générées par l'IA (libellés) avec les
// référentiels existants — utilisé à la fois par la génération IA à la
// création d'un dossier et par la régénération sur un dossier existant.

export function normLabel(s: string): string {
  return s.trim().toLowerCase();
}

export function matchIds<T extends { id: string; label: string }>(
  items: T[],
  labels: string[]
): string[] {
  const wanted = new Set(labels.map(normLabel));
  return items.filter((i) => wanted.has(normLabel(i.label))).map((i) => i.id);
}

export async function findOrCreateByLabel(
  delegate: {
    findMany: (args: {
      where: { active: boolean };
    }) => Promise<{ id: string; label: string }[]>;
    create: (args: {
      data: { label: string };
    }) => Promise<{ id: string; label: string }>;
  },
  labels: string[]
): Promise<Map<string, string>> {
  const existing = await delegate.findMany({ where: { active: true } });
  const byLower = new Map(existing.map((e) => [normLabel(e.label), e.id]));
  const result = new Map<string, string>();
  for (const label of labels) {
    const key = normLabel(label);
    let id = byLower.get(key);
    if (!id) {
      const created = await delegate.create({ data: { label } });
      id = created.id;
      byLower.set(key, id);
    }
    result.set(label, id);
  }
  return result;
}
