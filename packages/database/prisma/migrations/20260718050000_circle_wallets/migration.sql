-- CreateEnum
CREATE TYPE "WalletProvider" AS ENUM ('CIRCLE');

-- CreateEnum
CREATE TYPE "WalletChain" AS ENUM ('BASE', 'BASE_SEPOLIA');

-- CreateEnum
CREATE TYPE "WalletStatus" AS ENUM ('CREATING', 'LIVE', 'FAILED');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'WALLET_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'CIRCLE_TRANSFER_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'CIRCLE_TRANSFER_UPDATED';

-- CreateTable
CREATE TABLE "wallets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" "WalletProvider" NOT NULL DEFAULT 'CIRCLE',
    "provider_wallet_id" VARCHAR(128) NOT NULL,
    "wallet_set_id" VARCHAR(128),
    "address" VARCHAR(128) NOT NULL,
    "chain" "WalletChain" NOT NULL,
    "currency" VARCHAR(16) NOT NULL DEFAULT 'USDC',
    "status" "WalletStatus" NOT NULL DEFAULT 'LIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallets_provider_wallet_id_key" ON "wallets"("provider_wallet_id");

-- CreateIndex
CREATE INDEX "wallets_user_id_idx" ON "wallets"("user_id");

-- CreateIndex
CREATE INDEX "wallets_address_idx" ON "wallets"("address");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_provider_chain_key" ON "wallets"("user_id", "provider", "chain");

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
