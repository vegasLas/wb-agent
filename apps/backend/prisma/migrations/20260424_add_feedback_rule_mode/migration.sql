-- Replace autoAnswer boolean with mode enum on FeedbackRule

-- 1. Create enum type
CREATE TYPE "FeedbackRuleMode" AS ENUM ('skip', 'instruction');

-- 2. Add mode column (nullable initially)
ALTER TABLE "FeedbackRule" ADD COLUMN "mode" "FeedbackRuleMode";

-- 3. Migrate existing data: true -> skip, false -> instruction
UPDATE "FeedbackRule" SET "mode" = 'skip' WHERE "autoAnswer" = true;
UPDATE "FeedbackRule" SET "mode" = 'instruction' WHERE "autoAnswer" = false;

-- 4. Set default and NOT NULL
ALTER TABLE "FeedbackRule" ALTER COLUMN "mode" SET DEFAULT 'skip';
ALTER TABLE "FeedbackRule" ALTER COLUMN "mode" SET NOT NULL;

-- 5. Drop old autoAnswer column
ALTER TABLE "FeedbackRule" DROP COLUMN "autoAnswer";
