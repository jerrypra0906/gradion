-- Teaching detail fields for ABA master programs:
-- steps ("Langkah"), prompt hierarchy, and a measurable mastery criterion.
ALTER TABLE "aba_master_programs" ADD COLUMN "steps" JSONB;
ALTER TABLE "aba_master_programs" ADD COLUMN "prompts" JSONB;
ALTER TABLE "aba_master_programs" ADD COLUMN "mastery_criteria" TEXT;
