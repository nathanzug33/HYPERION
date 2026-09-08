-- CreateTable
CREATE TABLE "ConsultantAccess" (
    "consultantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("consultantId", "userId"),
    CONSTRAINT "ConsultantAccess_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConsultantAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ConsultantAccess_userId_idx" ON "ConsultantAccess"("userId");
