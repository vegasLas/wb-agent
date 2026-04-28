-- Remove isDisabled column from Account
-- First, delete all soft-disabled accounts (they are no longer needed)
DELETE FROM "Account" WHERE "isDisabled" = true;

-- Drop the isDisabled column
ALTER TABLE "Account" DROP COLUMN "isDisabled";
