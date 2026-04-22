-- Create FeedbackGoodsGroup table
CREATE TABLE "FeedbackGoodsGroup" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "supplierId" TEXT NOT NULL,
    "nmIds" INTEGER[] NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackGoodsGroup_pkey" PRIMARY KEY ("id")
);

-- Create index on userId + supplierId
CREATE INDEX "FeedbackGoodsGroup_userId_supplierId_idx" ON "FeedbackGoodsGroup"("userId", "supplierId");

-- Add nmId column (nullable first for safe backfill)
ALTER TABLE "FeedbackRejectedAnswer" ADD COLUMN "nmId" INTEGER;

-- Backfill nmId from first element of nmIds array
UPDATE "FeedbackRejectedAnswer" SET "nmId" = "nmIds"[1] WHERE "nmIds" IS NOT NULL AND array_length("nmIds", 1) > 0;

-- Set default for rows that might have empty arrays
UPDATE "FeedbackRejectedAnswer" SET "nmId" = 0 WHERE "nmId" IS NULL;

-- Make nmId non-nullable
ALTER TABLE "FeedbackRejectedAnswer" ALTER COLUMN "nmId" SET NOT NULL;

-- Drop old nmIds column and its index
DROP INDEX IF EXISTS "FeedbackRejectedAnswer_nmIds_idx";
ALTER TABLE "FeedbackRejectedAnswer" DROP COLUMN "nmIds";

-- Add index on nmId
CREATE INDEX "FeedbackRejectedAnswer_nmId_idx" ON "FeedbackRejectedAnswer"("nmId");
