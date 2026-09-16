import { PrismaClient } from "@prisma/client";
import { deleteCvFile } from "../src/lib/cv-storage";
import { deleteDcFile } from "../src/lib/dc-storage";
import { deleteTranscriptFile } from "../src/lib/transcript-storage";

// Réinitialise le vivier ATS à zéro : supprime tous les dossiers candidats
// (Consultant) et leurs pièces jointes (CV/DC, stockage objet Supabase),
// ainsi que les missions qui leur sont liées (une mission n'a pas de sens
// sans le consultant staffé). Ne touche ni au CRM (entreprises/besoins/
// offres), ni aux comptes utilisateurs — pour désactiver un accès BM,
// utiliser le bouton "Révoquer l'accès" sur /admin/utilisateurs.
//
// Usage : npm run db:reset-vivier

const prisma = new PrismaClient();

async function main() {
  const consultants = await prisma.consultant.findMany({
    select: {
      id: true,
      prenom: true,
      nom: true,
      fichiers: { select: { type: true, storedName: true } },
    },
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

  let fichiersSupprimes = 0;
  for (const c of consultants) {
    for (const f of c.fichiers) {
      if (f.type === "CV") await deleteCvFile(f.storedName);
      else if (f.type === "DC") await deleteDcFile(f.storedName);
      else await deleteTranscriptFile(f.storedName);
      fichiersSupprimes++;
    }
  }

  console.log(
    `\nTerminé : ${consultants.length} dossier(s) et ${fichiersSupprimes} fichier(s) (CV/DC/transcript) supprimés.`
  );
}

main()
  .catch((err) => {
    console.error("Erreur pendant la réinitialisation :", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
