-- CreateTable
CREATE TABLE "FeedbackRejectedAnswer" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "supplierId" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "nmId" INTEGER NOT NULL,
    "feedbackText" TEXT NOT NULL DEFAULT '',
    "rejectedAnswerText" TEXT NOT NULL,
    "valuation" INTEGER NOT NULL DEFAULT 5,
    "productCategory" TEXT,
    "productName" TEXT,
    "aiAnalysis" TEXT,
    "mistakeCategory" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackRejectedAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeedbackRejectedAnswer_userId_supplierId_idx" ON "FeedbackRejectedAnswer"("userId", "supplierId");

-- CreateIndex
CREATE INDEX "FeedbackRejectedAnswer_feedbackId_idx" ON "FeedbackRejectedAnswer"("feedbackId");

-- CreateIndex
CREATE INDEX "FeedbackRejectedAnswer_productCategory_idx" ON "FeedbackRejectedAnswer"("productCategory");

-- CreateIndex
CREATE INDEX "FeedbackRejectedAnswer_createdAt_idx" ON "FeedbackRejectedAnswer"("createdAt");
