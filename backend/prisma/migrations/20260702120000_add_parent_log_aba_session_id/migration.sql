-- Link auto-created activity logs back to completed ABA sessions (idempotent sync).
ALTER TABLE "parent_logs" ADD COLUMN IF NOT EXISTS "aba_session_id" INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS "parent_logs_aba_session_id_key" ON "parent_logs"("aba_session_id");

ALTER TABLE "parent_logs"
  ADD CONSTRAINT "parent_logs_aba_session_id_fkey"
  FOREIGN KEY ("aba_session_id") REFERENCES "child_aba_program_sessions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
