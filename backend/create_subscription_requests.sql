-- Create enum type
DO $$ BEGIN
    CREATE TYPE "SubscriptionRequestStatus" AS ENUM ('pending', 'processing', 'completed', 'cancelled', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create table
CREATE TABLE IF NOT EXISTS subscription_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_type "SubscriptionPlan" NOT NULL,
    status "SubscriptionRequestStatus" NOT NULL DEFAULT 'pending',
    amount INTEGER NOT NULL,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    midtrans_order_id VARCHAR(255),
    midtrans_token TEXT,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS subscription_requests_user_id_idx ON subscription_requests(user_id);
CREATE INDEX IF NOT EXISTS subscription_requests_status_idx ON subscription_requests(status);
CREATE INDEX IF NOT EXISTS subscription_requests_midtrans_order_id_idx ON subscription_requests(midtrans_order_id);

