-- Admin curation of the ABA master program library:
-- curated masters become AI exemplars and are protected from sync overwrites;
-- archived masters are hidden from prompts; merges are remembered via redirects.
ALTER TABLE "aba_master_programs" ADD COLUMN "is_curated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "aba_master_programs" ADD COLUMN "is_archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "aba_master_programs" ADD COLUMN "merged_into_id" TEXT;
ALTER TABLE "aba_master_programs" ADD COLUMN "usage_count" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "aba_master_programs_language_is_archived_idx" ON "aba_master_programs"("language", "is_archived");

-- Before/after snapshots of admin edits — fed to the AI as curation learning examples.
CREATE TABLE "aba_master_program_edits" (
    "id" SERIAL NOT NULL,
    "master_id" TEXT NOT NULL,
    "editor_id" INTEGER,
    "before_json" JSONB NOT NULL,
    "after_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "aba_master_program_edits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "aba_master_program_edits_master_id_idx" ON "aba_master_program_edits"("master_id");
CREATE INDEX "aba_master_program_edits_created_at_idx" ON "aba_master_program_edits"("created_at");

ALTER TABLE "aba_master_program_edits" ADD CONSTRAINT "aba_master_program_edits_master_id_fkey" FOREIGN KEY ("master_id") REFERENCES "aba_master_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "aba_master_program_edits" ADD CONSTRAINT "aba_master_program_edits_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
