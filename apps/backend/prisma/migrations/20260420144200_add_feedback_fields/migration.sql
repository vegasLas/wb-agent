-- Add trustFactor, feedbackTextCons, feedbackTextPros to FeedbackAutoAnswer
ALTER TABLE "FeedbackAutoAnswer" ADD COLUMN "trustFactor" TEXT NOT NULL DEFAULT 'buyout';
ALTER TABLE "FeedbackAutoAnswer" ADD COLUMN "feedbackTextCons" TEXT;
ALTER TABLE "FeedbackAutoAnswer" ADD COLUMN "feedbackTextPros" TEXT;
