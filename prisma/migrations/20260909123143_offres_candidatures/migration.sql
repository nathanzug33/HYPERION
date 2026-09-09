-- CreateTable
CREATE TABLE "Offre" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "descriptif" TEXT,
    "profilRecherche" TEXT,
    "typeContratOffre" TEXT,
    "tjmMin" INTEGER,
    "tjmMax" INTEGER,
    "salaireMin" INTEGER,
    "salaireMax" INTEGER,
    "localisation" TEXT,
    "dateDemarrage" DATETIME,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "datePublication" DATETIME,
    "dateDepublication" DATETIME,
    "besoinId" TEXT,
    "entrepriseId" TEXT,
    "businessManagerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Offre_besoinId_fkey" FOREIGN KEY ("besoinId") REFERENCES "Besoin" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Offre_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Offre_businessManagerId_fkey" FOREIGN KEY ("businessManagerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Candidature" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "offreId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "message" TEXT,
    "cvFileUrl" TEXT,
    "cvFileNomOriginal" TEXT,
    "consentementRgpd" BOOLEAN NOT NULL DEFAULT false,
    "statut" TEXT NOT NULL DEFAULT 'NOUVELLE',
    "consultantId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Candidature_offreId_fkey" FOREIGN KEY ("offreId") REFERENCES "Offre" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Candidature_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Offre_reference_key" ON "Offre"("reference");

-- CreateIndex
CREATE INDEX "Offre_besoinId_idx" ON "Offre"("besoinId");

-- CreateIndex
CREATE INDEX "Offre_entrepriseId_idx" ON "Offre"("entrepriseId");

-- CreateIndex
CREATE INDEX "Offre_businessManagerId_idx" ON "Offre"("businessManagerId");

-- CreateIndex
CREATE INDEX "Offre_statut_idx" ON "Offre"("statut");

-- CreateIndex
CREATE INDEX "Candidature_offreId_idx" ON "Candidature"("offreId");

-- CreateIndex
CREATE INDEX "Candidature_statut_idx" ON "Candidature"("statut");
