-- Per-child AI token usage ledger. The wallet stays the per-user monthly
-- aggregate; this log attributes each spend to a child and feature.
CREATE TABLE "ai_token_usage_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "child_id" INTEGER,
    "feature" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_token_usage_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_token_usage_logs_user_id_idx" ON "ai_token_usage_logs"("user_id");
CREATE INDEX "ai_token_usage_logs_child_id_idx" ON "ai_token_usage_logs"("child_id");
CREATE INDEX "ai_token_usage_logs_created_at_idx" ON "ai_token_usage_logs"("created_at");

ALTER TABLE "ai_token_usage_logs" ADD CONSTRAINT "ai_token_usage_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_token_usage_logs" ADD CONSTRAINT "ai_token_usage_logs_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill from records that already store per-child token counts.
INSERT INTO "ai_token_usage_logs" ("user_id", "child_id", "feature", "tokens", "created_at")
SELECT c."parent_id", s."child_id", 'report_summary', s."tokens_used", s."created_at"
FROM "ai_report_summaries" s
JOIN "children" c ON c."id" = s."child_id"
WHERE s."tokens_used" > 0;

INSERT INTO "ai_token_usage_logs" ("user_id", "child_id", "feature", "tokens", "created_at")
SELECT j."user_id", j."child_id", 'video_fidelity', j."tokens_used", j."created_at"
FROM "video_fidelity_jobs" j
WHERE j."tokens_used" IS NOT NULL AND j."tokens_used" > 0;
