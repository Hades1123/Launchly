-- AlterTable
ALTER TABLE "CandidateProfile" ADD COLUMN     "projectsActivities" TEXT,
ADD COLUMN     "schoolMajor" TEXT,
ADD COLUMN     "skills" TEXT[];

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "nameNormalized" TEXT;

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "industry" TEXT,
ADD COLUMN     "titleNormalized" TEXT;

-- CreateIndex
CREATE INDEX "Company_nameNormalized_idx" ON "Company"("nameNormalized");

-- CreateIndex
CREATE INDEX "Job_industry_idx" ON "Job"("industry");

-- CreateIndex
CREATE INDEX "Job_level_idx" ON "Job"("level");

-- CreateIndex
CREATE INDEX "Job_location_idx" ON "Job"("location");

-- CreateIndex
CREATE INDEX "Job_titleNormalized_idx" ON "Job"("titleNormalized");
