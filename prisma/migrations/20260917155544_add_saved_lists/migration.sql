-- CreateTable
CREATE TABLE "SavedList" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "queryString" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'PRIVEE',
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedList_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedList_ownerId_idx" ON "SavedList"("ownerId");

-- CreateIndex
CREATE INDEX "SavedList_scope_idx" ON "SavedList"("scope");

-- AddForeignKey
ALTER TABLE "SavedList" ADD CONSTRAINT "SavedList_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
