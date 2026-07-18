-- AlterTable
ALTER TABLE "transfers" ADD COLUMN "chain" "WalletChain",
ADD COLUMN "tx_hash" VARCHAR(128),
ADD COLUMN "usdc_amount" DECIMAL(18,6);

-- CreateIndex
CREATE INDEX "transfers_tx_hash_idx" ON "transfers"("tx_hash");
