-- Phase 1 Today Trade Review persisted daily shortlist snapshots.

CREATE TABLE "today_review_runs" (
    "id" TEXT NOT NULL,
    "runDate" TIMESTAMP(3) NOT NULL,
    "region" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "dataThroughDate" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "warnings" JSONB NOT NULL,
    "candidateCounts" JSONB NOT NULL,
    "sourceSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "today_review_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "today_review_candidates" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "companyName" TEXT,
    "direction" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "setupType" TEXT,
    "strategyCode" TEXT NOT NULL,
    "strategyVersion" TEXT,
    "rank" INTEGER NOT NULL,
    "grade" TEXT NOT NULL,
    "confidenceScore" INTEGER NOT NULL,
    "reasonSummary" TEXT NOT NULL,
    "blockers" JSONB NOT NULL,
    "watchReasons" JSONB NOT NULL,
    "dataQualitySnapshot" JSONB,
    "marketContextSnapshot" JSONB,
    "strategyProofSnapshot" JSONB,
    "tradePlanSnapshot" JSONB,
    "sourceSignalSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "today_review_candidates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "today_review_runs_runDate_region_assetType_key" ON "today_review_runs"("runDate", "region", "assetType");
CREATE INDEX "today_review_runs_region_assetType_runDate_idx" ON "today_review_runs"("region", "assetType", "runDate");
CREATE UNIQUE INDEX "today_review_candidates_runId_instrumentId_strategyCode_direction_key" ON "today_review_candidates"("runId", "instrumentId", "strategyCode", "direction");
CREATE INDEX "today_review_candidates_runId_rank_idx" ON "today_review_candidates"("runId", "rank");
CREATE INDEX "today_review_candidates_instrumentId_idx" ON "today_review_candidates"("instrumentId");
CREATE INDEX "today_review_candidates_state_idx" ON "today_review_candidates"("state");

ALTER TABLE "today_review_candidates" ADD CONSTRAINT "today_review_candidates_runId_fkey" FOREIGN KEY ("runId") REFERENCES "today_review_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
