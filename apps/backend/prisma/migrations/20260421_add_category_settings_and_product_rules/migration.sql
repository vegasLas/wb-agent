-- Add FeedbackCategorySetting model
CREATE TABLE "FeedbackCategorySetting" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "supplierId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "autoAnswerEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackCategorySetting_pkey" PRIMARY KEY ("id")
);

-- Create unique index for FeedbackCategorySetting
CREATE UNIQUE INDEX "FeedbackCategorySetting_userId_supplierId_category_key" ON "FeedbackCategorySetting"("userId", "supplierId", "category");

-- Create indexes for FeedbackCategorySetting
CREATE INDEX "FeedbackCategorySetting_userId_idx" ON "FeedbackCategorySetting"("userId");
CREATE INDEX "FeedbackCategorySetting_supplierId_idx" ON "FeedbackCategorySetting"("supplierId");
CREATE INDEX "FeedbackCategorySetting_category_idx" ON "FeedbackCategorySetting"("category");

-- Add FeedbackProductRule model
CREATE TABLE "FeedbackProductRule" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "supplierId" TEXT NOT NULL,
    "nmId" INTEGER NOT NULL,
    "minRating" INTEGER,
    "maxRating" INTEGER,
    "excludeKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requireApproval" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackProductRule_pkey" PRIMARY KEY ("id")
);

-- Create unique index for FeedbackProductRule
CREATE UNIQUE INDEX "FeedbackProductRule_userId_supplierId_nmId_key" ON "FeedbackProductRule"("userId", "supplierId", "nmId");

-- Create indexes for FeedbackProductRule
CREATE INDEX "FeedbackProductRule_userId_idx" ON "FeedbackProductRule"("userId");
CREATE INDEX "FeedbackProductRule_supplierId_idx" ON "FeedbackProductRule"("supplierId");
CREATE INDEX "FeedbackProductRule_nmId_idx" ON "FeedbackProductRule"("nmId");
