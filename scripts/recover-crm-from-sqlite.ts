import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";

// Récupère les entreprises/contacts saisis dans l'ancienne base locale
// SQLite (avant la bascule vers PostgreSQL/Supabase) à partir de dumps JSON
// des tables Entreprise et Contact, et les réinjecte dans la base actuelle
// (celle pointée par DATABASE_URL dans .env — doit être la base Supabase).
//
// Étape préalable (dump depuis l'ancienne base, sqlite3 est déjà installé
// sur macOS) :
//   sqlite3 -json prisma/dev.db "SELECT * FROM Entreprise;" > entreprises.json
//   sqlite3 -json prisma/dev.db "SELECT * FROM Contact;" > contacts.json
//
// Puis : npx tsx scripts/recover-crm-from-sqlite.ts entreprises.json contacts.json
//
// Idempotent : une entreprise déjà présente (même nom, insensible à la
// casse) n'est pas recréée — ses contacts sont alors rattachés à
// l'entreprise existante plutôt qu'à un doublon.

const prisma = new PrismaClient();

type OldEntreprise = {
  id: string;
  nom: string;
  secteurCategorie: string | null;
  siteWeb: string | null;
  adresse: string | null;
  ville: string | null;
  codePostal: string | null;
  tailleEffectif: string | null;
  statutCommercial: string;
  notes: string | null;
};

type OldContact = {
  id: string;
  entrepriseId: string;
  prenom: string;
  nom: string;
  fonction: string | null;
  email: string | null;
  telephone: string | null;
  notes: string | null;
  principal: number | boolean;
};

async function main() {
  const [entreprisesPath, contactsPath] = process.argv.slice(2);
  if (!entreprisesPath || !contactsPath) {
    console.error(
      "Usage : npx tsx scripts/recover-crm-from-sqlite.ts entreprises.json contacts.json"
    );
    process.exitCode = 1;
    return;
  }

  const oldEntreprises: OldEntreprise[] = JSON.parse(
    await readFile(entreprisesPath, "utf-8")
  );
  const oldContacts: OldContact[] = JSON.parse(await readFile(contactsPath, "utf-8"));

  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
  });
  if (!admin) {
    console.error("Aucun compte ADMIN trouvé dans la base cible — lancez le seed d'abord.");
    process.exitCode = 1;
    return;
  }

  // id ancienne base -> id nouvelle base, pour relier les contacts à la
  // bonne entreprise (nouvelle ou déjà existante) une fois insérée.
  const idMap = new Map<string, string>();

  for (const e of oldEntreprises) {
    const existing = await prisma.entreprise.findFirst({
      where: { nom: { equals: e.nom, mode: "insensitive" } },
    });
    if (existing) {
      idMap.set(e.id, existing.id);
      console.log(`= Entreprise déjà présente, réutilisée : ${e.nom}`);
      continue;
    }

    const created = await prisma.entreprise.create({
      data: {
        nom: e.nom,
        secteurCategorie: e.secteurCategorie,
        siteWeb: e.siteWeb,
        adresse: e.adresse,
        ville: e.ville,
        codePostal: e.codePostal,
        tailleEffectif: e.tailleEffectif,
        statutCommercial: e.statutCommercial || "PROSPECT",
        notes: e.notes,
        businessManagerId: admin.id,
      },
    });
    idMap.set(e.id, created.id);
    console.log(`+ Entreprise restaurée : ${e.nom}`);
  }

  let contactsRestaures = 0;
  let contactsIgnores = 0;
  for (const c of oldContacts) {
    const entrepriseId = idMap.get(c.entrepriseId);
    if (!entrepriseId) {
      console.warn(
        `! Contact ${c.prenom} ${c.nom} ignoré : entreprise d'origine (${c.entrepriseId}) introuvable dans le dump.`
      );
      contactsIgnores++;
      continue;
    }

    const existing = await prisma.contact.findFirst({
      where: {
        entrepriseId,
        prenom: { equals: c.prenom, mode: "insensitive" },
        nom: { equals: c.nom, mode: "insensitive" },
      },
    });
    if (existing) {
      console.log(`= Contact déjà présent, ignoré : ${c.prenom} ${c.nom}`);
      contactsIgnores++;
      continue;
    }

    await prisma.contact.create({
      data: {
        entrepriseId,
        prenom: c.prenom,
        nom: c.nom,
        fonction: c.fonction,
        email: c.email,
        telephone: c.telephone,
        notes: c.notes,
        principal: Boolean(c.principal),
      },
    });
    contactsRestaures++;
    console.log(`+ Contact restauré : ${c.prenom} ${c.nom} (${c.email ?? "sans email"})`);
  }

  console.log(
    `\nTerminé : ${idMap.size} entreprise(s) traitée(s), ${contactsRestaures} contact(s) restauré(s), ${contactsIgnores} ignoré(s) (déjà présents).`
  );
  console.log(
    "Toutes les entreprises restaurées sont rattachées à votre compte admin comme référent — réassignez-les si besoin depuis /admin/crm."
  );
}

main()
  .catch((err) => {
    console.error("Erreur pendant la récupération :", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
