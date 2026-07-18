-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pair" VARCHAR(16) NOT NULL,
    "base_currency" VARCHAR(8) NOT NULL,
    "quote_currency" VARCHAR(8) NOT NULL,
    "rate" DECIMAL(18,6) NOT NULL,
    "source" VARCHAR(64) NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_pair_key" ON "exchange_rates"("pair");

-- CreateIndex
CREATE INDEX "exchange_rates_fetched_at_idx" ON "exchange_rates"("fetched_at");
