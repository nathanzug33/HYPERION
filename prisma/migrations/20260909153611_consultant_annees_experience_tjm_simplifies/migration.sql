-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Consultant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT,
    "telephone" TEXT,
    "cvFileUrl" TEXT,
    "cvFileNomOriginal" TEXT,
    "notesEntretien" TEXT,
    "businessManagerId" TEXT NOT NULL,
    "dateRencontre" DATETIME,
    "statutCandidatInterne" TEXT NOT NULL DEFAULT 'EN_COURS',
    "natureContrat" TEXT,
    "salaireBrutAnnuel" INTEGER,
    "tjmAchat" INTEGER,
    "fraisAnnuels" INTEGER,
    "consentementRgpd" BOOLEAN NOT NULL DEFAULT false,
    "consentementDate" DATETIME,
    "consentementPublication" BOOLEAN NOT NULL DEFAULT false,
    "dateCollecte" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dureeConservationMois" INTEGER NOT NULL DEFAULT 24,
    "dateConservationLimite" DATETIME,
    "referenceAnonyme" TEXT NOT NULL,
    "intitulePoste" TEXT,
    "seniorityId" TEXT,
    "anneesExperience" INTEGER,
    "resumeContexte" TEXT,
    "presentationCourte" TEXT,
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
INSERT INTO "new_Consultant" ("businessManagerId", "consentementDate", "consentementPublication", "consentementRgpd", "createdAt", "cvFileNomOriginal", "cvFileUrl", "dateCollecte", "dateConservationLimite", "dateDepublication", "datePublication", "dateRencontre", "disponibilite", "disponibiliteConfirmeeLe", "dureeConservationMois", "email", "fraisAnnuels", "genereParIA", "id", "intitulePoste", "natureContrat", "nom", "notesEntretien", "ouvertGrandDeplacement", "prenom", "presentationCourte", "rayonKm", "referenceAnonyme", "resumeContexte", "salaireBrutAnnuel", "seniorityId", "sourceCvTexte", "sourceTranscriptTexte", "statutCandidatInterne", "statutPublication", "telephone", "tjmAchat", "typeContrat", "updatedAt", "villeLat", "villeLng", "villeRattachement") SELECT "businessManagerId", "consentementDate", "consentementPublication", "consentementRgpd", "createdAt", "cvFileNomOriginal", "cvFileUrl", "dateCollecte", "dateConservationLimite", "dateDepublication", "datePublication", "dateRencontre", "disponibilite", "disponibiliteConfirmeeLe", "dureeConservationMois", "email", "fraisAnnuels", "genereParIA", "id", "intitulePoste", "natureContrat", "nom", "notesEntretien", "ouvertGrandDeplacement", "prenom", "presentationCourte", "rayonKm", "referenceAnonyme", "resumeContexte", "salaireBrutAnnuel", "seniorityId", "sourceCvTexte", "sourceTranscriptTexte", "statutCandidatInterne", "statutPublication", "telephone", "tjmAchat", "typeContrat", "updatedAt", "villeLat", "villeLng", "villeRattachement" FROM "Consultant";
DROP TABLE "Consultant";
ALTER TABLE "new_Consultant" RENAME TO "Consultant";
CREATE UNIQUE INDEX "Consultant_referenceAnonyme_key" ON "Consultant"("referenceAnonyme");
CREATE INDEX "Consultant_statutPublication_idx" ON "Consultant"("statutPublication");
CREATE INDEX "Consultant_businessManagerId_idx" ON "Consultant"("businessManagerId");
CREATE INDEX "Consultant_seniorityId_idx" ON "Consultant"("seniorityId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
