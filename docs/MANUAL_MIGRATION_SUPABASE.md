# Manual Database Migration Guide for Supabase

Since Prisma CLI connection is having DNS issues, this guide will help you migrate your database schema manually using Supabase SQL Editor.

## 📋 Prerequisites

- Access to Supabase Dashboard
- SQL Editor access (you already confirmed this works)
- All migration SQL files from `backend/prisma/migrations/`

## 🎯 Step-by-Step Process

### Step 1: Access Supabase SQL Editor

1. Go to your Supabase Dashboard
2. Click on **"SQL Editor"** in the left sidebar
3. Click **"New query"** button

### Step 2: Run Migrations in Order

**IMPORTANT**: Run migrations in the exact order listed below. Each migration builds on the previous one.

---

## Migration 1: Initial Schema (20251122072718_init)

**What it does**: Creates the base tables and enums

```sql
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
```

**Click "Run"** and verify it succeeds.

---

## Migration 2: Email Verification & Google Auth (20251127114735_add_email_verification_and_google)

**What it does**: Adds email verification and Google OAuth support

```sql
-- AlterTable
ALTER TABLE "users" ADD COLUMN "google_id" TEXT,
ADD COLUMN "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
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
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id") WHERE "google_id" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

**Click "Run"** and verify it succeeds.

---

## Migration 3: Parent Logs & Goals (20251128051628_add_parent_logs_and_goals)

**What it does**: Adds parent logs and goals tables

```sql
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
```

**Click "Run"** and verify it succeeds.

---

## Migration 4: CMS Status Fields (20251128072241_add_cms_status_fields)

**What it does**: Adds publishing status to CMS content

```sql
-- CreateEnum
CREATE TYPE "CMSStatus" AS ENUM ('draft', 'scheduled', 'published', 'archived');

-- AlterTable
ALTER TABLE "cms_content" ADD COLUMN "publish_at" TIMESTAMP(3),
ADD COLUMN "status" "CMSStatus" NOT NULL DEFAULT 'draft',
ADD COLUMN "unpublish_at" TIMESTAMP(3);
```

**Click "Run"** and verify it succeeds.

---

## Migration 5: Update Skills Practiced Format (20251128082932_new_score)

**What it does**: Converts skills_practiced from text array to JSONB

```sql
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
```

**Click "Run"** and verify it succeeds.

---

## Migration 6: Subscriptions & AI Tokens (20251130124400_add_subscription_and_ai_token_models)

**What it does**: Adds subscription and AI token wallet tables

```sql
-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('free', 'pro', 'premium', 'therapist');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'cancelled', 'expired', 'trial');

-- CreateTable
CREATE TABLE "subscriptions" (
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
CREATE TABLE "ai_token_wallets" (
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
CREATE UNIQUE INDEX "subscriptions_user_id_key" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_end_date_idx" ON "subscriptions"("end_date");

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
```

**Click "Run"** and verify it succeeds.

---

## Migration 7: Subscription Plan Configs (20251130203300_add_subscription_plan_configs)

**What it does**: Creates subscription plan configuration table with default plans

```sql
-- CreateTable
CREATE TABLE "subscription_plan_configs" (
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
CREATE UNIQUE INDEX "subscription_plan_configs_plan_type_key" ON "subscription_plan_configs"("plan_type");

-- Insert default plans
INSERT INTO "subscription_plan_configs" (plan_type, name, description, weeks, ai_access, monthly_token_limit, price, is_active)
VALUES 
    ('free', 'Free Plan', 'Basic plan with limited features', 2, false, 0, 0, true),
    ('pro', 'Pro Plan', 'Advanced plan with AI features', 4, true, 10000, 79000, true),
    ('premium', 'Premium Plan', 'Full-featured plan with maximum benefits', 8, true, 30000, 149000, true),
    ('therapist', 'Therapist Plan', 'Special plan for therapists', 52, true, 50000, 0, true)
ON CONFLICT (plan_type) DO NOTHING;
```

**Click "Run"** and verify it succeeds.

---

## Migration 8: Time-Based Subscriptions (20251130205000_time_based_subscriptions)

**What it does**: Updates subscriptions to use weeks instead of monthly quotas

```sql
-- This migration removes columns that may not exist yet, so it's safe to run
-- Add index on end_date for faster expiry queries (if not exists)
CREATE INDEX IF NOT EXISTS subscriptions_end_date_idx ON subscriptions(end_date);

-- Update subscription_plan_configs: ensure weeks column exists
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
```

**Click "Run"** and verify it succeeds.

---

## Migration 9: Subscription Requests (20251201085200_add_subscription_requests)

**What it does**: Creates subscription requests table for payment processing

```sql
-- CreateEnum
CREATE TYPE "SubscriptionRequestStatus" AS ENUM ('pending', 'processing', 'completed', 'cancelled', 'failed');

-- CreateTable
CREATE TABLE "subscription_requests" (
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
CREATE INDEX "subscription_requests_user_id_idx" ON "subscription_requests"("user_id");

-- CreateIndex
CREATE INDEX "subscription_requests_status_idx" ON "subscription_requests"("status");

-- CreateIndex
CREATE INDEX "subscription_requests_midtrans_order_id_idx" ON "subscription_requests"("midtrans_order_id");

-- AddForeignKey
ALTER TABLE "subscription_requests" ADD CONSTRAINT "subscription_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

**Click "Run"** and verify it succeeds.

---

## Migration 10: Promotion Codes (20251202083000_add_promotion_codes)

**What it does**: Adds promotion code system

```sql
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
```

**Click "Run"** and verify it succeeds.

---

## Migration 11: Session Status (20251210084006_add_session_status)

**What it does**: Adds status and parent comment to sessions

```sql
-- AlterTable
ALTER TABLE "sessions" ADD COLUMN "status" "LogStatus" NOT NULL DEFAULT 'pending';
ALTER TABLE "sessions" ADD COLUMN "parent_comment" TEXT;
```

**Click "Run"** and verify it succeeds.

---

## Migration 12: Creator to Parent Logs (20250115120000_add_creator_to_parent_logs)

**What it does**: Adds creator tracking to parent logs

```sql
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
```

**Click "Run"** and verify it succeeds.

---

## Migration 13: Additional User Fields

**What it does**: Adds referral codes, points, and phone number to users

```sql
-- AlterTable
ALTER TABLE "users" ADD COLUMN "phone_number" TEXT;
ALTER TABLE "users" ADD COLUMN "referral_code" TEXT;
ALTER TABLE "users" ADD COLUMN "points" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "referred_by_code" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "users_referral_code_idx" ON "users"("referral_code");
CREATE INDEX IF NOT EXISTS "users_referred_by_code_idx" ON "users"("referred_by_code");

-- CreateUniqueIndex (only if referral_code is set)
-- Note: This will fail if there are duplicate NULL values, so we handle it differently
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
```

**Click "Run"** and verify it succeeds.

---

## Migration 14: AI Report Summaries

**What it does**: Creates AI report summaries table

```sql
-- CreateTable
CREATE TABLE "ai_report_summaries" (
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
CREATE UNIQUE INDEX "ai_report_summaries_child_id_start_date_end_date_key" ON "ai_report_summaries"("child_id", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "ai_report_summaries_child_id_idx" ON "ai_report_summaries"("child_id");

-- CreateIndex
CREATE INDEX "ai_report_summaries_start_date_end_date_idx" ON "ai_report_summaries"("start_date", "end_date");

-- AddForeignKey
ALTER TABLE "ai_report_summaries" ADD CONSTRAINT "ai_report_summaries_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

**Click "Run"** and verify it succeeds.

---

## ✅ Verification Steps

After running all migrations, verify your schema:

### 1. Check All Tables Exist

Run this query in Supabase SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Expected tables:**
- ai_report_summaries
- ai_token_wallets
- banners
- children
- cms_content
- email_verification_tokens
- goals
- parent_logs
- promotion_code_usages
- promotion_codes
- registration_attempts
- sessions
- subscription_plan_configs
- subscription_requests
- subscriptions
- therapist_children
- users

### 2. Check All Enums Exist

```sql
SELECT typname 
FROM pg_type 
WHERE typtype = 'e' 
ORDER BY typname;
```

**Expected enums:**
- BannerAudience
- CMSStatus
- GoalStatus
- LogStatus
- PromotionDiscountType
- Role
- SubscriptionPlan
- SubscriptionRequestStatus
- SubscriptionStatus

### 3. Verify Indexes

```sql
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

### 4. Check Foreign Keys

```sql
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;
```

---

## 🚨 Troubleshooting

### Error: "relation already exists"

If you get this error, the table/enum already exists. You can:
1. Skip that migration (it's already applied)
2. Or use `CREATE TABLE IF NOT EXISTS` (but migrations don't use this by default)

### Error: "column already exists"

The column was already added. You can:
1. Skip that ALTER TABLE statement
2. Or modify it to use `IF NOT EXISTS` (PostgreSQL 9.5+)

### Error: "enum already exists"

The enum was already created. Skip the CREATE TYPE statement.

### Error: "constraint already exists"

The constraint/index already exists. Skip that statement.

---

## 📝 Notes

1. **Order Matters**: Always run migrations in the order listed above
2. **One at a Time**: Run each migration separately and verify it succeeds before moving to the next
3. **Backup First**: Consider exporting your current schema before starting (if you have data)
4. **Test After**: After all migrations, test your application to ensure everything works

---

## 🎯 Next Steps

After completing all migrations:

1. ✅ Verify all tables and enums exist (use verification queries above)
2. ✅ Update Prisma to sync with database (once connection is fixed):
   ```bash
   npx prisma db pull
   ```
3. ✅ Seed initial data (optional):
   ```bash
   npm run prisma:seed
   ```
4. ✅ Test your application

---

*Last updated: January 2025*
