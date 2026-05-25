-- Durable pipeline run/stage ledger foundation.
-- This slice does not wire scheduler fanout or route-level status APIs.

CREATE TABLE "pipeline_runs" (
    "id" TEXT NOT NULL,
    "pipelineKey" TEXT NOT NULL,
    "scopeRegion" TEXT NOT NULL,
    "scopeAssetType" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL DEFAULT '1d',
    "triggerType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "dataThroughDate" TIMESTAMP(3),
    "sourceFingerprint" TEXT,
    "changedInstrumentCount" INTEGER NOT NULL DEFAULT 0,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "succeededCount" INTEGER NOT NULL DEFAULT 0,
    "partialCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "unchangedCount" INTEGER NOT NULL DEFAULT 0,
    "warnings" JSONB NOT NULL,
    "errors" JSONB NOT NULL,
    "metadata" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipeline_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pipeline_stage_runs" (
    "id" TEXT NOT NULL,
    "pipelineRunId" TEXT NOT NULL,
    "stageKey" TEXT NOT NULL,
    "stageOrder" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "scopeRegion" TEXT NOT NULL,
    "scopeAssetType" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL DEFAULT '1d',
    "dataThroughDate" TIMESTAMP(3),
    "inputFingerprint" TEXT,
    "outputFingerprint" TEXT,
    "changedInstrumentCount" INTEGER NOT NULL DEFAULT 0,
    "batchSize" INTEGER,
    "offset" INTEGER,
    "nextOffset" INTEGER,
    "hasMore" BOOLEAN NOT NULL DEFAULT false,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "succeededCount" INTEGER NOT NULL DEFAULT 0,
    "partialCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "unchangedCount" INTEGER NOT NULL DEFAULT 0,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "cacheKey" TEXT,
    "cacheStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "cacheExpiresAt" TIMESTAMP(3),
    "leaseOwner" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "warnings" JSONB NOT NULL,
    "errors" JSONB NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipeline_stage_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pipeline_runs_idempotencyKey_key" ON "pipeline_runs"("idempotencyKey");
CREATE INDEX "pipeline_runs_pipelineKey_scopeRegion_scopeAssetType_timeframe_data_idx" ON "pipeline_runs"("pipelineKey", "scopeRegion", "scopeAssetType", "timeframe", "dataThroughDate");
CREATE INDEX "pipeline_runs_scopeRegion_scopeAssetType_startedAt_idx" ON "pipeline_runs"("scopeRegion", "scopeAssetType", "startedAt");
CREATE INDEX "pipeline_runs_status_startedAt_idx" ON "pipeline_runs"("status", "startedAt");

CREATE UNIQUE INDEX "pipeline_stage_runs_idempotencyKey_key" ON "pipeline_stage_runs"("idempotencyKey");
CREATE UNIQUE INDEX "pipeline_stage_runs_pipelineRunId_stageKey_key" ON "pipeline_stage_runs"("pipelineRunId", "stageKey");
CREATE INDEX "pipeline_stage_runs_pipelineRunId_stageOrder_idx" ON "pipeline_stage_runs"("pipelineRunId", "stageOrder");
CREATE INDEX "pipeline_stage_runs_stageKey_scopeRegion_scopeAssetType_timeframe_idx" ON "pipeline_stage_runs"("stageKey", "scopeRegion", "scopeAssetType", "timeframe", "dataThroughDate");
CREATE INDEX "pipeline_stage_runs_stageKey_status_leaseExpiresAt_idx" ON "pipeline_stage_runs"("stageKey", "status", "leaseExpiresAt");

ALTER TABLE "pipeline_stage_runs" ADD CONSTRAINT "pipeline_stage_runs_pipelineRunId_fkey" FOREIGN KEY ("pipelineRunId") REFERENCES "pipeline_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
