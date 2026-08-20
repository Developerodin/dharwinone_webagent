-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "sourceLocalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Project_ownerId_sourceLocalId_key" ON "Project"("ownerId", "sourceLocalId");

