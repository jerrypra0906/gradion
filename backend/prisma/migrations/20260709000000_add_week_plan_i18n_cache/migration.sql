-- Cache of the weekly plan per language so switching EN <-> ID is instant
-- after the first translation instead of calling the AI every time.
ALTER TABLE "child_aba_program_weeks" ADD COLUMN "plan_json_i18n" JSONB;
