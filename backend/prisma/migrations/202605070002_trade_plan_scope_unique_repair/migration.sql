UPDATE "trade_plan_results"
SET
  "portfolioKey" = COALESCE("portfolioKey", "portfolioId", 'NO_PORTFOLIO'),
  "region" = COALESCE("region", 'IN'),
  "assetType" = COALESCE("assetType", 'STOCK')
WHERE "portfolioKey" IS NULL
   OR "region" IS NULL
   OR "assetType" IS NULL;

ALTER TABLE "trade_plan_results"
  DROP CONSTRAINT IF EXISTS "trade_plan_results_instrumentId_strategy_modelVersion_generatedDate_key";

DROP INDEX IF EXISTS "trade_plan_results_instrumentId_strategy_modelVersion_generatedDate_key";

CREATE UNIQUE INDEX IF NOT EXISTS "trade_plan_results_scope_portfolio_day_key"
  ON "trade_plan_results" ("instrumentId", "strategy", "modelVersion", "generatedDate", "region", "assetType", "portfolioKey");
