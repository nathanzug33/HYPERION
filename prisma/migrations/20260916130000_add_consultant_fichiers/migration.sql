-- CreateTable
CREATE TABLE "ConsultantFichier" (
    "id" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "nomOriginal" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultantFichier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsultantFichier_consultantId_idx" ON "ConsultantFichier"("consultantId");

-- AddForeignKey
ALTER TABLE "ConsultantFichier" ADD CONSTRAINT "ConsultantFichier_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantFichier" ADD CONSTRAINT "ConsultantFichier_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Reprise des données : un CV déjà enregistré (ancien champ Consultant.cvFileUrl)
-- devient une première entrée ConsultantFichier, avant de supprimer ce champ —
-- aucun CV existant n'est perdu dans la bascule vers l'historique multi-fichiers.
-- createdById reprend le BM référent du dossier (créateur réel inconnu pour
-- l'historique pré-existant).
INSERT INTO "ConsultantFichier" ("id", "consultantId", "type", "storedName", "nomOriginal", "createdById", "createdAt")
SELECT
    substr(md5(random()::text || clock_timestamp()::text || "id"), 1, 25),
    "id",
    'CV',
    "cvFileUrl",
    COALESCE("cvFileNomOriginal", 'CV.pdf'),
    "businessManagerId",
    "updatedAt"
FROM "Consultant"
WHERE "cvFileUrl" IS NOT NULL;

-- AlterTable
ALTER TABLE "Consultant" DROP COLUMN "cvFileNomOriginal",
DROP COLUMN "cvFileUrl";
