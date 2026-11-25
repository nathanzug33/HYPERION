import { prisma } from "@/lib/prisma";

/** Renvoie la référence anonyme d'un candidat, en la générant et en la
 * persistant à la volée si elle n'existe pas encore — plus de génération
 * automatique à la création (§ nettoyage UI interne), seulement au moment
 * où un usage anonymisé en a réellement besoin : DC envoyé par push ou
 * exporté, publication dans la bibliothèque client. */
export async function ensureReferenceAnonyme(consultantId: string): Promise<string> {
  const current = await prisma.consultant.findUnique({
    where: { id: consultantId },
    select: { referenceAnonyme: true },
  });
  if (current?.referenceAnonyme) return current.referenceAnonyme;
  const reference = await generateNextReference();
  await prisma.consultant.update({ where: { id: consultantId }, data: { referenceAnonyme: reference } });
  return reference;
}

// Génère une référence anonyme du type IND-018 qui ne trahit pas l'identité.
//
// Doit trouver le plus grand numéro RÉELLEMENT UTILISÉ, pas "le dernier
// candidat créé qui en a une" : depuis que la référence est générée à la
// volée (voir ensureReferenceAnonyme) plutôt qu'à la création, l'ordre
// d'attribution des références ne correspond plus à l'ordre de création
// des candidats — un candidat ancien peut recevoir sa référence après un
// candidat plus récent. Trier par date de création (comme avant) pouvait
// donc renvoyer un numéro inférieur au vrai maximum et en reproduire un
// déjà pris (contrainte d'unicité violée, de façon systématique et non
// transitoire — un nouvel essai retombe sur le même calcul erroné).
export async function generateNextReference(): Promise<string> {
  const existing = await prisma.consultant.findMany({
    where: { referenceAnonyme: { startsWith: "IND-" } },
    select: { referenceAnonyme: true },
  });
  const maxNumber = existing.reduce((max, c) => {
    const n = Number((c.referenceAnonyme ?? "").replace("IND-", "")) || 0;
    return Math.max(max, n);
  }, 0);
  return `IND-${String(maxNumber + 1).padStart(3, "0")}`;
}

// Génère une référence courte du type OFF-012 pour une offre — utilisée
// dans l'URL publique (/offres/OFF-012) plutôt que l'id cuid interne.
export async function generateNextOffreReference(): Promise<string> {
  const last = await prisma.offre.findFirst({
    where: { reference: { startsWith: "OFF-" } },
    orderBy: { createdAt: "desc" },
    select: { reference: true },
  });
  const lastNumber = last ? Number(last.reference.replace("OFF-", "")) || 0 : 0;
  const count = await prisma.offre.count();
  const next = Math.max(lastNumber, count) + 1;
  return `OFF-${String(next).padStart(3, "0")}`;
}
