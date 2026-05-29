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

