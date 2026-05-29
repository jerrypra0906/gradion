-- Store Claude-generated Initial Assessment report on child

ALTER TABLE "children"
  ADD COLUMN IF NOT EXISTS "initial_assessment_report" TEXT;

