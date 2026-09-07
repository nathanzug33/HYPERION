-- CreateTable
CREATE TABLE "CompetenceCategorie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "consultantId" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "niveau" INTEGER NOT NULL DEFAULT 3,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CompetenceCategorie_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Formation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "consultantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "annee" TEXT NOT NULL,
    "intitule" TEXT NOT NULL,
    "etablissement" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Formation_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Experience" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "consultantId" TEXT NOT NULL,
    "entreprise" TEXT NOT NULL,
    "secteurActivite" TEXT,
    "missionTitre" TEXT NOT NULL,
    "dateDebut" DATETIME,
    "dateFin" DATETIME,
    "contexteObjectif" TEXT,
    "realisations" TEXT,
    "environnementTechnique" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Experience_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "villeRattachementZoneLarge" TEXT,
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
INSERT INTO "new_Consultant" ("anneesExperienceMax", "anneesExperienceMin", "businessManagerId", "consentementDate", "consentementPublication", "consentementRgpd", "createdAt", "cvFileUrl", "dateCollecte", "dateConservationLimite", "dateDepublication", "datePublication", "dateRencontre", "disponibilite", "disponibiliteConfirmeeLe", "dureeConservationMois", "email", "id", "intitulePoste", "nom", "notesEntretien", "ouvertGrandDeplacement", "prenom", "rayonKm", "referenceAnonyme", "resumeContexte", "seniorityId", "statutCandidatInterne", "statutPublication", "telephone", "tjmMax", "tjmMin", "typeContrat", "updatedAt", "villeRattachementZoneLarge") SELECT "anneesExperienceMax", "anneesExperienceMin", "businessManagerId", "consentementDate", "consentementPublication", "consentementRgpd", "createdAt", "cvFileUrl", "dateCollecte", "dateConservationLimite", "dateDepublication", "datePublication", "dateRencontre", "disponibilite", "disponibiliteConfirmeeLe", "dureeConservationMois", "email", "id", "intitulePoste", "nom", "notesEntretien", "ouvertGrandDeplacement", "prenom", "rayonKm", "referenceAnonyme", "resumeContexte", "seniorityId", "statutCandidatInterne", "statutPublication", "telephone", "tjmMax", "tjmMin", "typeContrat", "updatedAt", "villeRattachementZoneLarge" FROM "Consultant";
DROP TABLE "Consultant";
ALTER TABLE "new_Consultant" RENAME TO "Consultant";
CREATE UNIQUE INDEX "Consultant_referenceAnonyme_key" ON "Consultant"("referenceAnonyme");
CREATE INDEX "Consultant_statutPublication_idx" ON "Consultant"("statutPublication");
CREATE INDEX "Consultant_businessManagerId_idx" ON "Consultant"("businessManagerId");
CREATE INDEX "Consultant_seniorityId_idx" ON "Consultant"("seniorityId");
CREATE TABLE "new_ConsultantCompetence" (
    "consultantId" TEXT NOT NULL,
    "competenceId" TEXT NOT NULL,
    "estCle" BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY ("consultantId", "competenceId"),
    CONSTRAINT "ConsultantCompetence_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConsultantCompetence_competenceId_fkey" FOREIGN KEY ("competenceId") REFERENCES "Competence" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ConsultantCompetence" ("competenceId", "consultantId") SELECT "competenceId", "consultantId" FROM "ConsultantCompetence";
DROP TABLE "ConsultantCompetence";
ALTER TABLE "new_ConsultantCompetence" RENAME TO "ConsultantCompetence";
CREATE TABLE "new_ConsultantLangue" (
    "consultantId" TEXT NOT NULL,
    "langueId" TEXT NOT NULL,
    "niveau" INTEGER NOT NULL DEFAULT 3,
    "detail" TEXT,

    PRIMARY KEY ("consultantId", "langueId"),
    CONSTRAINT "ConsultantLangue_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConsultantLangue_langueId_fkey" FOREIGN KEY ("langueId") REFERENCES "Langue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ConsultantLangue" ("consultantId", "langueId") SELECT "consultantId", "langueId" FROM "ConsultantLangue";
DROP TABLE "ConsultantLangue";
ALTER TABLE "new_ConsultantLangue" RENAME TO "ConsultantLangue";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CompetenceCategorie_consultantId_idx" ON "CompetenceCategorie"("consultantId");

-- CreateIndex
CREATE INDEX "Formation_consultantId_idx" ON "Formation"("consultantId");

-- CreateIndex
CREATE INDEX "Experience_consultantId_idx" ON "Experience"("consultantId");
