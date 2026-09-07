import { prisma } from "@/lib/prisma";

// Génère une référence anonyme du type IND-018 qui ne trahit pas l'identité.
export async function generateNextReference(): Promise<string> {
  const last = await prisma.consultant.findFirst({
    where: { referenceAnonyme: { startsWith: "IND-" } },
    orderBy: { createdAt: "desc" },
    select: { referenceAnonyme: true },
  });
  const lastNumber = last
    ? Number(last.referenceAnonyme.replace("IND-", "")) || 0
    : 0;
  const count = await prisma.consultant.count();
  const next = Math.max(lastNumber, count) + 1;
  return `IND-${String(next).padStart(3, "0")}`;
}
