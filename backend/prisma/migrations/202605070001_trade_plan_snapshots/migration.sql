CREATE TABLE IF NOT EXISTS "trade_plan_results" (
  "id" TEXT NOT NULL,
  "instrumentId" TEXT NOT NULL,
  "strategyDecisionId" TEXT,
  "portfolioId" TEXT,
  "portfolioKey" TEXT NOT NULL DEFAULT 'NO_PORTFOLIO',
  "symbol" TEXT NOT NULL,
  "region" TEXT,
  "assetType" TEXT,
  "strategy" TEXT NOT NULL,
  "strategyVersion" TEXT NOT NULL,
  "strategyRating" TEXT,
  "readinessLabel" TEXT,
  "backtestTimeframe" TEXT,
  "backtestSummary" JSONB,
  "strategyProofSnapshot" JSONB,
  "strategyDecisionSnapshot" JSONB,
  "latestPrice" DOUBLE PRECISION,
  "latestPriceTimestamp" TIMESTAMP(3),
  "marketDataSnapshot" JSONB,
  "dataQualitySnapshot" JSONB,
  "paperReadinessStatus" TEXT,
  "paperReadinessReasons" JSONB,
  "paperReadinessBlockers" JSONB,
  "proofGeneratedAt" TIMESTAMP(3),
  "snapshotVersion" TEXT,
  "planStatus" TEXT NOT NULL,
  "riskGrade" TEXT NOT NULL,
  "entryZone" JSONB,
  "stopLoss" JSONB,
  "target" JSONB,
  "rewardRiskRatio" DOUBLE PRECISION NOT NULL,
  "positionSizing" JSONB,
  "portfolioImpact" JSONB,
  "invalidationRules" JSONB,
  "warnings" JSONB,
  "blockers" JSONB,
  "dataGaps" JSONB,
  "modelVersion" TEXT NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "generatedDate" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "trade_plan_results_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "trade_plan_results_instrumentId_strategy_modelVersion_generatedDate_key"
  ON "trade_plan_results" ("instrumentId", "strategy", "modelVersion", "generatedDate");

CREATE INDEX IF NOT EXISTS "trade_plan_results_instrumentId_idx"
  ON "trade_plan_results" ("instrumentId");

CREATE INDEX IF NOT EXISTS "trade_plan_results_strategyDecisionId_idx"
  ON "trade_plan_results" ("strategyDecisionId");

CREATE INDEX IF NOT EXISTS "trade_plan_results_portfolioId_idx"
  ON "trade_plan_results" ("portfolioId");

ALTER TABLE "trade_plan_results"
  ADD COLUMN IF NOT EXISTS "portfolioKey" TEXT NOT NULL DEFAULT 'NO_PORTFOLIO',
  ADD COLUMN IF NOT EXISTS "region" TEXT,
  ADD COLUMN IF NOT EXISTS "assetType" TEXT,
  ADD COLUMN IF NOT EXISTS "strategyRating" TEXT,
  ADD COLUMN IF NOT EXISTS "readinessLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "backtestTimeframe" TEXT,
  ADD COLUMN IF NOT EXISTS "backtestSummary" JSONB,
  ADD COLUMN IF NOT EXISTS "strategyProofSnapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "strategyDecisionSnapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "latestPrice" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "latestPriceTimestamp" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "marketDataSnapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "dataQualitySnapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "paperReadinessStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "paperReadinessReasons" JSONB,
  ADD COLUMN IF NOT EXISTS "paperReadinessBlockers" JSONB,
  ADD COLUMN IF NOT EXISTS "proofGeneratedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "snapshotVersion" TEXT;

UPDATE "trade_plan_results"
SET
  "portfolioKey" = COALESCE("portfolioId", 'NO_PORTFOLIO'),
  "region" = COALESCE("region", 'IN'),
  "assetType" = COALESCE("assetType", 'STOCK')
WHERE "portfolioKey" = 'NO_PORTFOLIO'
   OR "region" IS NULL
   OR "assetType" IS NULL;

ALTER TABLE "trade_plan_results"
  DROP CONSTRAINT IF EXISTS "trade_plan_results_instrumentId_strategy_modelVersion_generatedDate_key";

DROP INDEX IF EXISTS "trade_plan_results_instrumentId_strategy_modelVersion_generatedDate_key";

CREATE UNIQUE INDEX IF NOT EXISTS "trade_plan_results_scope_portfolio_day_key"
  ON "trade_plan_results" ("instrumentId", "strategy", "modelVersion", "generatedDate", "region", "assetType", "portfolioKey");

CREATE INDEX IF NOT EXISTS "trade_plan_results_region_assetType_idx"
  ON "trade_plan_results" ("region", "assetType");

CREATE INDEX IF NOT EXISTS "trade_plan_results_paperReadinessStatus_idx"
  ON "trade_plan_results" ("paperReadinessStatus");

CREATE INDEX IF NOT EXISTS "trade_plan_results_strategyRating_idx"
  ON "trade_plan_results" ("strategyRating");

CREATE INDEX IF NOT EXISTS "trade_plan_results_readinessLabel_idx"
  ON "trade_plan_results" ("readinessLabel");

CREATE INDEX IF NOT EXISTS "trade_plan_results_backtestTimeframe_idx"
  ON "trade_plan_results" ("backtestTimeframe");
