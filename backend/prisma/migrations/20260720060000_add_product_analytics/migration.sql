-- Product analytics: page engagement, drop-off, and error capture.

CREATE TABLE "analytics_page_views" (
    "id" BIGSERIAL NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" INTEGER,
    "role" TEXT,
    -- Normalized route (numeric ids replaced with :id) so views aggregate per
    -- screen and no child/user identifier is stored in the path.
    "path" TEXT NOT NULL,
    "referrer_path" TEXT,
    "duration_ms" INTEGER NOT NULL DEFAULT 0,
    "is_exit" BOOLEAN NOT NULL DEFAULT false,
    "device" TEXT,
    "entered_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "analytics_page_views_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "analytics_page_views_entered_at_idx" ON "analytics_page_views"("entered_at");
CREATE INDEX "analytics_page_views_path_idx" ON "analytics_page_views"("path");
CREATE INDEX "analytics_page_views_session_id_idx" ON "analytics_page_views"("session_id");
CREATE INDEX "analytics_page_views_user_id_idx" ON "analytics_page_views"("user_id");

ALTER TABLE "analytics_page_views"
  ADD CONSTRAINT "analytics_page_views_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "analytics_errors" (
    "id" BIGSERIAL NOT NULL,
    "session_id" TEXT,
    "user_id" INTEGER,
    "role" TEXT,
    "path" TEXT,
    -- 'client' (JS exception) | 'api' (failed request) | 'server'
    "source" TEXT NOT NULL,
    "name" TEXT,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "status_code" INTEGER,
    -- Stable hash of source+path+name+message so repeats group together and
    -- alert emails can be throttled per distinct problem.
    "fingerprint" TEXT NOT NULL,
    "device" TEXT,
    "notified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "analytics_errors_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "analytics_errors_created_at_idx" ON "analytics_errors"("created_at");
CREATE INDEX "analytics_errors_fingerprint_idx" ON "analytics_errors"("fingerprint");
CREATE INDEX "analytics_errors_user_id_idx" ON "analytics_errors"("user_id");

ALTER TABLE "analytics_errors"
  ADD CONSTRAINT "analytics_errors_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
