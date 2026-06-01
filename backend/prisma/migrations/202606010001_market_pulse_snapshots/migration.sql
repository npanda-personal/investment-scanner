CREATE TABLE "market_pulse_snapshots" (
    "id" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "dataThroughDate" TIMESTAMP(3) NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "region" TEXT NOT NULL DEFAULT 'IN',
    "assetType" TEXT NOT NULL DEFAULT 'STOCK',
    "timeframe" TEXT NOT NULL DEFAULT '1d',
    "status" TEXT NOT NULL,
    "marketHealthScore" DOUBLE PRECISION NOT NULL,
    "marketHealthLabel" TEXT NOT NULL,
    "indexTrendScore" DOUBLE PRECISION NOT NULL,
    "sectorStrengthScore" DOUBLE PRECISION NOT NULL,
    "breadthScore" DOUBLE PRECISION NOT NULL,
    "deliveryParticipationScore" DOUBLE PRECISION NOT NULL,
    "dataFreshnessScore" DOUBLE PRECISION NOT NULL,
    "topIndicesJson" JSONB NOT NULL DEFAULT '[]',
    "strongSectorsJson" JSONB NOT NULL DEFAULT '[]',
    "weakSectorsJson" JSONB NOT NULL DEFAULT '[]',
    "breadthSummaryJson" JSONB NOT NULL DEFAULT '{}',
    "deliverySummaryJson" JSONB NOT NULL DEFAULT '{}',
    "candidateCount" INTEGER NOT NULL DEFAULT 0,
    "warningsJson" JSONB NOT NULL DEFAULT '[]',
    "sourceSummaryJson" JSONB NOT NULL DEFAULT '{}',
    "pipelineRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_pulse_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "market_pulse_snapshots_snapshotDate_region_assetType_timeframe_key"
    ON "market_pulse_snapshots"("snapshotDate", "region", "assetType", "timeframe");

CREATE INDEX "market_pulse_snapshots_region_assetType_timeframe_snapshotDate_idx"
    ON "market_pulse_snapshots"("region", "assetType", "timeframe", "snapshotDate");

CREATE INDEX "market_pulse_snapshots_status_generatedAt_idx"
    ON "market_pulse_snapshots"("status", "generatedAt");
