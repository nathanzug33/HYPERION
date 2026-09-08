import { prisma } from "@/lib/prisma";

// Détection de doublons à la création — non bloquante : le dossier/contact
// est créé normalement, on se contente de signaler les correspondances
// probables pour que l'utilisateur vérifie et fusionne/supprime lui-même si
// besoin. Correspondance sur nom+prénom exacts (insensible à la casse n'est
// pas supporté nativement par Prisma sur SQLite) ou même email.

export async function findConsultantDuplicates(
  nom: string,
  prenom: string,
  email: string | null,
  excludeId: string
): Promise<{ id: string; referenceAnonyme: string; nom: string; prenom: string }[]> {
  return prisma.consultant.findMany({
    where: {
      id: { not: excludeId },
      OR: [
        { AND: [{ nom }, { prenom }] },
        ...(email ? [{ email }] : []),
      ],
    },
    select: { id: true, referenceAnonyme: true, nom: true, prenom: true },
    take: 5,
  });
}

export async function findContactDuplicates(
  entrepriseId: string,
  nom: string,
  prenom: string,
  email: string | null,
  excludeId: string
): Promise<{ id: string; nom: string; prenom: string }[]> {
  return prisma.contact.findMany({
    where: {
      entrepriseId,
      id: { not: excludeId },
      OR: [
        { AND: [{ nom }, { prenom }] },
        ...(email ? [{ email }] : []),
      ],
    },
    select: { id: true, nom: true, prenom: true },
    take: 5,
  });
}
