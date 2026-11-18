-- ============================================================
-- Migration: User Kit System
-- Adds KitType, KitStatus enums, UserKit table, and
-- KIT_PURCHASE WalletReason value.
--
-- Flow: SD/MD/DT buys kits (pre-minted userCodes) → reserves one
-- per invite → child registers → admin approves KYC → userCode
-- written to User.userCode. Unused/expired kits enter a cooling
-- period before becoming reusable.
-- ============================================================

-- 1. Add KIT_PURCHASE to the WalletReason enum
ALTER TYPE "WalletReason" ADD VALUE IF NOT EXISTS 'KIT_PURCHASE';

-- 2. Create KitType enum
DO $$ BEGIN
  CREATE TYPE "KitType" AS ENUM ('MD_KIT', 'DT_KIT', 'RT_KIT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Create KitStatus enum
DO $$ BEGIN
  CREATE TYPE "KitStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'ASSIGNED', 'ACTIVE', 'COOLING');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 4. Create UserKit table
CREATE TABLE IF NOT EXISTS "UserKit" (
  "id"             TEXT         NOT NULL,
  "kitType"        "KitType"    NOT NULL,
  "userCode"       TEXT         NOT NULL,
  "ownerId"        TEXT         NOT NULL,
  "inviteId"       TEXT,
  "activatedForId" TEXT,
  "status"         "KitStatus"  NOT NULL DEFAULT 'AVAILABLE',
  "purchaseAmount" DECIMAL(14,2) NOT NULL,
  "walletTxnId"    TEXT,
  "purchasedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reservedAt"     TIMESTAMP(3),
  "registeredAt"   TIMESTAMP(3),
  "activatedAt"    TIMESTAMP(3),
  "coolingStartAt" TIMESTAMP(3),
  "coolingEndsAt"  TIMESTAMP(3),
  "reviewedById"   TEXT,
  "reviewedAt"     TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserKit_pkey" PRIMARY KEY ("id")
);

-- 5. Unique constraints
ALTER TABLE "UserKit"
  ADD CONSTRAINT "UserKit_userCode_key" UNIQUE ("userCode"),
  ADD CONSTRAINT "UserKit_inviteId_key" UNIQUE ("inviteId"),
  ADD CONSTRAINT "UserKit_activatedForId_key" UNIQUE ("activatedForId");

-- 6. Indexes
CREATE INDEX IF NOT EXISTS "UserKit_ownerId_status_idx"      ON "UserKit"("ownerId", "status");
CREATE INDEX IF NOT EXISTS "UserKit_kitType_status_idx"      ON "UserKit"("kitType", "status");
CREATE INDEX IF NOT EXISTS "UserKit_inviteId_idx"            ON "UserKit"("inviteId");
CREATE INDEX IF NOT EXISTS "UserKit_status_coolingEndsAt_idx" ON "UserKit"("status", "coolingEndsAt");

-- 7. Foreign keys
ALTER TABLE "UserKit"
  ADD CONSTRAINT "UserKit_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "UserKit_inviteId_fkey"
    FOREIGN KEY ("inviteId") REFERENCES "Invite"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "UserKit_activatedForId_fkey"
    FOREIGN KEY ("activatedForId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
