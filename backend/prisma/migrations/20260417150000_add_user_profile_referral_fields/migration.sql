-- Add missing user profile / referral fields that exist in Prisma schema
-- but were not included in earlier migrations.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "phone_number" TEXT,
  ADD COLUMN IF NOT EXISTS "referral_code" TEXT,
  ADD COLUMN IF NOT EXISTS "points" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "referred_by_code" TEXT;

-- Match Prisma schema constraints/indexes
CREATE UNIQUE INDEX IF NOT EXISTS "users_referral_code_key" ON "users"("referral_code");
CREATE INDEX IF NOT EXISTS "users_referral_code_idx" ON "users"("referral_code");
CREATE INDEX IF NOT EXISTS "users_referred_by_code_idx" ON "users"("referred_by_code");

