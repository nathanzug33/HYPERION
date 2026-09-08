-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ContactRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "consultantId" TEXT NOT NULL,
    "clientUserId" TEXT NOT NULL,
    "besoin" TEXT NOT NULL,
    "localisation" TEXT,
    "dateDemarrageSouhaitee" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'NOUVELLE',
    "bmNotifieId" TEXT,
    "reponseNote" TEXT,
    "reponduLe" DATETIME,
    "reponduParId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContactRequest_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContactRequest_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ContactRequest_bmNotifieId_fkey" FOREIGN KEY ("bmNotifieId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ContactRequest_reponduParId_fkey" FOREIGN KEY ("reponduParId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ContactRequest" ("besoin", "bmNotifieId", "clientUserId", "consultantId", "createdAt", "dateDemarrageSouhaitee", "id", "localisation", "status", "updatedAt") SELECT "besoin", "bmNotifieId", "clientUserId", "consultantId", "createdAt", "dateDemarrageSouhaitee", "id", "localisation", "status", "updatedAt" FROM "ContactRequest";
DROP TABLE "ContactRequest";
ALTER TABLE "new_ContactRequest" RENAME TO "ContactRequest";
CREATE INDEX "ContactRequest_consultantId_idx" ON "ContactRequest"("consultantId");
CREATE INDEX "ContactRequest_clientUserId_idx" ON "ContactRequest"("clientUserId");
CREATE INDEX "ContactRequest_status_idx" ON "ContactRequest"("status");
CREATE TABLE "new_DemandeBesoin" (
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
    "reponseNote" TEXT,
    "reponduLe" DATETIME,
    "reponduParId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DemandeBesoin_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DemandeBesoin_reponduParId_fkey" FOREIGN KEY ("reponduParId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DemandeBesoin" ("clientUserId", "createdAt", "dateDemarrageSouhaitee", "descriptifPoste", "dureeEstimee", "id", "intitulePoste", "localisation", "seniorite", "status", "tjmCibleMax", "tjmCibleMin", "updatedAt") SELECT "clientUserId", "createdAt", "dateDemarrageSouhaitee", "descriptifPoste", "dureeEstimee", "id", "intitulePoste", "localisation", "seniorite", "status", "tjmCibleMax", "tjmCibleMin", "updatedAt" FROM "DemandeBesoin";
DROP TABLE "DemandeBesoin";
ALTER TABLE "new_DemandeBesoin" RENAME TO "DemandeBesoin";
CREATE INDEX "DemandeBesoin_clientUserId_idx" ON "DemandeBesoin"("clientUserId");
CREATE INDEX "DemandeBesoin_status_idx" ON "DemandeBesoin"("status");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "lastLoginAt" DATETIME,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "poste" TEXT,
    "telephone" TEXT,
    "clientOrganizationId" TEXT,
    CONSTRAINT "User_clientOrganizationId_fkey" FOREIGN KEY ("clientOrganizationId") REFERENCES "ClientOrganization" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("active", "clientOrganizationId", "createdAt", "email", "id", "lastLoginAt", "name", "passwordHash", "poste", "role", "telephone", "twoFactorEnabled", "twoFactorSecret", "updatedAt") SELECT "active", "clientOrganizationId", "createdAt", "email", "id", "lastLoginAt", "name", "passwordHash", "poste", "role", "telephone", "twoFactorEnabled", "twoFactorSecret", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_clientOrganizationId_idx" ON "User"("clientOrganizationId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
