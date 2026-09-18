-- Removes the practice data scripts/regression.mjs writes while exercising the
-- guided-session flow. The suite runs a real session end-to-end, so it leaves a
-- completed session and its synced parent log behind on the child it picks.
--
--   docker compose exec -T postgres psql -U gradion_user -d gradion \
--     -f - < scripts/regression-cleanup.sql
--
-- Adjust the cutoff to the moment before your run.
\set cutoff '2026-09-18 00:00:00'

DELETE FROM parent_logs
WHERE created_at > :'cutoff'
  AND child_id IN (SELECT child_id FROM child_aba_program_weeks);

DELETE FROM child_aba_program_sessions
WHERE started_at > :'cutoff';
