-- Migration: add_user_code_commission_txn
-- Adds User.userCode (nullable unique) and PosRentalInvoice.commissionTxnId (nullable unique)
-- Both are nullable so no data-loss risk on existing rows.

-- User.userCode
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "userCode" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_userCode_key" ON "User"("userCode");

-- PosRentalInvoice.commissionTxnId
ALTER TABLE "PosRentalInvoice" ADD COLUMN IF NOT EXISTS "commissionTxnId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "PosRentalInvoice_commissionTxnId_key" ON "PosRentalInvoice"("commissionTxnId");
