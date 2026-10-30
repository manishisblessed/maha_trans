-- ============================================================
-- Phase A — White-label tenant isolation
-- Adds platformOwnerId + isTenantOwner to User and
-- platformOwnerId to Invite so every user / invite is scoped
-- to its white-label tenant. NULL = native TRANSPE user.
-- ============================================================

-- AlterTable: User — tenant fields
ALTER TABLE "User"
  ADD COLUMN "platformOwnerId" TEXT,
  ADD COLUMN "isTenantOwner"   BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Invite — carry tenant id through onboarding
ALTER TABLE "Invite"
  ADD COLUMN "platformOwnerId" TEXT;

-- Index to list all members of a tenant fast
CREATE INDEX "User_platformOwnerId_idx" ON "User"("platformOwnerId");

-- Index to filter invites by tenant
CREATE INDEX "Invite_platformOwnerId_idx" ON "Invite"("platformOwnerId");

-- AddForeignKey: User.platformOwnerId → User.id
ALTER TABLE "User"
  ADD CONSTRAINT "User_platformOwnerId_fkey"
  FOREIGN KEY ("platformOwnerId")
  REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
