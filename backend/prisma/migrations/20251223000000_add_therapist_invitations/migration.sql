-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('pending', 'accepted', 'expired');

-- CreateTable
CREATE TABLE "therapist_invitations" (
    "id" SERIAL NOT NULL,
    "therapist_email" TEXT NOT NULL,
    "child_id" INTEGER NOT NULL,
    "invited_by_id" INTEGER NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linked_at" TIMESTAMP(3),

    CONSTRAINT "therapist_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "therapist_invitations_therapist_email_child_id_key" ON "therapist_invitations"("therapist_email", "child_id");

-- CreateIndex
CREATE INDEX "therapist_invitations_therapist_email_idx" ON "therapist_invitations"("therapist_email");

-- CreateIndex
CREATE INDEX "therapist_invitations_child_id_idx" ON "therapist_invitations"("child_id");

-- CreateIndex
CREATE INDEX "therapist_invitations_status_idx" ON "therapist_invitations"("status");

-- AddForeignKey
ALTER TABLE "therapist_invitations" ADD CONSTRAINT "therapist_invitations_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapist_invitations" ADD CONSTRAINT "therapist_invitations_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
