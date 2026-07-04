-- Soft delete for children: parent delete hides the child; admin sees it as
-- deactivated and can reactivate it.
ALTER TABLE "children"
  ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "deactivated_at" TIMESTAMP(3),
  ADD COLUMN "deactivated_by" INTEGER;
