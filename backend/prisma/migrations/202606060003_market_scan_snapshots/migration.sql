-- CreateTable
CREATE TABLE "market_scan_snapshots" (
    "id" TEXT NOT NULL,
    "scanType" TEXT NOT NULL,
    "scanRange" TEXT,
    "region" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "tradingDate" TIMESTAMP(3) NOT NULL,
    "rank" INTEGER NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_scan_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "market_scan_snapshot_type_range_scope_date_rank_key"
    ON "market_scan_snapshots"("scanType", "scanRange", "region", "assetType", "tradingDate", "rank");

-- CreateIndex
CREATE INDEX "market_scan_snapshot_lookup_idx"
    ON "market_scan_snapshots"("scanType", "scanRange", "region", "assetType", "tradingDate");

-- CreateIndex
CREATE INDEX "market_scan_snapshot_date_scope_idx"
    ON "market_scan_snapshots"("tradingDate", "region", "assetType");
