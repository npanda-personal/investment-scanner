ALTER TABLE "strategy_decision_results"
  ADD COLUMN IF NOT EXISTS "strategyName" TEXT,
  ADD COLUMN IF NOT EXISTS "strategyDefinitionSource" TEXT,
  ADD COLUMN IF NOT EXISTS "strategyDefinitionDrift" JSONB;

CREATE INDEX IF NOT EXISTS "strategy_decision_results_strategyDefinitionSource_idx"
  ON "strategy_decision_results"("strategyDefinitionSource");
