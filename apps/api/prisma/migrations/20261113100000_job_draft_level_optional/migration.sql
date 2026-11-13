-- A draft can be saved before a level is chosen; submit still requires one.
-- AlterTable
ALTER TABLE "Job" ALTER COLUMN "level" DROP NOT NULL;
