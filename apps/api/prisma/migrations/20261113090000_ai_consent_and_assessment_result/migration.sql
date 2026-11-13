-- AlterTable
ALTER TABLE "AiAssessment" ADD COLUMN     "result" JSONB;

-- AlterTable
ALTER TABLE "CandidateProfile" ADD COLUMN     "aiConsentAcceptedAt" TIMESTAMP(3);
