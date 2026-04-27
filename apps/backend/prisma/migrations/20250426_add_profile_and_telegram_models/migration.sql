-- Create Profile table
CREATE TABLE IF NOT EXISTS "Profile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- Create Telegram table
CREATE TABLE IF NOT EXISTS "Telegram" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "chatId" TEXT,
    "username" TEXT,
    "languageCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Telegram_pkey" PRIMARY KEY ("id")
);

-- Create unique index on Profile.userId
CREATE UNIQUE INDEX IF NOT EXISTS "Profile_userId_key" ON "Profile"("userId");

-- Create unique index on Telegram.userId
CREATE UNIQUE INDEX IF NOT EXISTS "Telegram_userId_key" ON "Telegram"("userId");

-- Create unique index on Telegram.chatId
CREATE UNIQUE INDEX IF NOT EXISTS "Telegram_chatId_key" ON "Telegram"("chatId");

-- Add foreign keys
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Telegram" ADD CONSTRAINT "Telegram_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate profile data from User
INSERT INTO "Profile" ("userId", "name", "phone", "updatedAt")
SELECT "id", "name", "phone", NOW()
FROM "User";

-- Migrate telegram data from User
INSERT INTO "Telegram" ("userId", "chatId", "username", "languageCode", "updatedAt")
SELECT "id", "chatId", "username", "languageCode", NOW()
FROM "User"
WHERE "chatId" IS NOT NULL OR "username" IS NOT NULL OR "languageCode" IS NOT NULL;

-- Drop columns from User
ALTER TABLE "User" DROP COLUMN IF EXISTS "name";
ALTER TABLE "User" DROP COLUMN IF EXISTS "chatId";
ALTER TABLE "User" DROP COLUMN IF EXISTS "username";
ALTER TABLE "User" DROP COLUMN IF EXISTS "languageCode";
ALTER TABLE "User" DROP COLUMN IF EXISTS "phone";

-- Drop old unique index
DROP INDEX IF EXISTS "User_chatId_key";
