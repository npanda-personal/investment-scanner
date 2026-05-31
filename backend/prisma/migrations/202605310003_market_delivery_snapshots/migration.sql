CREATE TABLE "market_delivery_snapshots" (
    "id" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "exchange" TEXT NOT NULL DEFAULT 'NSE',
    "tradingDate" TIMESTAMP(3) NOT NULL,
    "tradedQuantity" BIGINT,
    "deliverableQuantity" BIGINT,
    "deliveryPercent" DECIMAL(10,4),
    "source" TEXT NOT NULL,
    "sourceFileImportId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_delivery_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "market_delivery_snapshots_stockId_exchange_tradingDate_source_key"
    ON "market_delivery_snapshots"("stockId", "exchange", "tradingDate", "source");

CREATE INDEX "market_delivery_snapshots_symbol_tradingDate_idx"
    ON "market_delivery_snapshots"("symbol", "tradingDate");

CREATE INDEX "market_delivery_snapshots_tradingDate_exchange_idx"
    ON "market_delivery_snapshots"("tradingDate", "exchange");

CREATE INDEX "market_delivery_snapshots_sourceFileImportId_idx"
    ON "market_delivery_snapshots"("sourceFileImportId");

ALTER TABLE "market_delivery_snapshots"
    ADD CONSTRAINT "market_delivery_snapshots_stockId_fkey"
    FOREIGN KEY ("stockId") REFERENCES "stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "market_delivery_snapshots"
    ADD CONSTRAINT "market_delivery_snapshots_sourceFileImportId_fkey"
    FOREIGN KEY ("sourceFileImportId") REFERENCES "source_file_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
