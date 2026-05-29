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

