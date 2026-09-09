-- CreateTable
CREATE TABLE "Industrie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Entreprise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "secteurCategorie" TEXT,
    "industrieId" TEXT,
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
    CONSTRAINT "Entreprise_industrieId_fkey" FOREIGN KEY ("industrieId") REFERENCES "Industrie" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Entreprise_businessManagerId_fkey" FOREIGN KEY ("businessManagerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Entreprise" ("adresse", "businessManagerId", "codePostal", "createdAt", "id", "nom", "notes", "siteWeb", "statutCommercial", "tailleEffectif", "updatedAt", "ville") SELECT "adresse", "businessManagerId", "codePostal", "createdAt", "id", "nom", "notes", "siteWeb", "statutCommercial", "tailleEffectif", "updatedAt", "ville" FROM "Entreprise";
DROP TABLE "Entreprise";
ALTER TABLE "new_Entreprise" RENAME TO "Entreprise";
CREATE INDEX "Entreprise_businessManagerId_idx" ON "Entreprise"("businessManagerId");
CREATE INDEX "Entreprise_statutCommercial_idx" ON "Entreprise"("statutCommercial");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Industrie_label_key" ON "Industrie"("label");
