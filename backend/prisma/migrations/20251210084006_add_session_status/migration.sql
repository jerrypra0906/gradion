-- AlterTable
ALTER TABLE "sessions" ADD COLUMN "status" "LogStatus" NOT NULL DEFAULT 'pending';
ALTER TABLE "sessions" ADD COLUMN "parent_comment" TEXT;

