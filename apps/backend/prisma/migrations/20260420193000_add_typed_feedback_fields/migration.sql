-- Drop the old JSON snapshot column if it exists
ALTER TABLE "FeedbackAutoAnswer" DROP COLUMN IF EXISTS "feedbackSnapshot";

-- Add typed columns for product info
ALTER TABLE "FeedbackAutoAnswer" ADD COLUMN "productName" TEXT;
ALTER TABLE "FeedbackAutoAnswer" ADD COLUMN "productBrand" TEXT;
ALTER TABLE "FeedbackAutoAnswer" ADD COLUMN "productCategory" TEXT;
ALTER TABLE "FeedbackAutoAnswer" ADD COLUMN "supplierArticle" TEXT;

-- Add typed columns for feedback info
ALTER TABLE "FeedbackAutoAnswer" ADD COLUMN "userName" TEXT;
ALTER TABLE "FeedbackAutoAnswer" ADD COLUMN "purchaseDate" INTEGER;
ALTER TABLE "FeedbackAutoAnswer" ADD COLUMN "feedbackDate" INTEGER;
ALTER TABLE "FeedbackAutoAnswer" ADD COLUMN "photos" JSONB;
ALTER TABLE "FeedbackAutoAnswer" ADD COLUMN "video" JSONB;
