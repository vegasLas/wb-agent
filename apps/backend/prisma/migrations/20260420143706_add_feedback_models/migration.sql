-- Create FeedbackSettings table
CREATE TABLE "FeedbackSettings" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "supplierId" TEXT NOT NULL,
    "autoAnswerEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackSettings_pkey" PRIMARY KEY ("id")
);

-- Create unique index on userId + supplierId
CREATE UNIQUE INDEX "FeedbackSettings_userId_supplierId_key" ON "FeedbackSettings"("userId", "supplierId");
CREATE INDEX "FeedbackSettings_userId_idx" ON "FeedbackSettings"("userId");
CREATE INDEX "FeedbackSettings_supplierId_idx" ON "FeedbackSettings"("supplierId");

-- Create FeedbackProductSetting table
CREATE TABLE "FeedbackProductSetting" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "supplierId" TEXT NOT NULL,
    "nmId" INTEGER NOT NULL,
    "autoAnswerEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackProductSetting_pkey" PRIMARY KEY ("id")
);

-- Create unique index on userId + supplierId + nmId
CREATE UNIQUE INDEX "FeedbackProductSetting_userId_supplierId_nmId_key" ON "FeedbackProductSetting"("userId", "supplierId", "nmId");
CREATE INDEX "FeedbackProductSetting_userId_idx" ON "FeedbackProductSetting"("userId");
CREATE INDEX "FeedbackProductSetting_supplierId_idx" ON "FeedbackProductSetting"("supplierId");
CREATE INDEX "FeedbackProductSetting_nmId_idx" ON "FeedbackProductSetting"("nmId");

-- Create FeedbackAutoAnswer table
CREATE TABLE "FeedbackAutoAnswer" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "supplierId" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "nmId" INTEGER NOT NULL,
    "feedbackText" TEXT NOT NULL DEFAULT '',
    "answerText" TEXT NOT NULL,
    "valuation" INTEGER NOT NULL DEFAULT 5,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackAutoAnswer_pkey" PRIMARY KEY ("id")
);

-- Create unique index on userId + supplierId + feedbackId
CREATE UNIQUE INDEX "FeedbackAutoAnswer_userId_supplierId_feedbackId_key" ON "FeedbackAutoAnswer"("userId", "supplierId", "feedbackId");
CREATE INDEX "FeedbackAutoAnswer_userId_supplierId_nmId_idx" ON "FeedbackAutoAnswer"("userId", "supplierId", "nmId");
CREATE INDEX "FeedbackAutoAnswer_status_idx" ON "FeedbackAutoAnswer"("status");
CREATE INDEX "FeedbackAutoAnswer_createdAt_idx" ON "FeedbackAutoAnswer"("createdAt");
