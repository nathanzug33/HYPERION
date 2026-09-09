import { PrismaClient } from "@prisma/client";
import { unlink } from "node:fs/promises";
import path from "node:path";

// Réinitialise le vivier ATS à zéro : supprime tous les dossiers candidats
// (Consultant) et les CV stockés sur disque, ainsi que les missions qui
// leur sont liées (une mission n'a pas de sens sans le consultant staffé).
// Ne touche ni au CRM (entreprises/besoins/offres), ni aux comptes
// utilisateurs — pour désactiver un accès BM, utiliser le bouton "Révoquer
// l'accès" sur /admin/utilisateurs.
//
// Usage : npm run db:reset-vivier

const prisma = new PrismaClient();
const CV_DIR = path.join(process.cwd(), "storage", "cv");

async function main() {
  const consultants = await prisma.consultant.findMany({
    select: { id: true, cvFileUrl: true, prenom: true, nom: true },
  });

  if (consultants.length === 0) {
    console.log("Aucun dossier candidat à supprimer — vivier déjà vide.");
    return;
  }

  console.log(`${consultants.length} dossier(s) candidat vont être supprimés :`);
  for (const c of consultants) console.log(`  - ${c.prenom} ${c.nom}`);

  const consultantIds = consultants.map((c) => c.id);

  await prisma.$transaction([
    prisma.mission.deleteMany({ where: { consultantId: { in: consultantIds } } }),
    prisma.consultant.deleteMany({ where: { id: { in: consultantIds } } }),
  ]);

  let cvSupprimes = 0;
  for (const c of consultants) {
    if (!c.cvFileUrl) continue;
    try {
      await unlink(path.join(CV_DIR, c.cvFileUrl));
      cvSupprimes++;
    } catch {
      // Fichier déjà absent sur le disque : rien à faire.
    }
  }

  console.log(
    `\nTerminé : ${consultants.length} dossier(s) et ${cvSupprimes} fichier(s) CV supprimés.`
  );
}

main()
  .catch((err) => {
    console.error("Erreur pendant la réinitialisation :", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
