-- Add isDisabled column to Account for soft-delete / disable functionality

ALTER TABLE "Account" ADD COLUMN "isDisabled" BOOLEAN NOT NULL DEFAULT false;
