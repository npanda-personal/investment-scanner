-- Add raw signal generation audit trail and nullable per-signal audit snapshots.
CREATE TABLE "signal_generation_runs" (
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

    CONSTRAINT "signal_generation_runs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "signal_results"
    ADD COLUMN "generationRunId" TEXT,
    ADD COLUMN "rulesetVersion" TEXT,
    ADD COLUMN "sourceDataDate" TIMESTAMP(3),
    ADD COLUMN "sourcePriceDate" TIMESTAMP(3),
    ADD COLUMN "scoringInputSummary" JSONB,
    ADD COLUMN "dataQualityEligibilitySnapshot" JSONB;

CREATE INDEX "signal_generation_runs_region_assetType_modelVersion_generatedDate_idx"
    ON "signal_generation_runs"("region", "assetType", "modelVersion", "generatedDate");

CREATE INDEX "signal_generation_runs_status_startedAt_idx"
    ON "signal_generation_runs"("status", "startedAt");

CREATE INDEX "signal_results_generationRunId_idx"
    ON "signal_results"("generationRunId");

CREATE INDEX "signal_results_modelVersion_sourceDataDate_idx"
    ON "signal_results"("modelVersion", "sourceDataDate");

ALTER TABLE "signal_results"
    ADD CONSTRAINT "signal_results_generationRunId_fkey"
    FOREIGN KEY ("generationRunId") REFERENCES "signal_generation_runs"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
