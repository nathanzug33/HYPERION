-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "clientOrganizationId" TEXT,
    CONSTRAINT "User_clientOrganizationId_fkey" FOREIGN KEY ("clientOrganizationId") REFERENCES "ClientOrganization" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClientOrganization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Secteur" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Expertise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Seniorite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "anneesMin" INTEGER,
    "anneesMax" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "TypeMobilite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "ZoneGeographique" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Competence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Langue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Consultant" (
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
    CONSTRAINT "Consultant_businessManagerId_fkey" FOREIGN KEY ("businessManagerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Consultant_seniorityId_fkey" FOREIGN KEY ("seniorityId") REFERENCES "Seniorite" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConsultantSecteur" (
    "consultantId" TEXT NOT NULL,
    "secteurId" TEXT NOT NULL,

    PRIMARY KEY ("consultantId", "secteurId"),
    CONSTRAINT "ConsultantSecteur_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConsultantSecteur_secteurId_fkey" FOREIGN KEY ("secteurId") REFERENCES "Secteur" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConsultantExpertise" (
    "consultantId" TEXT NOT NULL,
    "expertiseId" TEXT NOT NULL,

    PRIMARY KEY ("consultantId", "expertiseId"),
    CONSTRAINT "ConsultantExpertise_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConsultantExpertise_expertiseId_fkey" FOREIGN KEY ("expertiseId") REFERENCES "Expertise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConsultantCompetence" (
    "consultantId" TEXT NOT NULL,
    "competenceId" TEXT NOT NULL,

    PRIMARY KEY ("consultantId", "competenceId"),
    CONSTRAINT "ConsultantCompetence_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConsultantCompetence_competenceId_fkey" FOREIGN KEY ("competenceId") REFERENCES "Competence" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConsultantTypeMobilite" (
    "consultantId" TEXT NOT NULL,
    "typeMobiliteId" TEXT NOT NULL,

    PRIMARY KEY ("consultantId", "typeMobiliteId"),
    CONSTRAINT "ConsultantTypeMobilite_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConsultantTypeMobilite_typeMobiliteId_fkey" FOREIGN KEY ("typeMobiliteId") REFERENCES "TypeMobilite" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConsultantZoneGeographique" (
    "consultantId" TEXT NOT NULL,
    "zoneGeographiqueId" TEXT NOT NULL,

    PRIMARY KEY ("consultantId", "zoneGeographiqueId"),
    CONSTRAINT "ConsultantZoneGeographique_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConsultantZoneGeographique_zoneGeographiqueId_fkey" FOREIGN KEY ("zoneGeographiqueId") REFERENCES "ZoneGeographique" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConsultantLangue" (
    "consultantId" TEXT NOT NULL,
    "langueId" TEXT NOT NULL,

    PRIMARY KEY ("consultantId", "langueId"),
    CONSTRAINT "ConsultantLangue_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConsultantLangue_langueId_fkey" FOREIGN KEY ("langueId") REFERENCES "Langue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContactRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "consultantId" TEXT NOT NULL,
    "clientUserId" TEXT NOT NULL,
    "besoin" TEXT NOT NULL,
    "localisation" TEXT,
    "dateDemarrageSouhaitee" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'NOUVELLE',
    "bmNotifieId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContactRequest_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContactRequest_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ContactRequest_bmNotifieId_fkey" FOREIGN KEY ("bmNotifieId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoginLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoginLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConsultationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConsultationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConsultationLog_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_clientOrganizationId_idx" ON "User"("clientOrganizationId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Secteur_label_key" ON "Secteur"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Expertise_label_key" ON "Expertise"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Seniorite_label_key" ON "Seniorite"("label");

-- CreateIndex
CREATE UNIQUE INDEX "TypeMobilite_label_key" ON "TypeMobilite"("label");

-- CreateIndex
CREATE UNIQUE INDEX "ZoneGeographique_label_key" ON "ZoneGeographique"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Competence_label_key" ON "Competence"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Langue_label_key" ON "Langue"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Consultant_referenceAnonyme_key" ON "Consultant"("referenceAnonyme");

-- CreateIndex
CREATE INDEX "Consultant_statutPublication_idx" ON "Consultant"("statutPublication");

-- CreateIndex
CREATE INDEX "Consultant_businessManagerId_idx" ON "Consultant"("businessManagerId");

-- CreateIndex
CREATE INDEX "Consultant_seniorityId_idx" ON "Consultant"("seniorityId");

-- CreateIndex
CREATE INDEX "ContactRequest_consultantId_idx" ON "ContactRequest"("consultantId");

-- CreateIndex
CREATE INDEX "ContactRequest_clientUserId_idx" ON "ContactRequest"("clientUserId");

-- CreateIndex
CREATE INDEX "ContactRequest_status_idx" ON "ContactRequest"("status");

-- CreateIndex
CREATE INDEX "LoginLog_userId_idx" ON "LoginLog"("userId");

-- CreateIndex
CREATE INDEX "LoginLog_createdAt_idx" ON "LoginLog"("createdAt");

-- CreateIndex
CREATE INDEX "ConsultationLog_userId_idx" ON "ConsultationLog"("userId");

-- CreateIndex
CREATE INDEX "ConsultationLog_consultantId_idx" ON "ConsultationLog"("consultantId");

-- CreateIndex
CREATE INDEX "ConsultationLog_createdAt_idx" ON "ConsultationLog"("createdAt");
