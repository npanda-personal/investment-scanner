CREATE TABLE "earnings_intelligence_snapshots" (
    "id" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "dataThroughDate" TIMESTAMP(3),
    "stockId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "scopeRegion" TEXT NOT NULL,
    "scopeAssetType" TEXT NOT NULL,
    "resultDate" TIMESTAMP(3),
    "resultDateSource" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "daysToResult" INTEGER,
    "revenueGrowth" DOUBLE PRECISION,
    "profitGrowth" DOUBLE PRECISION,
    "epsGrowth" DOUBLE PRECISION,
    "marginTrend" DOUBLE PRECISION,
    "consistencyScore" DOUBLE PRECISION NOT NULL,
    "accelerationScore" DOUBLE PRECISION NOT NULL,
    "reasonTags" JSONB NOT NULL DEFAULT '[]',
    "riskTags" JSONB NOT NULL DEFAULT '[]',
    "freshness" TEXT NOT NULL,
    "categories" JSONB NOT NULL DEFAULT '[]',
    "calculationVersion" TEXT NOT NULL DEFAULT 'earnings-intelligence-v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "earnings_intelligence_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "earnings_intel_snapshot_scope_symbol_key" ON "earnings_intelligence_snapshots"("snapshotDate", "scopeRegion", "scopeAssetType", "symbol");
CREATE INDEX "earnings_intel_snapshot_scope_date_idx" ON "earnings_intelligence_snapshots"("scopeRegion", "scopeAssetType", "snapshotDate");
CREATE INDEX "earnings_intel_snapshot_result_date_idx" ON "earnings_intelligence_snapshots"("scopeRegion", "scopeAssetType", "resultDate");
CREATE INDEX "earnings_intel_snapshot_stock_date_idx" ON "earnings_intelligence_snapshots"("stockId", "snapshotDate");

ALTER TABLE "earnings_intelligence_snapshots"
  ADD CONSTRAINT "earnings_intelligence_snapshots_stockId_fkey"
  FOREIGN KEY ("stockId") REFERENCES "stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
