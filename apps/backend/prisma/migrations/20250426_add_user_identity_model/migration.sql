-- Migration: Add UserIdentity model and AuthProvider enum
-- Separates authentication concerns from user profile data

-- Create AuthProvider enum
CREATE TYPE "AuthProvider" AS ENUM ('EMAIL', 'TELEGRAM', 'VK', 'LEGACY');

-- Create UserIdentity table
CREATE TABLE "UserIdentity" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerId" TEXT,
    "email" TEXT,
    "passwordHash" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserIdentity_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes for provider lookups
CREATE UNIQUE INDEX "UserIdentity_provider_providerId_key" ON "UserIdentity"("provider", "providerId");
CREATE UNIQUE INDEX "UserIdentity_provider_email_key" ON "UserIdentity"("provider", "email");

-- Create indexes for common query patterns
CREATE INDEX "UserIdentity_userId_idx" ON "UserIdentity"("userId");
CREATE INDEX "UserIdentity_email_idx" ON "UserIdentity"("email");

-- Add foreign key constraint to User table
ALTER TABLE "UserIdentity" ADD CONSTRAINT "UserIdentity_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Note: After running the backfill script (src/scripts/migrate-identities.ts),
-- the following deprecated columns on User can be removed:
-- telegramId, vkId, email, emailVerifiedAt, login, passwordHash
