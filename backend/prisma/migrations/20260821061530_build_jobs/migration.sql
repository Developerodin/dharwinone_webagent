-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "BuildJob" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "stages" JSONB NOT NULL DEFAULT '[]',
    "chatText" TEXT,
    "pageFamily" TEXT,
    "versionId" TEXT,
    "version" INTEGER,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "heartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuildJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BuildJob_projectId_createdAt_idx" ON "BuildJob"("projectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "BuildJob_userId_createdAt_idx" ON "BuildJob"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "BuildJob_status_heartbeatAt_idx" ON "BuildJob"("status", "heartbeatAt");

-- AddForeignKey
ALTER TABLE "BuildJob" ADD CONSTRAINT "BuildJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
