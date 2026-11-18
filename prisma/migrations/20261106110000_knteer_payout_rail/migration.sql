-- Migration: 20261106110000_knteer_payout_rail
-- Adds Knteer (Bank Transfer) payout rail support.
-- Safe to run on a live database — all new columns have defaults or are nullable.

-- 1. Add KNTEER_PAYOUT to ServiceCode enum
DO $$ BEGIN
  ALTER TYPE "ServiceCode" ADD VALUE IF NOT EXISTS 'KNTEER_PAYOUT';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add rail, knteerBeneficiaryId, and gstRate to PayoutRequest
ALTER TABLE "PayoutRequest"
  ADD COLUMN IF NOT EXISTS "rail" TEXT NOT NULL DEFAULT 'SETTLEMENT',
  ADD COLUMN IF NOT EXISTS "knteerBeneficiaryId" TEXT,
  ADD COLUMN IF NOT EXISTS "gstRate" INTEGER NOT NULL DEFAULT 0;

-- 3. Create knteer_beneficiaries table
CREATE TABLE IF NOT EXISTS "knteer_beneficiaries" (
  "id"                 TEXT NOT NULL,
  "userId"             TEXT NOT NULL,
  "accountNumber"      TEXT NOT NULL,
  "accountLast4"       TEXT NOT NULL,
  "ifscCode"           TEXT NOT NULL,
  "accountHolderName"  TEXT NOT NULL,
  "bankName"           TEXT NOT NULL,
  "mobile"             TEXT NOT NULL,
  "referenceId"        TEXT,
  "registrationType"   TEXT NOT NULL DEFAULT 'register',
  "verificationCharge" DECIMAL(8,2) NOT NULL DEFAULT 0,
  "isRegistered"       BOOLEAN NOT NULL DEFAULT true,
  "isBankVerified"     BOOLEAN NOT NULL DEFAULT false,
  "email"              TEXT,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "knteer_beneficiaries_pkey" PRIMARY KEY ("id")
);

-- 4. FK: knteer_beneficiaries.userId → User
DO $$ BEGIN
  ALTER TABLE "knteer_beneficiaries"
    ADD CONSTRAINT "knteer_beneficiaries_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. FK: PayoutRequest.knteerBeneficiaryId → knteer_beneficiaries
DO $$ BEGIN
  ALTER TABLE "PayoutRequest"
    ADD CONSTRAINT "PayoutRequest_knteerBeneficiaryId_fkey"
    FOREIGN KEY ("knteerBeneficiaryId") REFERENCES "knteer_beneficiaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6. Unique constraint on (userId, accountLast4, ifscCode)
DO $$ BEGIN
  ALTER TABLE "knteer_beneficiaries"
    ADD CONSTRAINT "knteer_beneficiaries_userId_accountLast4_ifscCode_key"
    UNIQUE ("userId", "accountLast4", "ifscCode");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 7. Indexes for cooldown query and userId lookup
CREATE INDEX IF NOT EXISTS "knteer_beneficiaries_userId_idx"
  ON "knteer_beneficiaries"("userId");

CREATE INDEX IF NOT EXISTS "knteer_beneficiaries_ifscCode_idx"
  ON "knteer_beneficiaries"("ifscCode");

CREATE INDEX IF NOT EXISTS "PayoutRequest_userId_rail_accountLast4_status_createdAt_idx"
  ON "PayoutRequest"("userId", "rail", "accountLast4", "status", "createdAt");
