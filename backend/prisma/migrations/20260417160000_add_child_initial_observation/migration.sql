-- Store Initial Observation Checklist results on child

ALTER TABLE "children"
  ADD COLUMN IF NOT EXISTS "initial_observation" JSONB;

CREATE INDEX IF NOT EXISTS "children_initial_observation_idx"
  ON "children" USING GIN ("initial_observation");

