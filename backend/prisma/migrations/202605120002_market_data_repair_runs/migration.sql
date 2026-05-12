-- Persist bounded Market Data Foundation operational repair run evidence.
CREATE TABLE "market_data_repair_runs" (
    "id" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "assetType" TEXT,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "beforeHealthJson" JSONB,
    "afterHealthJson" JSONB,
    "beforeRepairPlanJson" JSONB,
    "afterRepairPlanJson" JSONB,
    "actionsJson" JSONB NOT NULL,
    "summaryJson" JSONB,
    "warningsJson" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_data_repair_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "market_data_repair_runs_region_assetType_status_startedAt_idx"
    ON "market_data_repair_runs"("region", "assetType", "status", "startedAt");
