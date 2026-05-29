-- Add parent-provided intake notes during child creation

ALTER TABLE "children"
  ADD COLUMN IF NOT EXISTS "behaviors" TEXT,
  ADD COLUMN IF NOT EXISTS "concerns" TEXT,
  ADD COLUMN IF NOT EXISTS "environment" TEXT;

