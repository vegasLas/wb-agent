-- Drop requireApproval column from FeedbackProductRule
ALTER TABLE "FeedbackProductRule" DROP COLUMN IF EXISTS "requireApproval";
