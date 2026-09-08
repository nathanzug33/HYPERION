-- CreateTable
CREATE TABLE "Entreprise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "secteurActivite" TEXT,
    "siteWeb" TEXT,
    "adresse" TEXT,
    "ville" TEXT,
    "codePostal" TEXT,
    "tailleEffectif" TEXT,
    "statutCommercial" TEXT NOT NULL DEFAULT 'PROSPECT',
    "notes" TEXT,
    "businessManagerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Entreprise_businessManagerId_fkey" FOREIGN KEY ("businessManagerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entrepriseId" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "fonction" TEXT,
    "email" TEXT,
    "telephone" TEXT,
    "notes" TEXT,
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contact_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SuiviCommercial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entrepriseId" TEXT NOT NULL,
    "contactId" TEXT,
    "type" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "notes" TEXT,
    "dateProgrammee" DATETIME,
    "fait" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SuiviCommercial_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SuiviCommercial_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SuiviCommercial_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Entreprise_businessManagerId_idx" ON "Entreprise"("businessManagerId");

-- CreateIndex
CREATE INDEX "Entreprise_statutCommercial_idx" ON "Entreprise"("statutCommercial");

-- CreateIndex
CREATE INDEX "Contact_entrepriseId_idx" ON "Contact"("entrepriseId");

-- CreateIndex
CREATE INDEX "SuiviCommercial_entrepriseId_idx" ON "SuiviCommercial"("entrepriseId");

-- CreateIndex
CREATE INDEX "SuiviCommercial_contactId_idx" ON "SuiviCommercial"("contactId");

-- CreateIndex
CREATE INDEX "SuiviCommercial_dateProgrammee_idx" ON "SuiviCommercial"("dateProgrammee");
