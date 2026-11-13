-- SCRUM-82: replace the job level SENIOR with JUNIOR.
-- Postgres cannot drop an enum value in place, so the type is recreated and the column cast;
-- existing SENIOR rows become JUNIOR.
ALTER TYPE "JobLevel" RENAME TO "JobLevel_old";

CREATE TYPE "JobLevel" AS ENUM ('INTERN', 'FRESHER', 'JUNIOR');

DROP INDEX "Job_level_idx";

ALTER TABLE "Job"
  ALTER COLUMN "level" TYPE "JobLevel"
  USING (CASE WHEN "level"::text = 'SENIOR' THEN 'JUNIOR' ELSE "level"::text END)::"JobLevel";

CREATE INDEX "Job_level_idx" ON "Job"("level");

DROP TYPE "JobLevel_old";
