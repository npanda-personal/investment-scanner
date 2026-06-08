-- CreateTable
CREATE TABLE "crypto_assets" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT 'GLOBAL',
    "exchange" TEXT DEFAULT 'CRYPTO',
    "currency" TEXT DEFAULT 'USD',
    "marketCap" DECIMAL(65,30),
    "rank" INTEGER,
    "assetType" TEXT DEFAULT 'CRYPTO',
    "instrumentSegment" TEXT DEFAULT 'CRYPTO',
    "displaySymbol" TEXT,
    "providerSymbol" TEXT,
    "sourceSymbol" TEXT,
    "catalogSource" TEXT,
    "providerSupportStatus" TEXT,
    "providerError" TEXT,
    "isDelisted" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'database',
    "dataStatus" TEXT NOT NULL DEFAULT 'PARTIAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSuccessfulDataLoadTimestamp" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crypto_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crypto_price_ticks" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "region" TEXT DEFAULT 'GLOBAL',
    "exchange" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "open" DECIMAL(65,30) NOT NULL,
    "high" DECIMAL(65,30) NOT NULL,
    "low" DECIMAL(65,30) NOT NULL,
    "close" DECIMAL(65,30) NOT NULL,
    "adjustedClose" DECIMAL(65,30),
    "volume" BIGINT,
    "quoteVolume" DECIMAL(65,30),
    "source" TEXT,
    "ingestionTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedTimestamp" TIMESTAMP(3) NOT NULL,
    "dataStatus" TEXT NOT NULL DEFAULT 'COMPLETE',

    CONSTRAINT "crypto_price_ticks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crypto_latest_prices" (
    "symbol" TEXT NOT NULL,
    "region" TEXT DEFAULT 'GLOBAL',
    "price" DECIMAL(65,30) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crypto_latest_prices_pkey" PRIMARY KEY ("symbol")
);

-- CreateTable
CREATE TABLE "crypto_signal_generation_runs" (
    "id" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "rulesetVersion" TEXT NOT NULL,
    "sourceDataDate" TIMESTAMP(3),
    "generatedDate" TIMESTAMP(3) NOT NULL,
    "batchSize" INTEGER NOT NULL,
    "offset" INTEGER NOT NULL,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "generatedCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "noOpCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateOrIdempotentCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "excludedByDataQuality" INTEGER NOT NULL DEFAULT 0,
    "missingQualityEvaluationCount" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "warnings" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crypto_signal_generation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crypto_signal_results" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "generationRunId" TEXT,
    "symbol" TEXT NOT NULL,
    "companyName" TEXT,
    "sector" TEXT,
    "country" TEXT,
    "score" DOUBLE PRECISION NOT NULL,
    "direction" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "triggeredSignals" JSONB NOT NULL,
    "negativeSignals" JSONB NOT NULL,
    "explanation" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedDate" TIMESTAMP(3),
    "modelVersion" TEXT NOT NULL DEFAULT 'signal-engine-v1',
    "rulesetVersion" TEXT,
    "sourceDataDate" TIMESTAMP(3),
    "sourcePriceDate" TIMESTAMP(3),
    "scoringInputSummary" JSONB,
    "dataQualityEligibilitySnapshot" JSONB,
    "source" TEXT NOT NULL DEFAULT 'signal-generation-engine',
    "dataStatus" TEXT NOT NULL DEFAULT 'PARTIAL',
    "reliabilityTier" TEXT,
    "lifecycleState" TEXT,
    "priorScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crypto_signal_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crypto_signal_outcomes" (
    "id" TEXT NOT NULL,
    "signalResultId" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "sector" TEXT,
    "country" TEXT,
    "modelVersion" TEXT NOT NULL,
    "signalGeneratedDate" TIMESTAMP(3) NOT NULL,
    "horizon" TEXT NOT NULL,
    "dataComplete" BOOLEAN NOT NULL DEFAULT false,
    "priceAtSignal" DOUBLE PRECISION,
    "futurePrice" DOUBLE PRECISION,
    "windowEndDate" TIMESTAMP(3),
    "forwardReturnPercent" DOUBLE PRECISION,
    "maxFavorableExcursion" DOUBLE PRECISION,
    "maxAdverseExcursion" DOUBLE PRECISION,
    "maxDrawdownPercent" DOUBLE PRECISION,
    "benchmarkReturnPercent" DOUBLE PRECISION,
    "alphaPercent" DOUBLE PRECISION,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crypto_signal_outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crypto_signal_calibration_results" (
    "id" TEXT NOT NULL,
    "signalResultId" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "companyName" TEXT,
    "sector" TEXT,
    "country" TEXT,
    "rawScore" DOUBLE PRECISION NOT NULL,
    "calibratedScore" DOUBLE PRECISION NOT NULL,
    "scoreDelta" DOUBLE PRECISION NOT NULL,
    "rawDirection" TEXT NOT NULL,
    "calibratedDirection" TEXT NOT NULL,
    "rawConfidence" TEXT NOT NULL,
    "calibratedConfidence" TEXT NOT NULL,
    "boosts" JSONB NOT NULL,
    "penalties" JSONB NOT NULL,
    "calibrationReasons" JSONB NOT NULL,
    "dataGaps" JSONB NOT NULL,
    "calibrationModelVersion" TEXT NOT NULL,
    "rawSignalModelVersion" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crypto_signal_calibration_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crypto_quality_evaluations" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "companyName" TEXT,
    "sector" TEXT,
    "industry" TEXT,
    "country" TEXT,
    "currency" TEXT,
    "coverageScore" DOUBLE PRECISION NOT NULL,
    "coverageStatus" TEXT NOT NULL,
    "signalReadinessScore" DOUBLE PRECISION NOT NULL,
    "signalReadinessStatus" TEXT NOT NULL,
    "liquidityScore" DOUBLE PRECISION NOT NULL,
    "liquidityStatus" TEXT NOT NULL,
    "eligibleForSignals" BOOLEAN NOT NULL,
    "eligibleForBacktesting" BOOLEAN NOT NULL,
    "eligibleForCalibration" BOOLEAN NOT NULL,
    "dataGaps" JSONB NOT NULL,
    "warnings" JSONB NOT NULL,
    "readinessReasons" JSONB NOT NULL,
    "readinessBlockers" JSONB NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crypto_quality_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crypto_interest_snapshots" (
    "id" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "dataThroughDate" TIMESTAMP(3),
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "instrumentId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "scopeRegion" TEXT NOT NULL DEFAULT 'GLOBAL',
    "scopeAssetType" TEXT NOT NULL DEFAULT 'CRYPTO',
    "timeframe" TEXT NOT NULL DEFAULT '1d',
    "category" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "direction" TEXT NOT NULL,
    "reasonTags" JSONB NOT NULL DEFAULT '[]',
    "riskTags" JSONB NOT NULL DEFAULT '[]',
    "freshness" TEXT NOT NULL,
    "warnings" JSONB NOT NULL DEFAULT '[]',
    "calculationVersion" TEXT NOT NULL DEFAULT 'crypto-interest-v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crypto_interest_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crypto_market_scan_snapshots" (
    "id" TEXT NOT NULL,
    "scanType" TEXT NOT NULL,
    "scanRange" TEXT,
    "region" TEXT NOT NULL DEFAULT 'GLOBAL',
    "assetType" TEXT NOT NULL DEFAULT 'CRYPTO',
    "tradingDate" TIMESTAMP(3) NOT NULL,
    "rank" INTEGER NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crypto_market_scan_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "crypto_assets_symbol_key" ON "crypto_assets"("symbol");

-- CreateIndex
CREATE INDEX "crypto_assets_region_assetType_symbol_idx" ON "crypto_assets"("region", "assetType", "symbol");

-- CreateIndex
CREATE INDEX "crypto_assets_rank_idx" ON "crypto_assets"("rank");

-- CreateIndex
CREATE INDEX "crypto_assets_support_active_delisted_idx" ON "crypto_assets"("providerSupportStatus", "isActive", "isDelisted");

-- CreateIndex
CREATE INDEX "crypto_price_ticks_symbol_timestamp_idx" ON "crypto_price_ticks"("symbol", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "crypto_price_ticks_symbol_timestamp_key" ON "crypto_price_ticks"("symbol", "timestamp");

-- CreateIndex
CREATE INDEX "crypto_signal_gen_runs_scope_model_date_idx" ON "crypto_signal_generation_runs"("region", "assetType", "modelVersion", "generatedDate");

-- CreateIndex
CREATE INDEX "crypto_signal_gen_runs_status_started_idx" ON "crypto_signal_generation_runs"("status", "startedAt");

-- CreateIndex
CREATE INDEX "crypto_signal_results_run_idx" ON "crypto_signal_results"("generationRunId");

-- CreateIndex
CREATE INDEX "crypto_signal_results_model_srcdate_idx" ON "crypto_signal_results"("modelVersion", "sourceDataDate");

-- CreateIndex
CREATE INDEX "crypto_signal_results_instrument_genat_idx" ON "crypto_signal_results"("instrumentId", "generatedAt");

-- CreateIndex
CREATE INDEX "crypto_signal_results_direction_score_idx" ON "crypto_signal_results"("direction", "score");

-- CreateIndex
CREATE INDEX "crypto_signal_results_lifecycle_idx" ON "crypto_signal_results"("lifecycleState");

-- CreateIndex
CREATE UNIQUE INDEX "crypto_signal_results_instrumentId_modelVersion_generatedDa_key" ON "crypto_signal_results"("instrumentId", "modelVersion", "generatedDate");

-- CreateIndex
CREATE INDEX "crypto_signal_outcomes_instrument_idx" ON "crypto_signal_outcomes"("instrumentId", "horizon", "signalGeneratedDate");

-- CreateIndex
CREATE INDEX "crypto_signal_outcomes_model_idx" ON "crypto_signal_outcomes"("modelVersion", "horizon", "signalGeneratedDate");

-- CreateIndex
CREATE INDEX "crypto_signal_outcomes_complete_idx" ON "crypto_signal_outcomes"("dataComplete", "horizon", "evaluatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "crypto_signal_outcomes_signalResultId_horizon_key" ON "crypto_signal_outcomes"("signalResultId", "horizon");

-- CreateIndex
CREATE INDEX "crypto_calibration_instrument_idx" ON "crypto_signal_calibration_results"("instrumentId", "generatedAt");

-- CreateIndex
CREATE INDEX "crypto_calibration_direction_score_idx" ON "crypto_signal_calibration_results"("calibratedDirection", "calibratedScore");

-- CreateIndex
CREATE UNIQUE INDEX "crypto_signal_calibration_results_signalResultId_calibratio_key" ON "crypto_signal_calibration_results"("signalResultId", "calibrationModelVersion");

-- CreateIndex
CREATE UNIQUE INDEX "crypto_quality_evaluations_instrumentId_key" ON "crypto_quality_evaluations"("instrumentId");

-- CreateIndex
CREATE INDEX "crypto_dq_coverage_idx" ON "crypto_quality_evaluations"("coverageStatus");

-- CreateIndex
CREATE INDEX "crypto_dq_readiness_idx" ON "crypto_quality_evaluations"("signalReadinessStatus");

-- CreateIndex
CREATE INDEX "crypto_dq_evaluatedat_idx" ON "crypto_quality_evaluations"("evaluatedAt");

-- CreateIndex
CREATE INDEX "crypto_interest_snapshot_scope_date_idx" ON "crypto_interest_snapshots"("scopeRegion", "scopeAssetType", "timeframe", "snapshotDate");

-- CreateIndex
CREATE INDEX "crypto_interest_snapshot_scope_category_score_idx" ON "crypto_interest_snapshots"("scopeRegion", "scopeAssetType", "category", "score");

-- CreateIndex
CREATE INDEX "crypto_interest_snapshot_instrument_date_idx" ON "crypto_interest_snapshots"("instrumentId", "snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "crypto_interest_snapshot_scope_category_symbol_key" ON "crypto_interest_snapshots"("snapshotDate", "scopeRegion", "scopeAssetType", "timeframe", "category", "symbol");

-- CreateIndex
CREATE INDEX "crypto_market_scan_snapshot_lookup_idx" ON "crypto_market_scan_snapshots"("scanType", "scanRange", "region", "assetType", "tradingDate");

-- CreateIndex
CREATE INDEX "crypto_market_scan_snapshot_date_scope_idx" ON "crypto_market_scan_snapshots"("tradingDate", "region", "assetType");

-- CreateIndex
CREATE UNIQUE INDEX "crypto_market_scan_snapshot_type_range_scope_date_rank_key" ON "crypto_market_scan_snapshots"("scanType", "scanRange", "region", "assetType", "tradingDate", "rank");

-- AddForeignKey
ALTER TABLE "crypto_signal_results" ADD CONSTRAINT "crypto_signal_results_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "crypto_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crypto_signal_results" ADD CONSTRAINT "crypto_signal_results_generationRunId_fkey" FOREIGN KEY ("generationRunId") REFERENCES "crypto_signal_generation_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crypto_signal_outcomes" ADD CONSTRAINT "crypto_signal_outcomes_signalResultId_fkey" FOREIGN KEY ("signalResultId") REFERENCES "crypto_signal_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crypto_quality_evaluations" ADD CONSTRAINT "crypto_quality_evaluations_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "crypto_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crypto_interest_snapshots" ADD CONSTRAINT "crypto_interest_snapshots_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "crypto_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

