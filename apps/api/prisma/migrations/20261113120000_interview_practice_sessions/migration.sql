-- SCRUM-63: job-linked interview practice sessions.
-- Legacy sessions keep their application and get candidateId/jobId from it. They have no
-- interview consent and no expiry (NULL), so the cleanup of SCRUM-66 never deletes them.

-- CreateEnum
CREATE TYPE "PracticeScope" AS ENUM ('FULL', 'ROUND');

-- AlterTable: new columns first as nullable so existing rows can be backfilled
ALTER TABLE "InterviewSession" ADD COLUMN     "candidateId" TEXT,
ADD COLUMN     "jobId" TEXT,
ADD COLUMN     "scope" "PracticeScope" NOT NULL DEFAULT 'FULL',
ADD COLUMN     "interviewConsentAt" TIMESTAMP(3),
ADD COLUMN     "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "summary" TEXT,
ALTER COLUMN "applicationId" DROP NOT NULL;

-- Backfill candidate and job from each legacy session's application
UPDATE "InterviewSession" AS s
SET "candidateId" = a."candidateId", "jobId" = a."jobId"
FROM "Application" AS a
WHERE s."applicationId" = a."id";

ALTER TABLE "InterviewSession" ALTER COLUMN "candidateId" SET NOT NULL,
ALTER COLUMN "jobId" SET NOT NULL;

-- CreateTable
CREATE TABLE "InterviewPracticeRound" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "stageId" TEXT,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" "InterviewSessionStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "feedback" TEXT,

    CONSTRAINT "InterviewPracticeRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewPracticeQuestion" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "source" TEXT NOT NULL,

    CONSTRAINT "InterviewPracticeQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewPracticeAnswer" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "feedback" TEXT,
    "score" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewPracticeAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InterviewPracticeRound_stageId_idx" ON "InterviewPracticeRound"("stageId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewPracticeRound_sessionId_position_key" ON "InterviewPracticeRound"("sessionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewPracticeQuestion_roundId_position_key" ON "InterviewPracticeQuestion"("roundId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewPracticeAnswer_questionId_key" ON "InterviewPracticeAnswer"("questionId");

-- CreateIndex
CREATE INDEX "InterviewSession_candidateId_createdAt_idx" ON "InterviewSession"("candidateId", "createdAt");

-- CreateIndex
CREATE INDEX "InterviewSession_jobId_idx" ON "InterviewSession"("jobId");

-- CreateIndex
CREATE INDEX "InterviewSession_expiresAt_idx" ON "InterviewSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewPracticeRound" ADD CONSTRAINT "InterviewPracticeRound_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewPracticeRound" ADD CONSTRAINT "InterviewPracticeRound_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "JobStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewPracticeQuestion" ADD CONSTRAINT "InterviewPracticeQuestion_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "InterviewPracticeRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewPracticeAnswer" ADD CONSTRAINT "InterviewPracticeAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "InterviewPracticeQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
