-- Gradion production DB migration bundle
-- Generated from backend/prisma/migrations/*/migration.sql

-- ============================================================
-- Migration: 20251122072718_init
-- Source: d:/Claude/Gradion/backend/prisma/migrations/20251122072718_init/migration.sql
-- ============================================================
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'therapist', 'parent');

-- CreateEnum
CREATE TYPE "BannerAudience" AS ENUM ('parents', 'therapists', 'all');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
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

-- CreateIndex
CREATE UNIQUE INDEX "therapist_children_therapist_id_child_id_key" ON "therapist_children"("therapist_id", "child_id");

-- CreateIndex
CREATE UNIQUE INDEX "cms_content_slug_key" ON "cms_content"("slug");

-- AddForeignKey
ALTER TABLE "children" ADD CONSTRAINT "children_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapist_children" ADD CONSTRAINT "therapist_children_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapist_children" ADD CONSTRAINT "therapist_children_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_content" ADD CONSTRAINT "cms_content_banner_id_fkey" FOREIGN KEY ("banner_id") REFERENCES "banners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- Migration: 20251127114735_add_email_verification_and_google
-- Source: d:/Claude/Gradion/backend/prisma/migrations/20251127114735_add_email_verification_and_google/migration.sql
-- ============================================================
/*
  Warnings:

  - A unique constraint covering the columns `[google_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "google_id" TEXT,
ADD COLUMN     "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "password_hash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_attempts" (
    "id" SERIAL NOT NULL,
    "ip_address" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_token_key" ON "email_verification_tokens"("token");

-- CreateIndex
CREATE INDEX "registration_attempts_ip_address_created_at_idx" ON "registration_attempts"("ip_address", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Migration: 20251128051628_add_parent_logs_and_goals
-- Source: d:/Claude/Gradion/backend/prisma/migrations/20251128051628_add_parent_logs_and_goals/migration.sql
-- ============================================================
-- CreateEnum
CREATE TYPE "LogStatus" AS ENUM ('pending', 'approved', 'flagged');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('active', 'completed', 'paused', 'cancelled');

-- CreateTable
CREATE TABLE "parent_logs" (
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
CREATE TABLE "goals" (
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
CREATE INDEX "parent_logs_child_id_log_date_idx" ON "parent_logs"("child_id", "log_date");

-- CreateIndex
CREATE INDEX "parent_logs_parent_id_log_date_idx" ON "parent_logs"("parent_id", "log_date");

-- CreateIndex
CREATE INDEX "goals_child_id_idx" ON "goals"("child_id");

-- CreateIndex
CREATE INDEX "goals_therapist_id_idx" ON "goals"("therapist_id");

-- AddForeignKey
ALTER TABLE "parent_logs" ADD CONSTRAINT "parent_logs_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_logs" ADD CONSTRAINT "parent_logs_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Migration: 20251128051629_add_creator_to_parent_logs
-- Source: d:/Claude/Gradion/backend/prisma/migrations/20251128051629_add_creator_to_parent_logs/migration.sql
-- ============================================================
-- AlterTable: Add columns as nullable first
ALTER TABLE "parent_logs" ADD COLUMN "creator_id" INTEGER;
ALTER TABLE "parent_logs" ADD COLUMN "creator_role" "Role";

-- Update existing logs to set creator_id = parent_id and creator_role = 'parent'
UPDATE "parent_logs" SET "creator_id" = "parent_id", "creator_role" = 'parent' WHERE "creator_id" IS NULL;

-- Now make them NOT NULL
ALTER TABLE "parent_logs" ALTER COLUMN "creator_id" SET NOT NULL;
ALTER TABLE "parent_logs" ALTER COLUMN "creator_role" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "parent_logs" ADD CONSTRAINT "parent_logs_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "parent_logs_creator_id_idx" ON "parent_logs"("creator_id");

-- ============================================================
-- Migration: 20251128072241_add_cms_status_fields
-- Source: d:/Claude/Gradion/backend/prisma/migrations/20251128072241_add_cms_status_fields/migration.sql
-- ============================================================
-- CreateEnum
CREATE TYPE "CMSStatus" AS ENUM ('draft', 'scheduled', 'published', 'archived');

-- AlterTable
ALTER TABLE "cms_content" ADD COLUMN     "publish_at" TIMESTAMP(3),
ADD COLUMN     "status" "CMSStatus" NOT NULL DEFAULT 'draft',
ADD COLUMN     "unpublish_at" TIMESTAMP(3);

-- ============================================================
-- Migration: 20251128082932_new_score
-- Source: d:/Claude/Gradion/backend/prisma/migrations/20251128082932_new_score/migration.sql
-- ============================================================
-- Add a temporary JSONB column with a default empty array
ALTER TABLE "parent_logs"
    ADD COLUMN "skills_practiced_tmp" JSONB NOT NULL DEFAULT '[]'::jsonb;

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
ALTER TABLE "parent_logs"
    DROP COLUMN "skills_practiced";

ALTER TABLE "parent_logs"
    RENAME COLUMN "skills_practiced_tmp" TO "skills_practiced";

-- ============================================================
-- Migration: 20251130124400_add_subscription_and_ai_token_models
-- Source: d:/Claude/Gradion/backend/prisma/migrations/20251130124400_add_subscription_and_ai_token_models/migration.sql
-- ============================================================
-- CreateEnum
CREATE TYPE "subscription_plan" AS ENUM ('free', 'pro', 'premium', 'therapist');

-- CreateEnum
CREATE TYPE "subscription_status" AS ENUM ('active', 'cancelled', 'expired', 'trial');

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "plan_type" "subscription_plan" NOT NULL,
    "status" "subscription_status" NOT NULL DEFAULT 'active',
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3),
    "monthly_log_quota" INTEGER NOT NULL DEFAULT 30,
    "used_logs_this_month" INTEGER NOT NULL DEFAULT 0,
    "last_reset_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_token_wallets" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "plan_type" "subscription_plan" NOT NULL,
    "monthly_token_limit" INTEGER NOT NULL DEFAULT 2000,
    "current_token_usage" INTEGER NOT NULL DEFAULT 0,
    "renewal_date" TIMESTAMP(3) NOT NULL,
    "last_reset_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_token_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_user_id_key" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ai_token_wallets_user_id_key" ON "ai_token_wallets"("user_id");

-- CreateIndex
CREATE INDEX "ai_token_wallets_user_id_idx" ON "ai_token_wallets"("user_id");

-- CreateIndex
CREATE INDEX "ai_token_wallets_renewal_date_idx" ON "ai_token_wallets"("renewal_date");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_token_wallets" ADD CONSTRAINT "ai_token_wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Migration: 20251130203300_add_subscription_plan_configs
-- Source: d:/Claude/Gradion/backend/prisma/migrations/20251130203300_add_subscription_plan_configs/migration.sql
-- ============================================================
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

-- ============================================================
-- Migration: 20251130205000_time_based_subscriptions
-- Source: d:/Claude/Gradion/backend/prisma/migrations/20251130205000_time_based_subscriptions/migration.sql
-- ============================================================
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

-- ============================================================
-- Migration: 20251201085200_add_subscription_requests
-- Source: d:/Claude/Gradion/backend/prisma/migrations/20251201085200_add_subscription_requests/migration.sql
-- ============================================================
-- CreateEnum
CREATE TYPE "SubscriptionRequestStatus" AS ENUM ('pending', 'processing', 'completed', 'cancelled', 'failed');

-- CreateTable
CREATE TABLE "subscription_requests" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "plan_type" "subscription_plan" NOT NULL,
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
CREATE INDEX "subscription_requests_user_id_idx" ON "subscription_requests"("user_id");

-- CreateIndex
CREATE INDEX "subscription_requests_status_idx" ON "subscription_requests"("status");

-- CreateIndex
CREATE INDEX "subscription_requests_midtrans_order_id_idx" ON "subscription_requests"("midtrans_order_id");

-- AddForeignKey
ALTER TABLE "subscription_requests" ADD CONSTRAINT "subscription_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Migration: 20251202083000_add_promotion_codes
-- Source: d:/Claude/Gradion/backend/prisma/migrations/20251202083000_add_promotion_codes/migration.sql
-- ============================================================
-- CreateEnum
CREATE TYPE "PromotionDiscountType" AS ENUM ('percentage', 'fixed');

-- CreateTable
CREATE TABLE "promotion_codes" (
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
CREATE TABLE "promotion_code_usages" (
    "id" SERIAL NOT NULL,
    "promotion_code_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "subscription_request_id" INTEGER,
    "discount_amount" INTEGER NOT NULL,
    "used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotion_code_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "promotion_codes_code_key" ON "promotion_codes"("code");

-- CreateIndex
CREATE INDEX "promotion_codes_code_idx" ON "promotion_codes"("code");

-- CreateIndex
CREATE INDEX "promotion_codes_start_date_end_date_idx" ON "promotion_codes"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "promotion_codes_is_active_idx" ON "promotion_codes"("is_active");

-- CreateIndex
CREATE INDEX "promotion_code_usages_promotion_code_id_idx" ON "promotion_code_usages"("promotion_code_id");

-- CreateIndex
CREATE INDEX "promotion_code_usages_user_id_idx" ON "promotion_code_usages"("user_id");

-- CreateIndex
CREATE INDEX "promotion_code_usages_used_at_idx" ON "promotion_code_usages"("used_at");

-- AddForeignKey
ALTER TABLE "promotion_codes" ADD CONSTRAINT "promotion_codes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_code_usages" ADD CONSTRAINT "promotion_code_usages_promotion_code_id_fkey" FOREIGN KEY ("promotion_code_id") REFERENCES "promotion_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_code_usages" ADD CONSTRAINT "promotion_code_usages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "subscription_requests" ADD COLUMN "promotion_code_id" INTEGER,
ADD COLUMN "discount_amount" INTEGER;

-- CreateIndex
CREATE INDEX "subscription_requests_promotion_code_id_idx" ON "subscription_requests"("promotion_code_id");

-- AddForeignKey
ALTER TABLE "subscription_requests" ADD CONSTRAINT "subscription_requests_promotion_code_id_fkey" FOREIGN KEY ("promotion_code_id") REFERENCES "promotion_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- Migration: 20251210084006_add_session_status
-- Source: d:/Claude/Gradion/backend/prisma/migrations/20251210084006_add_session_status/migration.sql
-- ============================================================
-- AlterTable
ALTER TABLE "sessions" ADD COLUMN "status" "LogStatus" NOT NULL DEFAULT 'pending';
ALTER TABLE "sessions" ADD COLUMN "parent_comment" TEXT;

-- ============================================================
-- Migration: 20251221000000_add_password_reset_tokens
-- Source: d:/Claude/Gradion/backend/prisma/migrations/20251221000000_add_password_reset_tokens/migration.sql
-- ============================================================
-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Migration: 20251223000000_add_therapist_invitations
-- Source: d:/Claude/Gradion/backend/prisma/migrations/20251223000000_add_therapist_invitations/migration.sql
-- ============================================================
-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('pending', 'accepted', 'expired');

-- CreateTable
CREATE TABLE "therapist_invitations" (
    "id" SERIAL NOT NULL,
    "therapist_email" TEXT NOT NULL,
    "child_id" INTEGER NOT NULL,
    "invited_by_id" INTEGER NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linked_at" TIMESTAMP(3),

    CONSTRAINT "therapist_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "therapist_invitations_therapist_email_child_id_key" ON "therapist_invitations"("therapist_email", "child_id");

-- CreateIndex
CREATE INDEX "therapist_invitations_therapist_email_idx" ON "therapist_invitations"("therapist_email");

-- CreateIndex
CREATE INDEX "therapist_invitations_child_id_idx" ON "therapist_invitations"("child_id");

-- CreateIndex
CREATE INDEX "therapist_invitations_status_idx" ON "therapist_invitations"("status");

-- AddForeignKey
ALTER TABLE "therapist_invitations" ADD CONSTRAINT "therapist_invitations_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapist_invitations" ADD CONSTRAINT "therapist_invitations_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Migration: 20260412120000_add_consultant_role
-- Source: d:/Claude/Gradion/backend/prisma/migrations/20260412120000_add_consultant_role/migration.sql
-- ============================================================
-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'consultant';

-- ============================================================
-- Migration: 20260412140000_video_fidelity_jobs
-- Source: d:/Claude/Gradion/backend/prisma/migrations/20260412140000_video_fidelity_jobs/migration.sql
-- ============================================================
-- CreateEnum
CREATE TYPE "VideoFidelityStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateTable
CREATE TABLE "video_fidelity_jobs" (
    "id" SERIAL NOT NULL,
    "child_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "goal_id" INTEGER,
    "storage_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "abc_context" TEXT,
    "status" "VideoFidelityStatus" NOT NULL DEFAULT 'pending',
    "result_json" JSONB,
    "error_message" TEXT,
    "tokens_used" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_fidelity_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "video_fidelity_jobs_child_id_idx" ON "video_fidelity_jobs"("child_id");

-- CreateIndex
CREATE INDEX "video_fidelity_jobs_user_id_idx" ON "video_fidelity_jobs"("user_id");

-- CreateIndex
CREATE INDEX "video_fidelity_jobs_status_idx" ON "video_fidelity_jobs"("status");

-- AddForeignKey
ALTER TABLE "video_fidelity_jobs" ADD CONSTRAINT "video_fidelity_jobs_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_fidelity_jobs" ADD CONSTRAINT "video_fidelity_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_fidelity_jobs" ADD CONSTRAINT "video_fidelity_jobs_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- Migration: 20260417150000_add_user_profile_referral_fields
-- Source: d:/Claude/Gradion/backend/prisma/migrations/20260417150000_add_user_profile_referral_fields/migration.sql
-- ============================================================
-- Add missing user profile / referral fields that exist in Prisma schema
-- but were not included in earlier migrations.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "phone_number" TEXT,
  ADD COLUMN IF NOT EXISTS "referral_code" TEXT,
  ADD COLUMN IF NOT EXISTS "points" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "referred_by_code" TEXT;

-- Match Prisma schema constraints/indexes
CREATE UNIQUE INDEX IF NOT EXISTS "users_referral_code_key" ON "users"("referral_code");
CREATE INDEX IF NOT EXISTS "users_referral_code_idx" ON "users"("referral_code");
CREATE INDEX IF NOT EXISTS "users_referred_by_code_idx" ON "users"("referred_by_code");

-- ============================================================
-- Migration: 20260417152000_add_ai_report_summaries
-- Source: d:/Claude/Gradion/backend/prisma/migrations/20260417152000_add_ai_report_summaries/migration.sql
-- ============================================================
-- Add AI report summaries table (used by /reports endpoints)

CREATE TABLE IF NOT EXISTS "ai_report_summaries" (
  "id" SERIAL NOT NULL,
  "child_id" INTEGER NOT NULL,
  "start_date" TIMESTAMP(3) NOT NULL,
  "end_date" TIMESTAMP(3) NOT NULL,
  "summary" TEXT NOT NULL,
  "recommendations" TEXT NOT NULL,
  "tokens_used" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_report_summaries_pkey" PRIMARY KEY ("id")
);

-- Unique per child + range
CREATE UNIQUE INDEX IF NOT EXISTS "ai_report_summaries_child_id_start_date_end_date_key"
  ON "ai_report_summaries" ("child_id", "start_date", "end_date");

CREATE INDEX IF NOT EXISTS "ai_report_summaries_child_id_idx"
  ON "ai_report_summaries" ("child_id");

CREATE INDEX IF NOT EXISTS "ai_report_summaries_start_date_end_date_idx"
  ON "ai_report_summaries" ("start_date", "end_date");

ALTER TABLE "ai_report_summaries"
  ADD CONSTRAINT "ai_report_summaries_child_id_fkey"
  FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Migration: 20260417160000_add_child_initial_observation
-- Source: d:/Claude/Gradion/backend/prisma/migrations/20260417160000_add_child_initial_observation/migration.sql
-- ============================================================
-- Store Initial Observation Checklist results on child

ALTER TABLE "children"
  ADD COLUMN IF NOT EXISTS "initial_observation" JSONB;

CREATE INDEX IF NOT EXISTS "children_initial_observation_idx"
  ON "children" USING GIN ("initial_observation");

-- ============================================================
-- Migration: 20260417163000_add_child_initial_assessment_report
-- Source: d:/Claude/Gradion/backend/prisma/migrations/20260417163000_add_child_initial_assessment_report/migration.sql
-- ============================================================
-- Store Claude-generated Initial Assessment report on child

ALTER TABLE "children"
  ADD COLUMN IF NOT EXISTS "initial_assessment_report" TEXT;

-- ============================================================
-- Migration: 20260421120000_add_parent_log_duration_hours
-- Source: d:/Claude/Gradion/backend/prisma/migrations/20260421120000_add_parent_log_duration_hours/migration.sql
-- ============================================================
-- AlterTable
ALTER TABLE "parent_logs" ADD COLUMN "duration_hours" DOUBLE PRECISION NOT NULL DEFAULT 3;

-- ============================================================
-- Migration: 20260424130500_add_child_intake_notes
-- Source: d:/Claude/Gradion/backend/prisma/migrations/20260424130500_add_child_intake_notes/migration.sql
-- ============================================================
-- Add parent-provided intake notes during child creation

ALTER TABLE "children"
  ADD COLUMN IF NOT EXISTS "behaviors" TEXT,
  ADD COLUMN IF NOT EXISTS "concerns" TEXT,
  ADD COLUMN IF NOT EXISTS "environment" TEXT;

-- ============================================================
-- Migration: 20260424133000_add_child_initial_assessment_report_id
-- Source: d:/Claude/Gradion/backend/prisma/migrations/20260424133000_add_child_initial_assessment_report_id/migration.sql
-- ============================================================
-- Cache Indonesian initial assessment report separately

ALTER TABLE "children"
  ADD COLUMN IF NOT EXISTS "initial_assessment_report_id" TEXT;

-- ============================================================
-- Migration: 20260424150000_add_learning_module_progress
-- Source: d:/Claude/Gradion/backend/prisma/migrations/20260424150000_add_learning_module_progress/migration.sql
-- ============================================================
CREATE TABLE IF NOT EXISTS "learning_module_progress" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "module_key" TEXT NOT NULL,
  "video_completed" BOOLEAN NOT NULL DEFAULT false,
  "quiz_passed" BOOLEAN NOT NULL DEFAULT false,
  "quiz_answers" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "learning_module_progress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "learning_module_progress_user_id_module_key_key"
  ON "learning_module_progress" ("user_id", "module_key");

CREATE INDEX IF NOT EXISTS "learning_module_progress_user_id_idx"
  ON "learning_module_progress" ("user_id");

ALTER TABLE "learning_module_progress"
  ADD CONSTRAINT "learning_module_progress_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Migration: 20260501180000_add_child_aba_program
-- Source: d:/Claude/Gradion/backend/prisma/migrations/20260501180000_add_child_aba_program/migration.sql
-- ============================================================
-- CreateEnum
CREATE TYPE "AbaProgramWeekStatus" AS ENUM ('draft', 'active', 'completed');

-- CreateEnum
CREATE TYPE "AbaProgramSessionMode" AS ENUM ('guided', 'upload');

-- CreateEnum
CREATE TYPE "AbaProgramSessionStatus" AS ENUM ('in_progress', 'completed', 'cancelled');

-- CreateTable
CREATE TABLE "child_aba_program_weeks" (
    "id" SERIAL NOT NULL,
    "child_id" INTEGER NOT NULL,
    "week_start" DATE NOT NULL,
    "status" "AbaProgramWeekStatus" NOT NULL DEFAULT 'draft',
    "plan_json" JSONB NOT NULL,
    "therapy_notes_json" JSONB,
    "mainstream_goal_met" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "child_aba_program_weeks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "child_aba_program_sessions" (
    "id" SERIAL NOT NULL,
    "week_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "mode" "AbaProgramSessionMode" NOT NULL,
    "status" "AbaProgramSessionStatus" NOT NULL DEFAULT 'in_progress',
    "upload_image_url" TEXT,
    "upload_mime" TEXT,
    "ocr_parsed_json" JSONB,
    "guided_results_json" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "child_aba_program_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "child_aba_program_weeks_child_id_week_start_key" ON "child_aba_program_weeks"("child_id", "week_start");

-- CreateIndex
CREATE INDEX "child_aba_program_weeks_child_id_idx" ON "child_aba_program_weeks"("child_id");

-- CreateIndex
CREATE INDEX "child_aba_program_sessions_week_id_idx" ON "child_aba_program_sessions"("week_id");

-- CreateIndex
CREATE INDEX "child_aba_program_sessions_user_id_idx" ON "child_aba_program_sessions"("user_id");

-- AddForeignKey
ALTER TABLE "child_aba_program_weeks" ADD CONSTRAINT "child_aba_program_weeks_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_aba_program_sessions" ADD CONSTRAINT "child_aba_program_sessions_week_id_fkey" FOREIGN KEY ("week_id") REFERENCES "child_aba_program_weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_aba_program_sessions" ADD CONSTRAINT "child_aba_program_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Migration: 20260502160000_add_aba_master_programs
-- Source: d:/Claude/Gradion/backend/prisma/migrations/20260502160000_add_aba_master_programs/migration.sql
-- ============================================================
-- CreateTable
CREATE TABLE "aba_master_programs" (
    "id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "canonical_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "rationale" TEXT,
    "targets" JSONB,
    "recommended_trials_per_day" INTEGER,
    "materials" JSONB,
    "data_collection" JSONB,
    "demo_video_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aba_master_programs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "aba_master_programs_language_idx" ON "aba_master_programs"("language");

-- CreateIndex
CREATE UNIQUE INDEX "aba_master_programs_language_canonical_key_key" ON "aba_master_programs"("language", "canonical_key");

-- ============================================================
-- Migration: 20260621120000_add_aba_autism_cases_learning
-- Source: d:/Claude/Gradion/backend/prisma/migrations/20260621120000_add_aba_autism_cases_learning/migration.sql
-- ============================================================
-- Master autism cases (observation + initial programs) and per-child learning insights.

CREATE TABLE IF NOT EXISTS "aba_autism_cases" (
  "id" TEXT NOT NULL,
  "case_number" INTEGER,
  "observation_text" TEXT NOT NULL,
  "observation_json" JSONB,
  "initial_programs" JSONB NOT NULL,
  "plan_snapshot_json" JSONB,
  "source" TEXT NOT NULL,
  "child_id" INTEGER,
  "language" TEXT NOT NULL DEFAULT 'id',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "aba_autism_cases_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "aba_autism_cases_source_idx" ON "aba_autism_cases"("source");
CREATE INDEX IF NOT EXISTS "aba_autism_cases_child_id_idx" ON "aba_autism_cases"("child_id");
CREATE INDEX IF NOT EXISTS "aba_autism_cases_language_idx" ON "aba_autism_cases"("language");

DO $$ BEGIN
  ALTER TABLE "aba_autism_cases"
    ADD CONSTRAINT "aba_autism_cases_child_id_fkey"
    FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "aba_program_learning_insights" (
  "id" SERIAL NOT NULL,
  "child_id" INTEGER NOT NULL,
  "week_id" INTEGER,
  "insight_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "aba_program_learning_insights_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "aba_program_learning_insights_child_id_idx" ON "aba_program_learning_insights"("child_id");
CREATE INDEX IF NOT EXISTS "aba_program_learning_insights_week_id_idx" ON "aba_program_learning_insights"("week_id");

DO $$ BEGIN
  ALTER TABLE "aba_program_learning_insights"
    ADD CONSTRAINT "aba_program_learning_insights_child_id_fkey"
    FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "aba_program_learning_insights"
    ADD CONSTRAINT "aba_program_learning_insights_week_id_fkey"
    FOREIGN KEY ("week_id") REFERENCES "child_aba_program_weeks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- Migration: 20260623143000_add_initial_observation_and_learning_modules
-- Source: d:/Claude/Gradion/backend/prisma/migrations/20260623143000_add_initial_observation_and_learning_modules/migration.sql
-- ============================================================
-- Tables were added to schema.prisma but never migrated (caused backend crash on startup).

CREATE TABLE IF NOT EXISTS "initial_observation_templates" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "template_json" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "initial_observation_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "initial_observation_templates_key_key"
  ON "initial_observation_templates"("key");

CREATE INDEX IF NOT EXISTS "initial_observation_templates_is_active_idx"
  ON "initial_observation_templates"("is_active");

CREATE TABLE IF NOT EXISTS "learning_modules" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "required_plans" "subscription_plan"[] DEFAULT ARRAY[]::"subscription_plan"[],
    "prerequisites" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "youtube_url" TEXT,
    "content_json" JSONB NOT NULL,
    "quiz_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_modules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "learning_modules_key_key"
  ON "learning_modules"("key");

CREATE INDEX IF NOT EXISTS "learning_modules_order_idx"
  ON "learning_modules"("order");

CREATE INDEX IF NOT EXISTS "learning_modules_is_active_idx"
  ON "learning_modules"("is_active");

-- ============================================================
-- Migration: 20260624030000_add_ai_review_status
-- Source: d:/Claude/Gradion/backend/prisma/migrations/20260624030000_add_ai_review_status/migration.sql
-- ============================================================
-- AI content admin-review workflow: parents only see AI-generated assessment
-- reports and weekly ABA programs after an admin approves them.

-- CreateEnum
CREATE TYPE "AiReviewStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable: children (initial assessment report review gate)
ALTER TABLE "children"
  ADD COLUMN "assessment_review_status" "AiReviewStatus" NOT NULL DEFAULT 'pending',
  ADD COLUMN "assessment_reviewed_at" TIMESTAMP(3),
  ADD COLUMN "assessment_reviewed_by" INTEGER;

-- AlterTable: child_aba_program_weeks (weekly program review gate)
ALTER TABLE "child_aba_program_weeks"
  ADD COLUMN "review_status" "AiReviewStatus" NOT NULL DEFAULT 'pending',
  ADD COLUMN "reviewed_at" TIMESTAMP(3),
  ADD COLUMN "reviewed_by" INTEGER;

-- ============================================================
-- Migration: 20260702120000_add_parent_log_aba_session_id
-- Source: d:/Claude/Gradion/backend/prisma/migrations/20260702120000_add_parent_log_aba_session_id/migration.sql
-- ============================================================
-- Link auto-created activity logs back to completed ABA sessions (idempotent sync).
ALTER TABLE "parent_logs" ADD COLUMN IF NOT EXISTS "aba_session_id" INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS "parent_logs_aba_session_id_key" ON "parent_logs"("aba_session_id");

ALTER TABLE "parent_logs"
  ADD CONSTRAINT "parent_logs_aba_session_id_fkey"
  FOREIGN KEY ("aba_session_id") REFERENCES "child_aba_program_sessions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

