-- AI content admin-review workflow: parents only see AI-generated assessment
-- reports and weekly ABA programs after an admin approves them.

-- CreateEnum
CREATE TYPE "AiReviewStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable: children (initial assessment report review gate)
ALTER TABLE "children"
  ADD COLUMN "assessment_review_status" "AiReviewStatus" NOT NULL DEFAULT 'pending',
  ADD COLUMN "assessment_reviewed_at" TIMESTAMP(3),
  ADD COLUMN "assessment_reviewed_by" INTEGER;

-- AlterTable: child_aba_program_weeks (weekly program review gate)
ALTER TABLE "child_aba_program_weeks"
  ADD COLUMN "review_status" "AiReviewStatus" NOT NULL DEFAULT 'pending',
  ADD COLUMN "reviewed_at" TIMESTAMP(3),
  ADD COLUMN "reviewed_by" INTEGER;
