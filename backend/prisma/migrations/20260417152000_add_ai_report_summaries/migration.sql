-- Add AI report summaries table (used by /reports endpoints)

CREATE TABLE IF NOT EXISTS "ai_report_summaries" (
  "id" SERIAL NOT NULL,
  "child_id" INTEGER NOT NULL,
  "start_date" TIMESTAMP(3) NOT NULL,
  "end_date" TIMESTAMP(3) NOT NULL,
  "summary" TEXT NOT NULL,
  "recommendations" TEXT NOT NULL,
  "tokens_used" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_report_summaries_pkey" PRIMARY KEY ("id")
);

-- Unique per child + range
CREATE UNIQUE INDEX IF NOT EXISTS "ai_report_summaries_child_id_start_date_end_date_key"
  ON "ai_report_summaries" ("child_id", "start_date", "end_date");

CREATE INDEX IF NOT EXISTS "ai_report_summaries_child_id_idx"
  ON "ai_report_summaries" ("child_id");

CREATE INDEX IF NOT EXISTS "ai_report_summaries_start_date_end_date_idx"
  ON "ai_report_summaries" ("start_date", "end_date");

ALTER TABLE "ai_report_summaries"
  ADD CONSTRAINT "ai_report_summaries_child_id_fkey"
  FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

