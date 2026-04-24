-- Change FeedbackProductRule from single nmId to nmIds array

-- 1. Add new nmIds column as integer array
ALTER TABLE "FeedbackProductRule" ADD COLUMN "nmIds" INTEGER[];

-- 2. Migrate existing data: each rule gets nmIds = [old nmId]
UPDATE "FeedbackProductRule" SET "nmIds" = ARRAY["nmId"];

-- 3. Make nmIds non-nullable
ALTER TABLE "FeedbackProductRule" ALTER COLUMN "nmIds" SET NOT NULL;

-- 4. Drop the old nmId column
ALTER TABLE "FeedbackProductRule" DROP COLUMN "nmId";

-- 5. Drop the unique constraint on (userId, supplierId, nmId)
ALTER TABLE "FeedbackProductRule" DROP CONSTRAINT IF EXISTS "FeedbackProductRule_userId_supplierId_nmId_key";
