/*
  Warnings:

  - You are about to drop the `ConsultantAccess` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "ConsultantAccess_userId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ConsultantAccess";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SuiviCommercial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entrepriseId" TEXT NOT NULL,
    "contactId" TEXT,
    "consultantId" TEXT,
    "type" TEXT NOT NULL,
    "modalite" TEXT,
    "titre" TEXT NOT NULL,
    "notes" TEXT,
    "fichierUrl" TEXT,
    "fichierNomOriginal" TEXT,
    "dateProgrammee" DATETIME,
    "fait" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SuiviCommercial_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SuiviCommercial_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SuiviCommercial_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SuiviCommercial_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SuiviCommercial" ("contactId", "createdAt", "createdById", "dateProgrammee", "entrepriseId", "fait", "id", "modalite", "notes", "titre", "type", "updatedAt") SELECT "contactId", "createdAt", "createdById", "dateProgrammee", "entrepriseId", "fait", "id", "modalite", "notes", "titre", "type", "updatedAt" FROM "SuiviCommercial";
DROP TABLE "SuiviCommercial";
ALTER TABLE "new_SuiviCommercial" RENAME TO "SuiviCommercial";
CREATE INDEX "SuiviCommercial_entrepriseId_idx" ON "SuiviCommercial"("entrepriseId");
CREATE INDEX "SuiviCommercial_contactId_idx" ON "SuiviCommercial"("contactId");
CREATE INDEX "SuiviCommercial_consultantId_idx" ON "SuiviCommercial"("consultantId");
CREATE INDEX "SuiviCommercial_dateProgrammee_idx" ON "SuiviCommercial"("dateProgrammee");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
