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
