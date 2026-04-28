-- Create UserSubscription table
CREATE TABLE "UserSubscription" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tier" "SubscriptionTier" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSubscription_pkey" PRIMARY KEY ("id")
);

-- Create index on userId
CREATE INDEX "UserSubscription_userId_idx" ON "UserSubscription"("userId");

-- Add foreign key
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing ACTIVE PAID subscriptions from User to UserSubscription
-- FREE users and expired paid users get NO record (FREE is the default state)
INSERT INTO "UserSubscription" ("userId", "tier", "startedAt", "endedAt")
SELECT 
    "id",
    "subscriptionTier",
    NOW(),
    "subscriptionExpiresAt"
FROM "User"
WHERE 
    "subscriptionTier" != 'FREE'
    AND "subscriptionExpiresAt" IS NOT NULL
    AND "subscriptionExpiresAt" > NOW();

-- Drop old columns from User
ALTER TABLE "User" DROP COLUMN "subscriptionExpiresAt";
ALTER TABLE "User" DROP COLUMN "subscriptionTier";
