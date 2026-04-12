-- Migration: Add browser authentication fields to User table
-- This migration adds login and passwordHash fields for browser-based JWT authentication

-- Add login column (unique, nullable)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "login" VARCHAR(255) UNIQUE;

-- Add passwordHash column (nullable)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" VARCHAR(255);

-- Create index for faster login lookups
CREATE INDEX IF NOT EXISTS "User_login_idx" ON "User"("login");

-- Add comment explaining the fields
COMMENT ON COLUMN "User"."login" IS 'Auto-generated browser login username';
COMMENT ON COLUMN "User"."passwordHash" IS 'Bcrypt hashed password for browser auth';
