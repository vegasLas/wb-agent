-- Add wbContentToken column to User table
ALTER TABLE "User" ADD COLUMN "wbContentToken" TEXT;

-- CreateTable
CREATE TABLE "WbSkuCard" (
    "id" TEXT NOT NULL,
    "nmID" INTEGER NOT NULL,
    "imtID" INTEGER,
    "nmUUID" TEXT,
    "subjectID" INTEGER,
    "subjectName" TEXT,
    "vendorCode" TEXT,
    "brand" TEXT,
    "title" TEXT,
    "description" TEXT,
    "image" TEXT,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WbSkuCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WbSkuCard_nmID_userId_key" ON "WbSkuCard"("nmID", "userId");

-- CreateIndex
CREATE INDEX "WbSkuCard_userId_idx" ON "WbSkuCard"("userId");

-- CreateIndex
CREATE INDEX "WbSkuCard_nmID_idx" ON "WbSkuCard"("nmID");

-- AddForeignKey
ALTER TABLE "WbSkuCard" ADD CONSTRAINT "WbSkuCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
