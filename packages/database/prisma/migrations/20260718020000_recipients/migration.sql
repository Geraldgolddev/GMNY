-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'RECIPIENT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'RECIPIENT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'RECIPIENT_DELETED';

-- CreateTable
CREATE TABLE "recipients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "label" VARCHAR(100),
    "account_name" VARCHAR(255) NOT NULL,
    "account_number" VARCHAR(20) NOT NULL,
    "bank_name" VARCHAR(255) NOT NULL,
    "bank_code" VARCHAR(20),
    "country" CHAR(2) NOT NULL DEFAULT 'NG',
    "currency" VARCHAR(16) NOT NULL DEFAULT 'NGN',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recipients_user_id_is_active_idx" ON "recipients"("user_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "recipients_user_id_account_number_bank_name_key" ON "recipients"("user_id", "account_number", "bank_name");

-- AddForeignKey
ALTER TABLE "recipients" ADD CONSTRAINT "recipients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
