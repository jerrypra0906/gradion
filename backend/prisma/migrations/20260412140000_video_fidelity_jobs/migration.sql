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
