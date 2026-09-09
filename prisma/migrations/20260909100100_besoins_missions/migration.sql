-- CreateTable
CREATE TABLE "Besoin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entrepriseId" TEXT NOT NULL,
    "contactId" TEXT,
    "businessManagerId" TEXT NOT NULL,
    "intitulePoste" TEXT NOT NULL,
    "descriptifMissions" TEXT,
    "seniorite" TEXT,
    "tjmCibleMin" INTEGER,
    "tjmCibleMax" INTEGER,
    "localisation" TEXT,
    "dateDemarrageSouhaitee" DATETIME,
    "dureeEstimee" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'OUVERT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Besoin_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Besoin_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Besoin_businessManagerId_fkey" FOREIGN KEY ("businessManagerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BesoinCandidat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "besoinId" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'PROPOSE',
    "dateRdvQualification" DATETIME,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BesoinCandidat_besoinId_fkey" FOREIGN KEY ("besoinId") REFERENCES "Besoin" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BesoinCandidat_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BesoinCandidat_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "besoinId" TEXT,
    "entrepriseId" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "businessManagerId" TEXT NOT NULL,
    "intitulePoste" TEXT NOT NULL,
    "tjm" INTEGER,
    "dateDebut" DATETIME NOT NULL,
    "dateFinPrevue" DATETIME,
    "dateFinReelle" DATETIME,
    "statut" TEXT NOT NULL DEFAULT 'EN_COURS',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Mission_besoinId_fkey" FOREIGN KEY ("besoinId") REFERENCES "Besoin" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Mission_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Mission_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Mission_businessManagerId_fkey" FOREIGN KEY ("businessManagerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Besoin_entrepriseId_idx" ON "Besoin"("entrepriseId");

-- CreateIndex
CREATE INDEX "Besoin_businessManagerId_idx" ON "Besoin"("businessManagerId");

-- CreateIndex
CREATE INDEX "Besoin_statut_idx" ON "Besoin"("statut");

-- CreateIndex
CREATE INDEX "BesoinCandidat_besoinId_idx" ON "BesoinCandidat"("besoinId");

-- CreateIndex
CREATE INDEX "BesoinCandidat_consultantId_idx" ON "BesoinCandidat"("consultantId");

-- CreateIndex
CREATE UNIQUE INDEX "BesoinCandidat_besoinId_consultantId_key" ON "BesoinCandidat"("besoinId", "consultantId");

-- CreateIndex
CREATE INDEX "Mission_entrepriseId_idx" ON "Mission"("entrepriseId");

-- CreateIndex
CREATE INDEX "Mission_consultantId_idx" ON "Mission"("consultantId");

-- CreateIndex
CREATE INDEX "Mission_businessManagerId_idx" ON "Mission"("businessManagerId");

-- CreateIndex
CREATE INDEX "Mission_statut_idx" ON "Mission"("statut");
