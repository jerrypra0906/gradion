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

