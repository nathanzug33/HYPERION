-- AlterTable
ALTER TABLE "Consultant" ADD COLUMN "fraisMensuels" INTEGER;
ALTER TABLE "Consultant" ADD COLUMN "salaireBrutMensuel" INTEGER;

-- CreateTable
CREATE TABLE "MissionJoursTravailles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "missionId" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "mois" INTEGER NOT NULL,
    "joursTravailles" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MissionJoursTravailles_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MissionJoursTravailles_missionId_idx" ON "MissionJoursTravailles"("missionId");

-- CreateIndex
CREATE UNIQUE INDEX "MissionJoursTravailles_missionId_annee_mois_key" ON "MissionJoursTravailles"("missionId", "annee", "mois");
