-- Remove monthly log quota columns from subscriptions
ALTER TABLE subscriptions 
  DROP COLUMN IF EXISTS monthly_log_quota,
  DROP COLUMN IF EXISTS used_logs_this_month,
  DROP COLUMN IF EXISTS last_reset_date;

-- Add index on end_date for faster expiry queries
CREATE INDEX IF NOT EXISTS subscriptions_end_date_idx ON subscriptions(end_date);

-- Update subscription_plan_configs: replace monthly_log_quota with weeks
ALTER TABLE subscription_plan_configs 
  DROP COLUMN IF EXISTS monthly_log_quota,
  ADD COLUMN IF NOT EXISTS weeks INTEGER NOT NULL DEFAULT 4;

-- Set default weeks for each plan type
UPDATE subscription_plan_configs 
SET weeks = CASE 
  WHEN plan_type = 'free' THEN 2
  WHEN plan_type = 'pro' THEN 4
  WHEN plan_type = 'premium' THEN 8
  WHEN plan_type = 'therapist' THEN 52
  ELSE 4
END;

-- Update existing subscriptions to have end_date based on plan weeks
UPDATE subscriptions s
SET end_date = s.start_date + (spc.weeks || ' weeks')::INTERVAL
FROM subscription_plan_configs spc
WHERE s.plan_type = spc.plan_type 
  AND (s.end_date IS NULL OR s.end_date < s.start_date);

