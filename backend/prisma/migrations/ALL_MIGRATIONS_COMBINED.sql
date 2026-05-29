-- ============================================
-- COMPLETE DATABASE MIGRATION FOR SUPABASE
-- ============================================
-- Run this entire file in Supabase SQL Editor
-- Or run each section separately if you prefer
-- ============================================

-- ============================================
-- MIGRATION 1: Initial Schema
-- ============================================

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'therapist', 'parent');

-- CreateEnum
CREATE TYPE "BannerAudience" AS ENUM ('parents', 'therapists', 'all');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "role" "Role" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "children" (
    "id" SERIAL NOT NULL,
    "parent_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "birthdate" TIMESTAMP(3),
    "diagnosis" TEXT,
    "monthly_quota" INTEGER NOT NULL DEFAULT 12,
    "used_sessions" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "children_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "therapist_children" (
    "id" SERIAL NOT NULL,
    "therapist_id" INTEGER NOT NULL,
    "child_id" INTEGER NOT NULL,

    CONSTRAINT "therapist_children_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" SERIAL NOT NULL,
    "therapist_id" INTEGER NOT NULL,
    "child_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration_minutes" INTEGER NOT NULL,
    "goals_worked_on" JSONB NOT NULL,
    "notes" TEXT,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banners" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "image_url" TEXT,
    "target_audience" "BannerAudience" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_content" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content_html" TEXT NOT NULL,
    "banner_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_content_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "therapist_children_therapist_id_child_id_key" ON "therapist_children"("therapist_id", "child_id");
CREATE UNIQUE INDEX "cms_content_slug_key" ON "cms_content"("slug");

-- AddForeignKey
ALTER TABLE "children" ADD CONSTRAINT "children_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "therapist_children" ADD CONSTRAINT "therapist_children_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "therapist_children" ADD CONSTRAINT "therapist_children_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cms_content" ADD CONSTRAINT "cms_content_banner_id_fkey" FOREIGN KEY ("banner_id") REFERENCES "banners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- MIGRATION 2: Email Verification & Google Auth
-- ============================================

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_email_verified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "registration_attempts" (
    "id" SERIAL NOT NULL,
    "ip_address" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "email_verification_tokens_token_key" ON "email_verification_tokens"("token");
CREATE INDEX IF NOT EXISTS "registration_attempts_ip_address_created_at_idx" ON "registration_attempts"("ip_address", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "users_google_id_key" ON "users"("google_id") WHERE "google_id" IS NOT NULL;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'email_verification_tokens_user_id_fkey'
    ) THEN
        ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================
-- MIGRATION 3: Parent Logs & Goals
-- ============================================

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "LogStatus" AS ENUM ('pending', 'approved', 'flagged');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "GoalStatus" AS ENUM ('active', 'completed', 'paused', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "parent_logs" (
    "id" SERIAL NOT NULL,
    "parent_id" INTEGER NOT NULL,
    "child_id" INTEGER NOT NULL,
    "log_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "skills_practiced" TEXT[],
    "activities" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "behavior_notes" TEXT,
    "ai_summary" TEXT,
    "therapist_comment" TEXT,
    "status" "LogStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parent_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "goals" (
    "id" SERIAL NOT NULL,
    "child_id" INTEGER NOT NULL,
    "therapist_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "target_date" TIMESTAMP(3),
    "status" "GoalStatus" NOT NULL DEFAULT 'active',
    "progress_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "parent_logs_child_id_log_date_idx" ON "parent_logs"("child_id", "log_date");
CREATE INDEX IF NOT EXISTS "parent_logs_parent_id_log_date_idx" ON "parent_logs"("parent_id", "log_date");
CREATE INDEX IF NOT EXISTS "goals_child_id_idx" ON "goals"("child_id");
CREATE INDEX IF NOT EXISTS "goals_therapist_id_idx" ON "goals"("therapist_id");

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'parent_logs_parent_id_fkey') THEN
        ALTER TABLE "parent_logs" ADD CONSTRAINT "parent_logs_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'parent_logs_child_id_fkey') THEN
        ALTER TABLE "parent_logs" ADD CONSTRAINT "parent_logs_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'goals_child_id_fkey') THEN
        ALTER TABLE "goals" ADD CONSTRAINT "goals_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'goals_therapist_id_fkey') THEN
        ALTER TABLE "goals" ADD CONSTRAINT "goals_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================
-- MIGRATION 4: CMS Status Fields
-- ============================================

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "CMSStatus" AS ENUM ('draft', 'scheduled', 'published', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "cms_content" ADD COLUMN IF NOT EXISTS "publish_at" TIMESTAMP(3);
ALTER TABLE "cms_content" ADD COLUMN IF NOT EXISTS "status" "CMSStatus" NOT NULL DEFAULT 'draft';
ALTER TABLE "cms_content" ADD COLUMN IF NOT EXISTS "unpublish_at" TIMESTAMP(3);

-- ============================================
-- MIGRATION 5: Update Skills Practiced Format
-- ============================================

-- Check if column is already JSONB
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'parent_logs' 
        AND column_name = 'skills_practiced' 
        AND data_type != 'jsonb'
    ) THEN
        -- Add a temporary JSONB column
        ALTER TABLE "parent_logs" ADD COLUMN "skills_practiced_tmp" JSONB NOT NULL DEFAULT '[]'::jsonb;

        -- Copy existing string-array skills into the new JSON structure
        UPDATE "parent_logs"
        SET "skills_practiced_tmp" = COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'name', skill,
                        'rating', LEAST(GREATEST("parent_logs"."rating", 1), 5)
                    )
                )
                FROM unnest("parent_logs"."skills_practiced") AS skill
            ),
            '[]'::jsonb
        );

        -- Drop the old column and rename the tmp column
        ALTER TABLE "parent_logs" DROP COLUMN "skills_practiced";
        ALTER TABLE "parent_logs" RENAME COLUMN "skills_practiced_tmp" TO "skills_practiced";
    END IF;
END $$;

-- ============================================
-- MIGRATION 6: Subscriptions & AI Tokens
-- ============================================

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "SubscriptionPlan" AS ENUM ('free', 'pro', 'premium', 'therapist');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'cancelled', 'expired', 'trial');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "plan_type" "SubscriptionPlan" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'active',
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ai_token_wallets" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "plan_type" "SubscriptionPlan" NOT NULL,
    "monthly_token_limit" INTEGER NOT NULL DEFAULT 2000,
    "current_token_usage" INTEGER NOT NULL DEFAULT 0,
    "renewal_date" TIMESTAMP(3) NOT NULL,
    "last_reset_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_token_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_user_id_key" ON "subscriptions"("user_id");
CREATE INDEX IF NOT EXISTS "subscriptions_user_id_idx" ON "subscriptions"("user_id");
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions"("status");
CREATE INDEX IF NOT EXISTS "subscriptions_end_date_idx" ON "subscriptions"("end_date");
CREATE UNIQUE INDEX IF NOT EXISTS "ai_token_wallets_user_id_key" ON "ai_token_wallets"("user_id");
CREATE INDEX IF NOT EXISTS "ai_token_wallets_user_id_idx" ON "ai_token_wallets"("user_id");
CREATE INDEX IF NOT EXISTS "ai_token_wallets_renewal_date_idx" ON "ai_token_wallets"("renewal_date");

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_user_id_fkey') THEN
        ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_token_wallets_user_id_fkey') THEN
        ALTER TABLE "ai_token_wallets" ADD CONSTRAINT "ai_token_wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================
-- MIGRATION 7: Subscription Plan Configs
-- ============================================

-- CreateTable
CREATE TABLE IF NOT EXISTS "subscription_plan_configs" (
    "id" SERIAL NOT NULL,
    "plan_type" "SubscriptionPlan" NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "weeks" INTEGER NOT NULL DEFAULT 4,
    "ai_access" BOOLEAN NOT NULL DEFAULT false,
    "monthly_token_limit" INTEGER NOT NULL DEFAULT 0,
    "price" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_plan_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_plan_configs_plan_type_key" ON "subscription_plan_configs"("plan_type");

-- Insert default plans
INSERT INTO "subscription_plan_configs" (plan_type, name, description, weeks, ai_access, monthly_token_limit, price, is_active)
VALUES 
    ('free', 'Free Plan', 'Basic plan with limited features', 2, false, 0, 0, true),
    ('pro', 'Pro Plan', 'Advanced plan with AI features', 4, true, 10000, 79000, true),
    ('premium', 'Premium Plan', 'Full-featured plan with maximum benefits', 8, true, 30000, 149000, true),
    ('therapist', 'Therapist Plan', 'Special plan for therapists', 52, true, 50000, 0, true)
ON CONFLICT (plan_type) DO NOTHING;

-- ============================================
-- MIGRATION 8: Time-Based Subscriptions
-- ============================================

-- Add index on end_date for faster expiry queries
CREATE INDEX IF NOT EXISTS subscriptions_end_date_idx ON subscriptions(end_date);

-- Ensure weeks column exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscription_plan_configs' 
        AND column_name = 'weeks'
    ) THEN
        ALTER TABLE subscription_plan_configs ADD COLUMN weeks INTEGER NOT NULL DEFAULT 4;
    END IF;
END $$;

-- Set default weeks for each plan type
UPDATE subscription_plan_configs 
SET weeks = CASE 
  WHEN plan_type = 'free' THEN 2
  WHEN plan_type = 'pro' THEN 4
  WHEN plan_type = 'premium' THEN 8
  WHEN plan_type = 'therapist' THEN 52
  ELSE 4
END
WHERE weeks IS NULL OR weeks = 4;

-- Update existing subscriptions to have end_date based on plan weeks
UPDATE subscriptions s
SET end_date = s.start_date + (spc.weeks || ' weeks')::INTERVAL
FROM subscription_plan_configs spc
WHERE s.plan_type = spc.plan_type 
  AND (s.end_date IS NULL OR s.end_date < s.start_date);

-- ============================================
-- MIGRATION 9: Subscription Requests
-- ============================================

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "SubscriptionRequestStatus" AS ENUM ('pending', 'processing', 'completed', 'cancelled', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "subscription_requests" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "plan_type" "SubscriptionPlan" NOT NULL,
    "status" "SubscriptionRequestStatus" NOT NULL DEFAULT 'pending',
    "amount" INTEGER NOT NULL,
    "payment_method" VARCHAR(50),
    "payment_reference" VARCHAR(255),
    "midtrans_order_id" VARCHAR(255),
    "midtrans_token" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "subscription_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "subscription_requests_user_id_idx" ON "subscription_requests"("user_id");
CREATE INDEX IF NOT EXISTS "subscription_requests_status_idx" ON "subscription_requests"("status");
CREATE INDEX IF NOT EXISTS "subscription_requests_midtrans_order_id_idx" ON "subscription_requests"("midtrans_order_id");

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_requests_user_id_fkey') THEN
        ALTER TABLE "subscription_requests" ADD CONSTRAINT "subscription_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================
-- MIGRATION 10: Promotion Codes
-- ============================================

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "PromotionDiscountType" AS ENUM ('percentage', 'fixed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "promotion_codes" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discount_type" "PromotionDiscountType" NOT NULL DEFAULT 'percentage',
    "discount_value" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "quota" INTEGER NOT NULL DEFAULT 0,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotion_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "promotion_code_usages" (
    "id" SERIAL NOT NULL,
    "promotion_code_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "subscription_request_id" INTEGER,
    "discount_amount" INTEGER NOT NULL,
    "used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotion_code_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "promotion_codes_code_key" ON "promotion_codes"("code");
CREATE INDEX IF NOT EXISTS "promotion_codes_code_idx" ON "promotion_codes"("code");
CREATE INDEX IF NOT EXISTS "promotion_codes_start_date_end_date_idx" ON "promotion_codes"("start_date", "end_date");
CREATE INDEX IF NOT EXISTS "promotion_codes_is_active_idx" ON "promotion_codes"("is_active");
CREATE INDEX IF NOT EXISTS "promotion_code_usages_promotion_code_id_idx" ON "promotion_code_usages"("promotion_code_id");
CREATE INDEX IF NOT EXISTS "promotion_code_usages_user_id_idx" ON "promotion_code_usages"("user_id");
CREATE INDEX IF NOT EXISTS "promotion_code_usages_used_at_idx" ON "promotion_code_usages"("used_at");

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'promotion_codes_created_by_fkey') THEN
        ALTER TABLE "promotion_codes" ADD CONSTRAINT "promotion_codes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'promotion_code_usages_promotion_code_id_fkey') THEN
        ALTER TABLE "promotion_code_usages" ADD CONSTRAINT "promotion_code_usages_promotion_code_id_fkey" FOREIGN KEY ("promotion_code_id") REFERENCES "promotion_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'promotion_code_usages_user_id_fkey') THEN
        ALTER TABLE "promotion_code_usages" ADD CONSTRAINT "promotion_code_usages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AlterTable
ALTER TABLE "subscription_requests" ADD COLUMN IF NOT EXISTS "promotion_code_id" INTEGER;
ALTER TABLE "subscription_requests" ADD COLUMN IF NOT EXISTS "discount_amount" INTEGER;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "subscription_requests_promotion_code_id_idx" ON "subscription_requests"("promotion_code_id");

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_requests_promotion_code_id_fkey') THEN
        ALTER TABLE "subscription_requests" ADD CONSTRAINT "subscription_requests_promotion_code_id_fkey" FOREIGN KEY ("promotion_code_id") REFERENCES "promotion_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================
-- MIGRATION 11: Session Status
-- ============================================

ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "status" "LogStatus" NOT NULL DEFAULT 'pending';
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "parent_comment" TEXT;

-- ============================================
-- MIGRATION 12: Creator to Parent Logs
-- ============================================

-- AlterTable: Add columns as nullable first
ALTER TABLE "parent_logs" ADD COLUMN IF NOT EXISTS "creator_id" INTEGER;
ALTER TABLE "parent_logs" ADD COLUMN IF NOT EXISTS "creator_role" "Role";

-- Update existing logs to set creator_id = parent_id and creator_role = 'parent'
UPDATE "parent_logs" SET "creator_id" = "parent_id", "creator_role" = 'parent' WHERE "creator_id" IS NULL;

-- Now make them NOT NULL (only if they don't have NOT NULL constraint)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'parent_logs' 
        AND column_name = 'creator_id' 
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE "parent_logs" ALTER COLUMN "creator_id" SET NOT NULL;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'parent_logs' 
        AND column_name = 'creator_role' 
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE "parent_logs" ALTER COLUMN "creator_role" SET NOT NULL;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'parent_logs_creator_id_fkey') THEN
        ALTER TABLE "parent_logs" ADD CONSTRAINT "parent_logs_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "parent_logs_creator_id_idx" ON "parent_logs"("creator_id");

-- ============================================
-- MIGRATION 13: Additional User Fields
-- ============================================

-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_number" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referral_code" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "points" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referred_by_code" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "users_referral_code_idx" ON "users"("referral_code");
CREATE INDEX IF NOT EXISTS "users_referred_by_code_idx" ON "users"("referred_by_code");

-- CreateUniqueIndex (only if referral_code is set)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'users_referral_code_key' 
        AND tablename = 'users'
    ) THEN
        CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code") WHERE "referral_code" IS NOT NULL;
    END IF;
END $$;

-- ============================================
-- MIGRATION 14: AI Report Summaries
-- ============================================

-- CreateTable
CREATE TABLE IF NOT EXISTS "ai_report_summaries" (
    "id" SERIAL NOT NULL,
    "child_id" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,
    "recommendations" TEXT NOT NULL,
    "tokens_used" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_report_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ai_report_summaries_child_id_start_date_end_date_key" ON "ai_report_summaries"("child_id", "start_date", "end_date");
CREATE INDEX IF NOT EXISTS "ai_report_summaries_child_id_idx" ON "ai_report_summaries"("child_id");
CREATE INDEX IF NOT EXISTS "ai_report_summaries_start_date_end_date_idx" ON "ai_report_summaries"("start_date", "end_date");

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_report_summaries_child_id_fkey') THEN
        ALTER TABLE "ai_report_summaries" ADD CONSTRAINT "ai_report_summaries_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check all tables exist
SELECT 'Tables created:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check all enums exist
SELECT 'Enums created:' as info;
SELECT typname 
FROM pg_type 
WHERE typtype = 'e' 
ORDER BY typname;

-- ============================================
-- MIGRATION COMPLETE!
-- ============================================
