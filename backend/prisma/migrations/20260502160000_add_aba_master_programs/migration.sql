-- CreateTable
CREATE TABLE "aba_master_programs" (
    "id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "canonical_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "rationale" TEXT,
    "targets" JSONB,
    "recommended_trials_per_day" INTEGER,
    "materials" JSONB,
    "data_collection" JSONB,
    "demo_video_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aba_master_programs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "aba_master_programs_language_idx" ON "aba_master_programs"("language");

-- CreateIndex
CREATE UNIQUE INDEX "aba_master_programs_language_canonical_key_key" ON "aba_master_programs"("language", "canonical_key");

