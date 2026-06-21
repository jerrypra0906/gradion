-- Master autism cases (observation + initial programs) and per-child learning insights.

CREATE TABLE IF NOT EXISTS "aba_autism_cases" (
  "id" TEXT NOT NULL,
  "case_number" INTEGER,
  "observation_text" TEXT NOT NULL,
  "observation_json" JSONB,
  "initial_programs" JSONB NOT NULL,
  "plan_snapshot_json" JSONB,
  "source" TEXT NOT NULL,
  "child_id" INTEGER,
  "language" TEXT NOT NULL DEFAULT 'id',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "aba_autism_cases_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "aba_autism_cases_source_idx" ON "aba_autism_cases"("source");
CREATE INDEX IF NOT EXISTS "aba_autism_cases_child_id_idx" ON "aba_autism_cases"("child_id");
CREATE INDEX IF NOT EXISTS "aba_autism_cases_language_idx" ON "aba_autism_cases"("language");

DO $$ BEGIN
  ALTER TABLE "aba_autism_cases"
    ADD CONSTRAINT "aba_autism_cases_child_id_fkey"
    FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "aba_program_learning_insights" (
  "id" SERIAL NOT NULL,
  "child_id" INTEGER NOT NULL,
  "week_id" INTEGER,
  "insight_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "aba_program_learning_insights_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "aba_program_learning_insights_child_id_idx" ON "aba_program_learning_insights"("child_id");
CREATE INDEX IF NOT EXISTS "aba_program_learning_insights_week_id_idx" ON "aba_program_learning_insights"("week_id");

DO $$ BEGIN
  ALTER TABLE "aba_program_learning_insights"
    ADD CONSTRAINT "aba_program_learning_insights_child_id_fkey"
    FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "aba_program_learning_insights"
    ADD CONSTRAINT "aba_program_learning_insights_week_id_fkey"
    FOREIGN KEY ("week_id") REFERENCES "child_aba_program_weeks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
