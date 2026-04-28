-- Add FREE to SubscriptionTier enum
ALTER TYPE "SubscriptionTier" ADD VALUE 'FREE';

-- Change default tier for new users
ALTER TABLE "User" ALTER COLUMN "subscriptionTier" SET DEFAULT 'FREE';
ALTER TABLE "Payment" ALTER COLUMN "tier" SET DEFAULT 'FREE';

-- Migrate existing LITE users with no subscription to FREE
UPDATE "User"
SET "subscriptionTier" = 'FREE'
WHERE "subscriptionTier" = 'LITE'
  AND "subscriptionExpiresAt" IS NULL;
