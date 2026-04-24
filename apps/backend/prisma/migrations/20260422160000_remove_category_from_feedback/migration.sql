-- Remove category-related fields and table from feedback system

-- Drop productCategory column from FeedbackAutoAnswer
ALTER TABLE "FeedbackAutoAnswer" DROP COLUMN IF EXISTS "productCategory";

-- Drop productCategory column from FeedbackRejectedAnswer
ALTER TABLE "FeedbackRejectedAnswer" DROP COLUMN IF EXISTS "productCategory";

-- Drop FeedbackCategorySetting table
DROP TABLE IF EXISTS "FeedbackCategorySetting";
