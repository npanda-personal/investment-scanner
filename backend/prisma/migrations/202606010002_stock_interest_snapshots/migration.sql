CREATE TABLE IF NOT EXISTS "stock_interest_snapshots" (
    "id" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "dataThroughDate" TIMESTAMP(3),
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stockId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "sector" TEXT,
    "scopeRegion" TEXT NOT NULL DEFAULT 'IN',
    "scopeAssetType" TEXT NOT NULL DEFAULT 'STOCK',
    "timeframe" TEXT NOT NULL DEFAULT '1d',
    "category" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "direction" TEXT NOT NULL,
    "reasonTags" JSONB NOT NULL DEFAULT '[]',
    "riskTags" JSONB NOT NULL DEFAULT '[]',
    "freshness" TEXT NOT NULL,
    "warnings" JSONB NOT NULL DEFAULT '[]',
    "calculationVersion" TEXT NOT NULL DEFAULT 'stock-interest-v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_interest_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "stock_interest_snapshot_scope_category_symbol_key"
    ON "stock_interest_snapshots"("snapshotDate", "scopeRegion", "scopeAssetType", "timeframe", "category", "symbol");

CREATE INDEX IF NOT EXISTS "stock_interest_snapshot_scope_date_idx"
    ON "stock_interest_snapshots"("scopeRegion", "scopeAssetType", "timeframe", "snapshotDate");

CREATE INDEX IF NOT EXISTS "stock_interest_snapshot_scope_category_score_idx"
    ON "stock_interest_snapshots"("scopeRegion", "scopeAssetType", "category", "score");

CREATE INDEX IF NOT EXISTS "stock_interest_snapshot_stock_date_idx"
    ON "stock_interest_snapshots"("stockId", "snapshotDate");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'stock_interest_snapshots_stockId_fkey'
    ) THEN
        ALTER TABLE "stock_interest_snapshots"
            ADD CONSTRAINT "stock_interest_snapshots_stockId_fkey"
            FOREIGN KEY ("stockId") REFERENCES "stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
