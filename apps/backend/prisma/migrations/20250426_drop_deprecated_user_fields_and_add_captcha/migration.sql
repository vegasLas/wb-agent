-- Drop deprecated unique constraints first
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_telegramId_key";
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_login_key";

-- Add new fields to User table
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "captcha" TEXT,
  ADD COLUMN IF NOT EXISTS "phoneWb" TEXT,
  ADD COLUMN IF NOT EXISTS "wbCookies" TEXT,
  ADD COLUMN IF NOT EXISTS "captchaText" TEXT,
  ADD COLUMN IF NOT EXISTS "captchaExpiry" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "awaitingPhone" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "lastUpdatedCookie" TIMESTAMP(3);

-- Drop deprecated auth columns
ALTER TABLE "User" DROP COLUMN IF EXISTS "telegramId";
ALTER TABLE "User" DROP COLUMN IF EXISTS "login";
ALTER TABLE "User" DROP COLUMN IF EXISTS "passwordHash";
