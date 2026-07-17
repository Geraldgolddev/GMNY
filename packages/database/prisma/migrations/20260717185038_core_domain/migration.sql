/*
  Warnings:

  - You are about to drop the column `actorId` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `baseCurrency` on the `exchange_rates` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `exchange_rates` table. All the data in the column will be lost.
  - You are about to drop the column `quoteCurrency` on the `exchange_rates` table. All the data in the column will be lost.
  - You are about to drop the column `rate` on the `exchange_rates` table. All the data in the column will be lost.
  - You are about to drop the column `channel` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `payload` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `readAt` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `sentAt` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `template` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `amountMinor` on the `onchain_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `network` on the `onchain_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `recipients` table. All the data in the column will be lost.
  - You are about to drop the column `amountMinor` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `balanceAfterMinor` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `destAmountMinor` on the `transfers` table. All the data in the column will be lost.
  - You are about to drop the column `destCurrency` on the `transfers` table. All the data in the column will be lost.
  - You are about to drop the column `feeMinor` on the `transfers` table. All the data in the column will be lost.
  - You are about to drop the column `onChainTxHash` on the `transfers` table. All the data in the column will be lost.
  - You are about to drop the column `quoteExpiresAt` on the `transfers` table. All the data in the column will be lost.
  - You are about to drop the column `quotedRate` on the `transfers` table. All the data in the column will be lost.
  - You are about to drop the column `sourceAmountMinor` on the `transfers` table. All the data in the column will be lost.
  - You are about to drop the column `sourceCurrency` on the `transfers` table. All the data in the column will be lost.
  - You are about to drop the column `network` on the `treasury_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `custodyRef` on the `wallets` table. All the data in the column will be lost.
  - You are about to drop the column `network` on the `wallets` table. All the data in the column will be lost.
  - You are about to drop the `balances` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `ngn` to the `exchange_rates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `body` to the `notifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `notifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amount` to the `onchain_transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `blockchain` to the `onchain_transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerId` to the `recipients` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amount` to the `transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amountNGN` to the `transfers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amountUSD` to the `transfers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `exchangeRate` to the `transfers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `blockchain` to the `treasury_accounts` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "WalletStatus" AS ENUM ('PENDING', 'ACTIVE', 'FROZEN', 'CLOSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'USER_STATUS_CHANGE';
ALTER TYPE "AuditAction" ADD VALUE 'RECIPIENT_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'RECIPIENT_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'RECIPIENT_DELETE';
ALTER TYPE "AuditAction" ADD VALUE 'EXCHANGE_RATE_CREATE';

-- AlterEnum
ALTER TYPE "TransferStatus" ADD VALUE 'PENDING';

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actorId_fkey";

-- DropForeignKey
ALTER TABLE "balances" DROP CONSTRAINT "balances_walletId_fkey";

-- DropForeignKey
ALTER TABLE "recipients" DROP CONSTRAINT "recipients_userId_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_transferId_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_walletId_fkey";

-- DropIndex
DROP INDEX "audit_logs_actorId_idx";

-- DropIndex
DROP INDEX "exchange_rates_baseCurrency_quoteCurrency_createdAt_idx";

-- DropIndex
DROP INDEX "notifications_status_idx";

-- DropIndex
DROP INDEX "notifications_userId_idx";

-- DropIndex
DROP INDEX "recipients_userId_idx";

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "actorId",
ADD COLUMN     "userId" UUID,
ALTER COLUMN "entityType" DROP NOT NULL;

-- AlterTable
ALTER TABLE "exchange_rates" DROP COLUMN "baseCurrency",
DROP COLUMN "createdAt",
DROP COLUMN "quoteCurrency",
DROP COLUMN "rate",
ADD COLUMN     "ngn" DECIMAL(18,6) NOT NULL,
ADD COLUMN     "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "usd" DECIMAL(18,6) NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "notifications" DROP COLUMN "channel",
DROP COLUMN "payload",
DROP COLUMN "readAt",
DROP COLUMN "sentAt",
DROP COLUMN "status",
DROP COLUMN "template",
ADD COLUMN     "body" TEXT NOT NULL,
ADD COLUMN     "read" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "title" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "onchain_transactions" DROP COLUMN "amountMinor",
DROP COLUMN "network",
ADD COLUMN     "amount" DECIMAL(24,6) NOT NULL,
ADD COLUMN     "blockchain" "BlockchainNetwork" NOT NULL;

-- AlterTable
ALTER TABLE "recipients" DROP COLUMN "userId",
ADD COLUMN     "ownerId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "amountMinor",
DROP COLUMN "balanceAfterMinor",
ADD COLUMN     "amount" DECIMAL(24,6) NOT NULL,
ALTER COLUMN "walletId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "transfers" DROP COLUMN "destAmountMinor",
DROP COLUMN "destCurrency",
DROP COLUMN "feeMinor",
DROP COLUMN "onChainTxHash",
DROP COLUMN "quoteExpiresAt",
DROP COLUMN "quotedRate",
DROP COLUMN "sourceAmountMinor",
DROP COLUMN "sourceCurrency",
ADD COLUMN     "amountNGN" DECIMAL(18,2) NOT NULL,
ADD COLUMN     "amountUSD" DECIMAL(18,2) NOT NULL,
ADD COLUMN     "blockchainTxHash" TEXT,
ADD COLUMN     "exchangeRate" DECIMAL(18,6) NOT NULL,
ADD COLUMN     "fee" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "treasury_accounts" DROP COLUMN "network",
ADD COLUMN     "blockchain" "BlockchainNetwork" NOT NULL;

-- AlterTable
ALTER TABLE "wallets" DROP COLUMN "custodyRef",
DROP COLUMN "network",
ADD COLUMN     "balance" DECIMAL(24,6) NOT NULL DEFAULT 0,
ADD COLUMN     "blockchain" "BlockchainNetwork" NOT NULL DEFAULT 'BASE_SEPOLIA',
ADD COLUMN     "circleWalletId" TEXT,
ADD COLUMN     "status" "WalletStatus" NOT NULL DEFAULT 'PENDING';

-- DropTable
DROP TABLE "balances";

-- DropEnum
DROP TYPE "NotificationChannel";

-- DropEnum
DROP TYPE "NotificationStatus";

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "occupation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_userId_key" ON "user_profiles"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "exchange_rates_timestamp_idx" ON "exchange_rates"("timestamp");

-- CreateIndex
CREATE INDEX "notifications_userId_read_idx" ON "notifications"("userId", "read");

-- CreateIndex
CREATE INDEX "recipients_ownerId_idx" ON "recipients"("ownerId");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipients" ADD CONSTRAINT "recipients_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
