-- CreateTable
CREATE TABLE "subscription_plan_configs" (
    "id" SERIAL NOT NULL,
    "plan_type" "subscription_plan" NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "monthly_log_quota" INTEGER NOT NULL,
    "ai_access" BOOLEAN NOT NULL DEFAULT false,
    "monthly_token_limit" INTEGER NOT NULL DEFAULT 0,
    "price" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_plan_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plan_configs_plan_type_key" ON "subscription_plan_configs"("plan_type");

-- Insert default plans
INSERT INTO "subscription_plan_configs" (plan_type, name, description, monthly_log_quota, ai_access, monthly_token_limit, price, is_active)
VALUES 
    ('free', 'Free Plan', 'Basic plan with limited features', 30, false, 0, 0, true),
    ('pro', 'Pro Plan', 'Advanced plan with AI features', 300, true, 10000, 79000, true),
    ('premium', 'Premium Plan', 'Full-featured plan with maximum benefits', 1000, true, 30000, 149000, true),
    ('therapist', 'Therapist Plan', 'Special plan for therapists', 1000, true, 50000, 0, true)
ON CONFLICT (plan_type) DO NOTHING;

