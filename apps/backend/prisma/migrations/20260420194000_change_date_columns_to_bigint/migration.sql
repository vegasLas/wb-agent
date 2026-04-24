-- AlterTable: change timestamp columns from INTEGER to BIGINT to support millisecond timestamps
ALTER TABLE "FeedbackAutoAnswer" ALTER COLUMN "purchaseDate" TYPE BIGINT USING "purchaseDate"::BIGINT;
ALTER TABLE "FeedbackAutoAnswer" ALTER COLUMN "feedbackDate" TYPE BIGINT USING "feedbackDate"::BIGINT;
