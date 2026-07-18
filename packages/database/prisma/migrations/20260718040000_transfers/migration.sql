-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'TRANSFER_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'TRANSFER_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'TRANSFER_FAILED';

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "TransferDirection" AS ENUM ('USD_TO_NGN', 'NGN_TO_USD');
CREATE TYPE "TransactionType" AS ENUM ('TRANSFER', 'FEE', 'FX_CONVERSION');
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SETTLED', 'FAILED');

-- CreateTable
CREATE TABLE "transfers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "direction" "TransferDirection" NOT NULL DEFAULT 'USD_TO_NGN',
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "source_currency" VARCHAR(8) NOT NULL,
    "source_amount" DECIMAL(18,2) NOT NULL,
    "dest_currency" VARCHAR(8) NOT NULL,
    "dest_amount" DECIMAL(18,2) NOT NULL,
    "fx_rate" DECIMAL(18,6) NOT NULL,
    "fee_amount" DECIMAL(18,2) NOT NULL,
    "fee_currency" VARCHAR(8) NOT NULL DEFAULT 'USD',
    "fx_source" VARCHAR(64) NOT NULL,
    "idempotency_key" VARCHAR(128) NOT NULL,
    "settlement_ref" VARCHAR(128),
    "settlement_provider" VARCHAR(32) NOT NULL DEFAULT 'INTERNAL',
    "note" VARCHAR(500),
    "failure_reason" VARCHAR(1000),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "transfer_id" UUID,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "currency" VARCHAR(8) NOT NULL,
    "amount" DECIMAL(18,8) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "transfers_idempotency_key_key" ON "transfers"("idempotency_key");
CREATE INDEX "transfers_user_id_created_at_idx" ON "transfers"("user_id", "created_at");
CREATE INDEX "transfers_status_idx" ON "transfers"("status");
CREATE INDEX "transfers_recipient_id_idx" ON "transfers"("recipient_id");

CREATE INDEX "transactions_user_id_created_at_idx" ON "transactions"("user_id", "created_at");
CREATE INDEX "transactions_transfer_id_idx" ON "transactions"("transfer_id");
CREATE INDEX "transactions_type_status_idx" ON "transactions"("type", "status");

ALTER TABLE "transfers" ADD CONSTRAINT "transfers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "recipients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "transfers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
