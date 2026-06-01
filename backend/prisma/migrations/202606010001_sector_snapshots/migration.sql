CREATE TABLE "sector_snapshots" (
  "id" TEXT NOT NULL,
  "snapshotDate" TIMESTAMP(3) NOT NULL,
  "dataThroughDate" TIMESTAMP(3) NOT NULL,
  "scopeRegion" TEXT NOT NULL DEFAULT 'IN',
  "scopeAssetType" TEXT NOT NULL DEFAULT 'STOCK',
  "sector" TEXT NOT NULL,
  "classification" TEXT NOT NULL,
  "sectorScore" INTEGER NOT NULL,
  "return1W" DOUBLE PRECISION,
  "return1M" DOUBLE PRECISION,
  "return3M" DOUBLE PRECISION,
  "trendScore" INTEGER NOT NULL,
  "reasonTags" JSONB NOT NULL DEFAULT '[]',
  "warnings" JSONB NOT NULL DEFAULT '[]',
  "source" TEXT NOT NULL DEFAULT 'sector-intelligence',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "sector_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sector_snapshots_snapshotDate_scopeRegion_scopeAssetType_sector_key"
  ON "sector_snapshots"("snapshotDate", "scopeRegion", "scopeAssetType", "sector");

CREATE INDEX "sector_snapshots_scopeRegion_scopeAssetType_snapshotDate_idx"
  ON "sector_snapshots"("scopeRegion", "scopeAssetType", "snapshotDate");

CREATE INDEX "sector_snapshots_scopeRegion_scopeAssetType_dataThroughDate_idx"
  ON "sector_snapshots"("scopeRegion", "scopeAssetType", "dataThroughDate");

CREATE INDEX "sector_snapshots_classification_sectorScore_idx"
  ON "sector_snapshots"("classification", "sectorScore");
