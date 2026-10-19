-- CreateEnum
CREATE TYPE "CashCollectionMode" AS ENUM ('NEFT', 'RTGS', 'UPI', 'CASH_DEPOSIT');

-- CreateEnum
CREATE TYPE "CashCollectionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WalletReason" ADD VALUE 'CASH_COLLECTION';
ALTER TYPE "WalletReason" ADD VALUE 'CASH_COLLECTION_CHARGE';

-- AlterEnum
ALTER TYPE "WalletType" ADD VALUE 'DMT';

-- AlterTable
ALTER TABLE "BrandMdrRate" ADD COLUMN     "brandType" TEXT,
ADD COLUMN     "cardType" TEXT,
ADD COLUMN     "classification" TEXT;

-- AlterTable
ALTER TABLE "PosRentalInvoice" ADD COLUMN     "commissionAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "gstAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "totalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PosSettlementEntry" ADD COLUMN     "brandType" TEXT,
ADD COLUMN     "cardType" TEXT,
ADD COLUMN     "classification" TEXT;

-- AlterTable
ALTER TABLE "PosSubscription" ADD COLUMN     "commission" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "includeGst" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "monthlyRent" DECIMAL(14,2);

-- AlterTable
ALTER TABLE "SchemeSlab" ADD COLUMN     "chargeGstInclusive" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "commissionType" SET DEFAULT 'FLAT';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dmtBalance" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CompanyBankAccount" (
    "id" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "ifscCode" TEXT NOT NULL,
    "branch" TEXT,
    "upiId" TEXT,
    "acceptedModes" "CashCollectionMode"[],
    "chargeType" TEXT NOT NULL DEFAULT 'FLAT',
    "chargeValue" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "chargeGstInclusive" BOOLEAN NOT NULL DEFAULT false,
    "defaultTargetWallet" "WalletType" NOT NULL DEFAULT 'PRIMARY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyBankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashCollection" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "companyBankAccountId" TEXT NOT NULL,
    "mode" "CashCollectionMode" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "utr" TEXT,
    "paymentDate" TIMESTAMP(3),
    "proofDocId" TEXT,
    "slipUrl" TEXT,
    "userRemarks" TEXT,
    "approverId" TEXT,
    "status" "CashCollectionStatus" NOT NULL DEFAULT 'PENDING',
    "adminRemarks" TEXT,
    "chargeType" TEXT,
    "chargeValue" DECIMAL(14,4),
    "chargeAmount" DECIMAL(14,2),
    "netAmount" DECIMAL(14,2),
    "targetWallet" "WalletType",
    "walletTxnId" TEXT,
    "chargeTxnId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyMdrFloor" (
    "id" TEXT NOT NULL,
    "serviceKind" "MdrServiceKind" NOT NULL,
    "paymentMode" TEXT NOT NULL DEFAULT '*',
    "scopeKey" TEXT,
    "scopeLabel" TEXT,
    "minAmount" DECIMAL(14,2) NOT NULL,
    "maxAmount" DECIMAL(14,2) NOT NULL,
    "mdrType" "RateType" NOT NULL DEFAULT 'PERCENT',
    "mdrValue" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "mdrValueT0" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyMdrFloor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardBinCache" (
    "bin" TEXT NOT NULL,
    "cardNetwork" TEXT NOT NULL,
    "cardType" TEXT NOT NULL,
    "cardLevel" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "issuerBank" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardBinCache_pkey" PRIMARY KEY ("bin")
);

-- CreateIndex
CREATE INDEX "CompanyBankAccount_isActive_sortOrder_idx" ON "CompanyBankAccount"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "CashCollection_requesterId_status_idx" ON "CashCollection"("requesterId", "status");

-- CreateIndex
CREATE INDEX "CashCollection_approverId_status_idx" ON "CashCollection"("approverId", "status");

-- CreateIndex
CREATE INDEX "CashCollection_companyBankAccountId_createdAt_idx" ON "CashCollection"("companyBankAccountId", "createdAt");

-- CreateIndex
CREATE INDEX "CashCollection_status_createdAt_idx" ON "CashCollection"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CompanyMdrFloor_serviceKind_paymentMode_active_idx" ON "CompanyMdrFloor"("serviceKind", "paymentMode", "active");

-- CreateIndex
CREATE INDEX "CompanyMdrFloor_serviceKind_scopeKey_active_idx" ON "CompanyMdrFloor"("serviceKind", "scopeKey", "active");

-- AddForeignKey
ALTER TABLE "CompanyBankAccount" ADD CONSTRAINT "CompanyBankAccount_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashCollection" ADD CONSTRAINT "CashCollection_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashCollection" ADD CONSTRAINT "CashCollection_companyBankAccountId_fkey" FOREIGN KEY ("companyBankAccountId") REFERENCES "CompanyBankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashCollection" ADD CONSTRAINT "CashCollection_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrClaim" ADD CONSTRAINT "QrClaim_firstApprovedById_fkey" FOREIGN KEY ("firstApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
