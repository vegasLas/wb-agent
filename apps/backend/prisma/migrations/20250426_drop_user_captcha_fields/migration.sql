-- Drop captcha and phone-related fields from User table
ALTER TABLE "User"
  DROP COLUMN IF EXISTS "captcha",
  DROP COLUMN IF EXISTS "phoneWb",
  DROP COLUMN IF EXISTS "wbCookies",
  DROP COLUMN IF EXISTS "captchaText",
  DROP COLUMN IF EXISTS "captchaExpiry",
  DROP COLUMN IF EXISTS "awaitingPhone",
  DROP COLUMN IF EXISTS "lastUpdatedCookie";
