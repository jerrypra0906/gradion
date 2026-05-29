-- AlterTable: Add columns as nullable first
ALTER TABLE "parent_logs" ADD COLUMN "creator_id" INTEGER;
ALTER TABLE "parent_logs" ADD COLUMN "creator_role" "Role";

-- Update existing logs to set creator_id = parent_id and creator_role = 'parent'
UPDATE "parent_logs" SET "creator_id" = "parent_id", "creator_role" = 'parent' WHERE "creator_id" IS NULL;

-- Now make them NOT NULL
ALTER TABLE "parent_logs" ALTER COLUMN "creator_id" SET NOT NULL;
ALTER TABLE "parent_logs" ALTER COLUMN "creator_role" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "parent_logs" ADD CONSTRAINT "parent_logs_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "parent_logs_creator_id_idx" ON "parent_logs"("creator_id");
