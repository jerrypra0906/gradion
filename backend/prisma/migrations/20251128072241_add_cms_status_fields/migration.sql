-- CreateEnum
CREATE TYPE "CMSStatus" AS ENUM ('draft', 'scheduled', 'published', 'archived');

-- AlterTable
ALTER TABLE "cms_content" ADD COLUMN     "publish_at" TIMESTAMP(3),
ADD COLUMN     "status" "CMSStatus" NOT NULL DEFAULT 'draft',
ADD COLUMN     "unpublish_at" TIMESTAMP(3);
