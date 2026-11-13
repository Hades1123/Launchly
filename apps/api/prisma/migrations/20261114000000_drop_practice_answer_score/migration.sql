-- Practice feedback is advisory: no numeric score is stored for a practice answer.
-- The legacy "InterviewAnswer"."score" column is a different table and stays.
ALTER TABLE "InterviewPracticeAnswer" DROP COLUMN "score";
