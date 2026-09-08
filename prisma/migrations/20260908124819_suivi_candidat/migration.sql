-- CreateTable
CREATE TABLE "SuiviCandidat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "consultantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "notes" TEXT,
    "dateProgrammee" DATETIME,
    "fait" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SuiviCandidat_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SuiviCandidat_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SuiviCandidat_consultantId_idx" ON "SuiviCandidat"("consultantId");

-- CreateIndex
CREATE INDEX "SuiviCandidat_dateProgrammee_idx" ON "SuiviCandidat"("dateProgrammee");
