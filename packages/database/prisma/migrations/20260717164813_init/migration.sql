-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'DISABLED');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'USDC', 'NGN');

-- CreateEnum
CREATE TYPE "BlockchainNetwork" AS ENUM ('BASE_MAINNET', 'BASE_SEPOLIA');

-- CreateEnum
CREATE TYPE "WalletType" AS ENUM ('USER', 'TREASURY');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('DRAFT', 'QUOTE_LOCKED', 'AWAITING_FUNDING', 'FUNDED', 'ON_CHAIN_PENDING', 'ON_CHAIN_CONFIRMED', 'PAYOUT_PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER_DEBIT', 'TRANSFER_CREDIT', 'FEE', 'REFUND', 'TREASURY_REBALANCE');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'PUSH', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'READ');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('AUTH_REGISTER', 'AUTH_LOGIN', 'AUTH_LOGOUT', 'AUTH_REFRESH', 'AUTH_PASSWORD_CHANGE', 'USER_UPDATE', 'USER_ROLE_CHANGE', 'WALLET_CREATE', 'TRANSFER_CREATE', 'TRANSFER_STATUS_CHANGE', 'KYC_STATUS_CHANGE', 'ADMIN_ACTION');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_profiles" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "KycStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "provider" TEXT,
    "providerRef" TEXT,
    "documents" JSONB,
    "riskScore" INTEGER,
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "rejectionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kyc_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_flags" (
    "id" UUID NOT NULL,
    "kycProfileId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "type" "WalletType" NOT NULL DEFAULT 'USER',
    "network" "BlockchainNetwork" NOT NULL DEFAULT 'BASE_SEPOLIA',
    "currency" "Currency" NOT NULL DEFAULT 'USDC',
    "address" TEXT,
    "custodyRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "balances" (
    "id" UUID NOT NULL,
    "walletId" UUID NOT NULL,
    "currency" "Currency" NOT NULL,
    "amountMinor" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treasury_accounts" (
    "id" UUID NOT NULL,
    "walletId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "network" "BlockchainNetwork" NOT NULL,
    "currency" "Currency" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "treasury_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipients" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'NGN',
    "country" TEXT NOT NULL DEFAULT 'NG',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" UUID NOT NULL,
    "baseCurrency" "Currency" NOT NULL,
    "quoteCurrency" "Currency" NOT NULL,
    "rate" DECIMAL(24,8) NOT NULL,
    "source" TEXT NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfers" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "senderId" UUID NOT NULL,
    "recipientId" UUID,
    "exchangeRateId" UUID,
    "status" "TransferStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceCurrency" "Currency" NOT NULL DEFAULT 'USD',
    "sourceAmountMinor" BIGINT NOT NULL,
    "destCurrency" "Currency" NOT NULL DEFAULT 'NGN',
    "destAmountMinor" BIGINT NOT NULL,
    "feeMinor" BIGINT NOT NULL DEFAULT 0,
    "quotedRate" DECIMAL(24,8) NOT NULL,
    "quoteExpiresAt" TIMESTAMP(3),
    "onChainTxHash" TEXT,
    "failureReason" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onchain_transactions" (
    "id" UUID NOT NULL,
    "transferId" UUID NOT NULL,
    "network" "BlockchainNetwork" NOT NULL,
    "txHash" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onchain_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "walletId" UUID NOT NULL,
    "transferId" UUID,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "currency" "Currency" NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "balanceAfterMinor" BIGINT NOT NULL,
    "reference" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "template" TEXT NOT NULL,
    "payload" JSONB,
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "kyc_profiles_userId_key" ON "kyc_profiles"("userId");

-- CreateIndex
CREATE INDEX "kyc_profiles_status_idx" ON "kyc_profiles"("status");

-- CreateIndex
CREATE INDEX "compliance_flags_kycProfileId_idx" ON "compliance_flags"("kycProfileId");

-- CreateIndex
CREATE INDEX "wallets_userId_idx" ON "wallets"("userId");

-- CreateIndex
CREATE INDEX "wallets_type_idx" ON "wallets"("type");

-- CreateIndex
CREATE UNIQUE INDEX "balances_walletId_currency_key" ON "balances"("walletId", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "treasury_accounts_walletId_key" ON "treasury_accounts"("walletId");

-- CreateIndex
CREATE INDEX "recipients_userId_idx" ON "recipients"("userId");

-- CreateIndex
CREATE INDEX "exchange_rates_baseCurrency_quoteCurrency_createdAt_idx" ON "exchange_rates"("baseCurrency", "quoteCurrency", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "transfers_reference_key" ON "transfers"("reference");

-- CreateIndex
CREATE INDEX "transfers_senderId_idx" ON "transfers"("senderId");

-- CreateIndex
CREATE INDEX "transfers_status_idx" ON "transfers"("status");

-- CreateIndex
CREATE INDEX "transfers_createdAt_idx" ON "transfers"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "onchain_transactions_transferId_key" ON "onchain_transactions"("transferId");

-- CreateIndex
CREATE UNIQUE INDEX "onchain_transactions_txHash_key" ON "onchain_transactions"("txHash");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_reference_key" ON "transactions"("reference");

-- CreateIndex
CREATE INDEX "transactions_walletId_idx" ON "transactions"("walletId");

-- CreateIndex
CREATE INDEX "transactions_transferId_idx" ON "transactions"("transferId");

-- CreateIndex
CREATE INDEX "transactions_type_idx" ON "transactions"("type");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_profiles" ADD CONSTRAINT "kyc_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_flags" ADD CONSTRAINT "compliance_flags_kycProfileId_fkey" FOREIGN KEY ("kycProfileId") REFERENCES "kyc_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balances" ADD CONSTRAINT "balances_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treasury_accounts" ADD CONSTRAINT "treasury_accounts_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipients" ADD CONSTRAINT "recipients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "recipients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_exchangeRateId_fkey" FOREIGN KEY ("exchangeRateId") REFERENCES "exchange_rates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onchain_transactions" ADD CONSTRAINT "onchain_transactions_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "transfers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
