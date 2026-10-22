-- Practice videos per program per practice run, with AI fidelity analysis and
-- admin review. Video files are deleted after retention; these rows stay.
CREATE TYPE "ProgramVideoSource" AS ENUM ('recording', 'upload');
CREATE TYPE "ProgramVideoStatus" AS ENUM ('awaiting_upload', 'uploaded', 'queued', 'analyzing', 'analyzed', 'manual_review');

ALTER TABLE "users" ADD COLUMN "video_consent_at" TIMESTAMP(3);

CREATE TABLE "aba_program_videos" (
    "id" SERIAL NOT NULL,
    "child_id" INTEGER NOT NULL,
    "week_id" INTEGER NOT NULL,
    "session_id" INTEGER NOT NULL,
    "program_id" TEXT NOT NULL,
    "activity_id" TEXT,
    "program_name" TEXT NOT NULL,
    "uploader_id" INTEGER NOT NULL,
    "source" "ProgramVideoSource" NOT NULL,
    "storage_backend" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "duration_seconds" INTEGER,
    "recording_started_at" TIMESTAMP(3),
    "status" "ProgramVideoStatus" NOT NULL DEFAULT 'awaiting_upload',
    "ai_report_json" JSONB,
    "ai_score" INTEGER,
    "ai_model" TEXT,
    "ai_tokens_used" INTEGER,
    "ai_error" TEXT,
    "analyzed_at" TIMESTAMP(3),
    "review_status" "AiReviewStatus" NOT NULL DEFAULT 'pending',
    "final_report_json" JSONB,
    "final_score" INTEGER,
    "feedback_text" TEXT,
    "rejection_reason" TEXT,
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "video_deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "aba_program_videos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "aba_program_videos_session_id_program_id_key" ON "aba_program_videos"("session_id", "program_id");
CREATE INDEX "aba_program_videos_child_id_idx" ON "aba_program_videos"("child_id");
CREATE INDEX "aba_program_videos_status_idx" ON "aba_program_videos"("status");
CREATE INDEX "aba_program_videos_review_status_idx" ON "aba_program_videos"("review_status");
CREATE INDEX "aba_program_videos_program_id_idx" ON "aba_program_videos"("program_id");

ALTER TABLE "aba_program_videos" ADD CONSTRAINT "aba_program_videos_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "aba_program_videos" ADD CONSTRAINT "aba_program_videos_week_id_fkey" FOREIGN KEY ("week_id") REFERENCES "child_aba_program_weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "aba_program_videos" ADD CONSTRAINT "aba_program_videos_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "child_aba_program_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "aba_program_videos" ADD CONSTRAINT "aba_program_videos_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "aba_program_video_review_edits" (
    "id" SERIAL NOT NULL,
    "video_id" INTEGER NOT NULL,
    "program_id" TEXT NOT NULL,
    "program_name" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "editor_id" INTEGER,
    "decision" "AiReviewStatus" NOT NULL,
    "ai_json" JSONB NOT NULL,
    "admin_json" JSONB NOT NULL,
    "score_delta" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "aba_program_video_review_edits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "aba_program_video_review_edits_program_id_idx" ON "aba_program_video_review_edits"("program_id");
CREATE INDEX "aba_program_video_review_edits_created_at_idx" ON "aba_program_video_review_edits"("created_at");

ALTER TABLE "aba_program_video_review_edits" ADD CONSTRAINT "aba_program_video_review_edits_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "aba_program_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "aba_program_video_review_edits" ADD CONSTRAINT "aba_program_video_review_edits_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
