-- CreateTable
CREATE TABLE "EntrepriseSecteurRecherche" (
    "entrepriseId" TEXT NOT NULL,
    "secteurId" TEXT NOT NULL,

    PRIMARY KEY ("entrepriseId", "secteurId"),
    CONSTRAINT "EntrepriseSecteurRecherche_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EntrepriseSecteurRecherche_secteurId_fkey" FOREIGN KEY ("secteurId") REFERENCES "Secteur" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EntrepriseExpertiseRecherchee" (
    "entrepriseId" TEXT NOT NULL,
    "expertiseId" TEXT NOT NULL,

    PRIMARY KEY ("entrepriseId", "expertiseId"),
    CONSTRAINT "EntrepriseExpertiseRecherchee_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EntrepriseExpertiseRecherchee_expertiseId_fkey" FOREIGN KEY ("expertiseId") REFERENCES "Expertise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
