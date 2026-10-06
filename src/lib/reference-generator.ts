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
export async function generateNextReference(): Promise<string> {
  const last = await prisma.consultant.findFirst({
    where: { referenceAnonyme: { startsWith: "IND-" } },
    orderBy: { createdAt: "desc" },
    select: { referenceAnonyme: true },
  });
  const lastNumber = last
    ? Number((last.referenceAnonyme ?? "").replace("IND-", "")) || 0
    : 0;
  const count = await prisma.consultant.count();
  const next = Math.max(lastNumber, count) + 1;
  return `IND-${String(next).padStart(3, "0")}`;
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
