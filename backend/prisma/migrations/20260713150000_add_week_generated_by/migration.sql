-- Marks how a weekly program came to exist (e.g. 'auto_progress_gate' when the
-- system generated it automatically after the practice targets were achieved).
ALTER TABLE "child_aba_program_weeks" ADD COLUMN "generated_by" TEXT;
