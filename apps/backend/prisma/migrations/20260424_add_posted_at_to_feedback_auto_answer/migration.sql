-- Add postedAt column to FeedbackAutoAnswer to track when an AI answer was posted

ALTER TABLE "FeedbackAutoAnswer" ADD COLUMN "postedAt" TIMESTAMP(3);
