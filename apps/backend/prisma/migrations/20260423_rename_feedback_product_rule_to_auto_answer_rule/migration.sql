-- Rename FeedbackProductRule to FeedbackRule and add new fields

-- 1. Rename the table
ALTER TABLE "FeedbackProductRule" RENAME TO "FeedbackRule";

-- 2. Rename column excludeKeywords to keywords
ALTER TABLE "FeedbackRule" RENAME COLUMN "excludeKeywords" TO "keywords";

-- 3. Add instruction column (nullable text)
ALTER TABLE "FeedbackRule" ADD COLUMN "instruction" TEXT;

-- 4. Add autoAnswer column with default true
ALTER TABLE "FeedbackRule" ADD COLUMN "autoAnswer" BOOLEAN NOT NULL DEFAULT true;
