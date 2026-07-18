-- CreateSchema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "KycStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'APPROVED', 'REJECTED', 'NEEDS_REVIEW');
CREATE TYPE "WalletProvider" AS ENUM ('CIRCLE', 'INTERNAL');
CREATE TYPE "WalletStatus" AS ENUM ('ACTIVE', 'FROZEN', 'CLOSED');
CREATE TYPE "TransferStatus" AS ENUM ('DRAFT', 'AWAITING_PAYMENT', 'FUNDED', 'CONVERTING', 'ON_CHAIN', 'PAYOUT_PENDING', 'PAYOUT_SENT', 'COMPLETED', 'FAILED', 'CANCELLED', 'COMPLIANCE_HOLD');
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'FX_CONVERSION', 'FEE', 'REFUND', 'ADJUSTMENT');
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SETTLED', 'FAILED', 'REVERSED');
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'PUSH', 'IN_APP');
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');
CREATE TYPE "AuditAction" AS ENUM ('USER_REGISTERED', 'USER_LOGIN', 'USER_LOGOUT', 'TOKEN_REFRESHED', 'USER_UPDATED', 'ROLE_CHANGED', 'WALLET_CREATED', 'TRANSFER_CREATED', 'TRANSFER_STATUS_CHANGED', 'COMPLIANCE_FLAGGED', 'ADMIN_ACTION', 'SYSTEM');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(320) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "kyc_status" "KycStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "user_agent" VARCHAR(512),
    "ip_address" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "kyc_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "status" "KycStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "provider" VARCHAR(64),
    "provider_reference" VARCHAR(255),
    "document_country" CHAR(2),
    "sanctions_screened_at" TIMESTAMP(3),
    "reviewed_by_admin_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" VARCHAR(1000),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kyc_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wallets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" "WalletProvider" NOT NULL DEFAULT 'CIRCLE',
    "provider_wallet_id" VARCHAR(255),
    "address" VARCHAR(128),
    "chain" VARCHAR(32) NOT NULL DEFAULT 'BASE',
    "currency" VARCHAR(16) NOT NULL DEFAULT 'USDC',
    "status" "WalletStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bank_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "country" CHAR(2) NOT NULL,
    "currency" VARCHAR(16) NOT NULL,
    "bank_name" VARCHAR(255) NOT NULL,
    "account_name" VARCHAR(255) NOT NULL,
    "account_number" VARCHAR(64) NOT NULL,
    "bank_code" VARCHAR(32),
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "transfers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sender_id" UUID NOT NULL,
    "recipient_bank_id" UUID,
    "status" "TransferStatus" NOT NULL DEFAULT 'DRAFT',
    "source_currency" VARCHAR(16) NOT NULL,
    "source_amount" DECIMAL(18,2) NOT NULL,
    "destination_currency" VARCHAR(16) NOT NULL,
    "destination_amount" DECIMAL(18,2),
    "fx_rate" DECIMAL(18,8),
    "fee_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "fee_currency" VARCHAR(16) NOT NULL DEFAULT 'USD',
    "idempotency_key" VARCHAR(128) NOT NULL,
    "circle_transfer_id" VARCHAR(255),
    "on_chain_tx_hash" VARCHAR(128),
    "failure_reason" VARCHAR(1000),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "wallet_id" UUID,
    "transfer_id" UUID,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "currency" VARCHAR(16) NOT NULL,
    "amount" DECIMAL(18,8) NOT NULL,
    "balance_after" DECIMAL(18,8),
    "description" VARCHAR(500),
    "external_ref" VARCHAR(255),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "exchange_rates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "base_currency" VARCHAR(16) NOT NULL,
    "quote_currency" VARCHAR(16) NOT NULL,
    "rate" DECIMAL(18,8) NOT NULL,
    "source" VARCHAR(64) NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "subject" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "payload" JSONB,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "treasury_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(128) NOT NULL,
    "currency" VARCHAR(16) NOT NULL,
    "provider" VARCHAR(64) NOT NULL,
    "provider_ref" VARCHAR(255),
    "balance" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treasury_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID,
    "action" "AuditAction" NOT NULL,
    "entity_type" VARCHAR(64) NOT NULL,
    "entity_id" VARCHAR(64),
    "ip_address" VARCHAR(64),
    "user_agent" VARCHAR(512),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- Indexes & constraints
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_role_idx" ON "users"("role");
CREATE INDEX "users_kyc_status_idx" ON "users"("kyc_status");

CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

CREATE UNIQUE INDEX "kyc_profiles_user_id_key" ON "kyc_profiles"("user_id");

CREATE UNIQUE INDEX "wallets_provider_wallet_id_key" ON "wallets"("provider_wallet_id");
CREATE INDEX "wallets_provider_idx" ON "wallets"("provider");
CREATE UNIQUE INDEX "wallets_user_id_chain_currency_key" ON "wallets"("user_id", "chain", "currency");

CREATE INDEX "bank_accounts_user_id_idx" ON "bank_accounts"("user_id");

CREATE UNIQUE INDEX "transfers_idempotency_key_key" ON "transfers"("idempotency_key");
CREATE INDEX "transfers_sender_id_idx" ON "transfers"("sender_id");
CREATE INDEX "transfers_status_idx" ON "transfers"("status");
CREATE INDEX "transfers_created_at_idx" ON "transfers"("created_at");

CREATE INDEX "transactions_user_id_created_at_idx" ON "transactions"("user_id", "created_at");
CREATE INDEX "transactions_transfer_id_idx" ON "transactions"("transfer_id");
CREATE INDEX "transactions_type_status_idx" ON "transactions"("type", "status");

CREATE UNIQUE INDEX "exchange_rates_base_currency_quote_currency_valid_from_key" ON "exchange_rates"("base_currency", "quote_currency", "valid_from");
CREATE INDEX "exchange_rates_base_currency_quote_currency_idx" ON "exchange_rates"("base_currency", "quote_currency");

CREATE INDEX "notifications_user_id_status_idx" ON "notifications"("user_id", "status");

CREATE UNIQUE INDEX "treasury_accounts_name_currency_key" ON "treasury_accounts"("name", "currency");

CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kyc_profiles" ADD CONSTRAINT "kyc_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_recipient_bank_id_fkey" FOREIGN KEY ("recipient_bank_id") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "transfers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
