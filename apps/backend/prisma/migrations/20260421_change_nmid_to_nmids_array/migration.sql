-- Add nmIds array column
ALTER TABLE "FeedbackRejectedAnswer" ADD COLUMN "nmIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- Backfill existing data: move single nmId into nmIds array
UPDATE "FeedbackRejectedAnswer" SET "nmIds" = ARRAY["nmId"] WHERE "nmId" IS NOT NULL;

-- Drop old nmId column
ALTER TABLE "FeedbackRejectedAnswer" DROP COLUMN "nmId";

-- Add GIN index for fast array contains queries
CREATE INDEX "FeedbackRejectedAnswer_nmIds_idx" ON "FeedbackRejectedAnswer" USING GIN ("nmIds");
