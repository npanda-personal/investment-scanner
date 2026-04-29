CREATE TABLE IF NOT EXISTS "market_context_snapshots" (
  "id" TEXT NOT NULL,
  "snapshotDate" TIMESTAMP(3) NOT NULL,
  "regime" TEXT NOT NULL,
  "regimeScore" DOUBLE PRECISION NOT NULL,
  "breadthPercentAboveSma50" DOUBLE PRECISION,
  "breadthPercentAboveSma200" DOUBLE PRECISION,
  "advanceDeclineRatio" DOUBLE PRECISION,
  "newHighCount" INTEGER,
  "newLowCount" INTEGER,
  "macroStatus" TEXT,
  "explanation" TEXT,
  "source" TEXT NOT NULL,
  "dataStatus" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "market_context_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "sector_context_snapshots" (
  "id" TEXT NOT NULL,
  "snapshotDate" TIMESTAMP(3) NOT NULL,
  "sector" TEXT NOT NULL,
  "oneMonthReturn" DOUBLE PRECISION,
  "threeMonthReturn" DOUBLE PRECISION,
  "sixMonthReturn" DOUBLE PRECISION,
  "relativeStrengthScore" DOUBLE PRECISION NOT NULL,
  "instrumentCount" INTEGER NOT NULL,
  "bullishSignalCount" INTEGER,
  "bearishSignalCount" INTEGER,
  "leadershipStatus" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "dataStatus" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sector_context_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "country_context_snapshots" (
  "id" TEXT NOT NULL,
  "snapshotDate" TIMESTAMP(3) NOT NULL,
  "country" TEXT NOT NULL,
  "oneMonthReturn" DOUBLE PRECISION,
  "threeMonthReturn" DOUBLE PRECISION,
  "sixMonthReturn" DOUBLE PRECISION,
  "relativeStrengthScore" DOUBLE PRECISION NOT NULL,
  "bullishSignalCount" INTEGER,
  "bearishSignalCount" INTEGER,
  "source" TEXT NOT NULL,
  "dataStatus" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "country_context_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "smart_money_context_snapshots" (
  "id" TEXT NOT NULL,
  "snapshotDate" TIMESTAMP(3) NOT NULL,
  "instrumentId" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "sector" TEXT,
  "smartMoneyScore" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL,
  "confidence" TEXT NOT NULL,
  "accumulationSignalCount" INTEGER NOT NULL,
  "distributionSignalCount" INTEGER NOT NULL,
  "unusualVolumeDetected" BOOLEAN NOT NULL,
  "explanation" TEXT,
  "source" TEXT NOT NULL,
  "dataStatus" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "smart_money_context_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "data_quality_snapshots" (
  "id" TEXT NOT NULL,
  "snapshotDate" TIMESTAMP(3) NOT NULL,
  "instrumentId" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "priceHistoryDays" INTEGER NOT NULL,
  "hasLatestPrice" BOOLEAN NOT NULL,
  "hasFundamentals" BOOLEAN NOT NULL,
  "hasSector" BOOLEAN NOT NULL,
  "hasIndustry" BOOLEAN NOT NULL,
  "dataStatus" TEXT NOT NULL,
  "signalReadinessScore" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "data_quality_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "market_context_snapshots_snapshotDate_key" ON "market_context_snapshots"("snapshotDate");
CREATE UNIQUE INDEX IF NOT EXISTS "sector_context_snapshots_snapshotDate_sector_key" ON "sector_context_snapshots"("snapshotDate", "sector");
CREATE UNIQUE INDEX IF NOT EXISTS "country_context_snapshots_snapshotDate_country_key" ON "country_context_snapshots"("snapshotDate", "country");
CREATE UNIQUE INDEX IF NOT EXISTS "smart_money_context_snapshots_snapshotDate_instrumentId_key" ON "smart_money_context_snapshots"("snapshotDate", "instrumentId");
CREATE UNIQUE INDEX IF NOT EXISTS "data_quality_snapshots_snapshotDate_instrumentId_key" ON "data_quality_snapshots"("snapshotDate", "instrumentId");

CREATE INDEX IF NOT EXISTS "market_context_snapshots_snapshotDate_idx" ON "market_context_snapshots"("snapshotDate");
CREATE INDEX IF NOT EXISTS "sector_context_snapshots_snapshotDate_idx" ON "sector_context_snapshots"("snapshotDate");
CREATE INDEX IF NOT EXISTS "sector_context_snapshots_sector_idx" ON "sector_context_snapshots"("sector");
CREATE INDEX IF NOT EXISTS "country_context_snapshots_snapshotDate_idx" ON "country_context_snapshots"("snapshotDate");
CREATE INDEX IF NOT EXISTS "country_context_snapshots_country_idx" ON "country_context_snapshots"("country");
CREATE INDEX IF NOT EXISTS "smart_money_context_snapshots_snapshotDate_idx" ON "smart_money_context_snapshots"("snapshotDate");
CREATE INDEX IF NOT EXISTS "smart_money_context_snapshots_instrumentId_idx" ON "smart_money_context_snapshots"("instrumentId");
CREATE INDEX IF NOT EXISTS "smart_money_context_snapshots_sector_idx" ON "smart_money_context_snapshots"("sector");
CREATE INDEX IF NOT EXISTS "data_quality_snapshots_snapshotDate_idx" ON "data_quality_snapshots"("snapshotDate");
CREATE INDEX IF NOT EXISTS "data_quality_snapshots_instrumentId_idx" ON "data_quality_snapshots"("instrumentId");
