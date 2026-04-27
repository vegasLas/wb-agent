-- Create LinkCode table
CREATE TABLE IF NOT EXISTS "LinkCode" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LinkCode_pkey" PRIMARY KEY ("id")
);

-- Create unique index on userId
CREATE UNIQUE INDEX IF NOT EXISTS "LinkCode_userId_key" ON "LinkCode"("userId");

-- Create unique index on code
CREATE UNIQUE INDEX IF NOT EXISTS "LinkCode_code_key" ON "LinkCode"("code");

-- Create index on expiresAt
CREATE INDEX IF NOT EXISTS "LinkCode_expiresAt_idx" ON "LinkCode"("expiresAt");

-- Add foreign key
ALTER TABLE "LinkCode" ADD CONSTRAINT "LinkCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
