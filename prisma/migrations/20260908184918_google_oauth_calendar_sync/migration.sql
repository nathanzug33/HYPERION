-- AlterTable
ALTER TABLE "SuiviCandidat" ADD COLUMN "googleEventId" TEXT;

-- AlterTable
ALTER TABLE "SuiviCommercial" ADD COLUMN "googleEventId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "googleAccessTokenEnc" TEXT;
ALTER TABLE "User" ADD COLUMN "googleConnectedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "googleEmail" TEXT;
ALTER TABLE "User" ADD COLUMN "googleRefreshTokenEnc" TEXT;
ALTER TABLE "User" ADD COLUMN "googleTokenExpiresAt" DATETIME;
