-- Cache Indonesian initial assessment report separately

ALTER TABLE "children"
  ADD COLUMN IF NOT EXISTS "initial_assessment_report_id" TEXT;

