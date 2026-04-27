-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('LITE', 'PRO', 'MAX');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'LITE';
ALTER TABLE "User" ADD COLUMN "maxAccounts" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "User" ADD COLUMN "trialUsedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "tier" "SubscriptionTier" NOT NULL DEFAULT 'LITE';

-- Grandfather existing active subscribers to PRO
UPDATE "User"
SET "subscriptionTier" = 'PRO',
    "maxAccounts" = 3
WHERE "subscriptionExpiresAt" > NOW();
