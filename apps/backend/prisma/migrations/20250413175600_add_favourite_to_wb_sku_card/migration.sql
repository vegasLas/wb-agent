-- Add favourite column to WbSkuCard table
ALTER TABLE "WbSkuCard" ADD COLUMN "favourite" BOOLEAN NOT NULL DEFAULT false;
