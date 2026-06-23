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
