/*
  Warnings:

  - You are about to drop the column `villeRattachementZoneLarge` on the `Consultant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN "poste" TEXT;
ALTER TABLE "User" ADD COLUMN "telephone" TEXT;

-- CreateTable
CREATE TABLE "DemandeBesoin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientUserId" TEXT NOT NULL,
    "intitulePoste" TEXT NOT NULL,
    "descriptifPoste" TEXT NOT NULL,
    "seniorite" TEXT,
    "tjmCibleMin" INTEGER,
    "tjmCibleMax" INTEGER,
    "localisation" TEXT,
    "dateDemarrageSouhaitee" DATETIME,
    "dureeEstimee" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOUVELLE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DemandeBesoin_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Consultant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT,
    "telephone" TEXT,
    "tjmMin" INTEGER,
    "tjmMax" INTEGER,
    "cvFileUrl" TEXT,
    "notesEntretien" TEXT,
    "businessManagerId" TEXT NOT NULL,
    "dateRencontre" DATETIME,
    "statutCandidatInterne" TEXT NOT NULL DEFAULT 'EN_COURS',
    "consentementRgpd" BOOLEAN NOT NULL DEFAULT false,
    "consentementDate" DATETIME,
    "consentementPublication" BOOLEAN NOT NULL DEFAULT false,
    "dateCollecte" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dureeConservationMois" INTEGER NOT NULL DEFAULT 24,
    "dateConservationLimite" DATETIME,
    "referenceAnonyme" TEXT NOT NULL,
    "intitulePoste" TEXT,
    "seniorityId" TEXT,
    "anneesExperienceMin" INTEGER,
    "anneesExperienceMax" INTEGER,
    "resumeContexte" TEXT,
    "disponibilite" TEXT,
    "disponibiliteConfirmeeLe" DATETIME,
    "typeContrat" TEXT,
    "rayonKm" INTEGER,
    "ouvertGrandDeplacement" BOOLEAN NOT NULL DEFAULT false,
    "villeRattachement" TEXT,
    "villeLat" REAL,
    "villeLng" REAL,
    "statutPublication" TEXT NOT NULL DEFAULT 'BROUILLON',
    "datePublication" DATETIME,
    "dateDepublication" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "genereParIA" BOOLEAN NOT NULL DEFAULT false,
    "sourceCvTexte" TEXT,
    "sourceTranscriptTexte" TEXT,
    CONSTRAINT "Consultant_businessManagerId_fkey" FOREIGN KEY ("businessManagerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Consultant_seniorityId_fkey" FOREIGN KEY ("seniorityId") REFERENCES "Seniorite" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Consultant" ("anneesExperienceMax", "anneesExperienceMin", "businessManagerId", "consentementDate", "consentementPublication", "consentementRgpd", "createdAt", "cvFileUrl", "dateCollecte", "dateConservationLimite", "dateDepublication", "datePublication", "dateRencontre", "disponibilite", "disponibiliteConfirmeeLe", "dureeConservationMois", "email", "genereParIA", "id", "intitulePoste", "nom", "notesEntretien", "ouvertGrandDeplacement", "prenom", "rayonKm", "referenceAnonyme", "resumeContexte", "seniorityId", "sourceCvTexte", "sourceTranscriptTexte", "statutCandidatInterne", "statutPublication", "telephone", "tjmMax", "tjmMin", "typeContrat", "updatedAt") SELECT "anneesExperienceMax", "anneesExperienceMin", "businessManagerId", "consentementDate", "consentementPublication", "consentementRgpd", "createdAt", "cvFileUrl", "dateCollecte", "dateConservationLimite", "dateDepublication", "datePublication", "dateRencontre", "disponibilite", "disponibiliteConfirmeeLe", "dureeConservationMois", "email", "genereParIA", "id", "intitulePoste", "nom", "notesEntretien", "ouvertGrandDeplacement", "prenom", "rayonKm", "referenceAnonyme", "resumeContexte", "seniorityId", "sourceCvTexte", "sourceTranscriptTexte", "statutCandidatInterne", "statutPublication", "telephone", "tjmMax", "tjmMin", "typeContrat", "updatedAt" FROM "Consultant";
DROP TABLE "Consultant";
ALTER TABLE "new_Consultant" RENAME TO "Consultant";
CREATE UNIQUE INDEX "Consultant_referenceAnonyme_key" ON "Consultant"("referenceAnonyme");
CREATE INDEX "Consultant_statutPublication_idx" ON "Consultant"("statutPublication");
CREATE INDEX "Consultant_businessManagerId_idx" ON "Consultant"("businessManagerId");
CREATE INDEX "Consultant_seniorityId_idx" ON "Consultant"("seniorityId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "DemandeBesoin_clientUserId_idx" ON "DemandeBesoin"("clientUserId");

-- CreateIndex
CREATE INDEX "DemandeBesoin_status_idx" ON "DemandeBesoin"("status");
