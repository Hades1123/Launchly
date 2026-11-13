-- AlterTable
ALTER TABLE "JobStage" ADD COLUMN     "estimatedDurationMinutes" INTEGER,
ADD COLUMN     "format" TEXT;

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "coverLetter" TEXT;

-- CreateTable
CREATE TABLE "JobNote" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "JobNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobNote_jobId_idx" ON "JobNote"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "JobNote_jobId_position_key" ON "JobNote"("jobId", "position");

-- AddForeignKey
ALTER TABLE "JobNote" ADD CONSTRAINT "JobNote_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
