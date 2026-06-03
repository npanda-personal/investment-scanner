-- Ledger lifecycle persistence foundation.
ALTER TABLE "strategy_decision_results"
  ADD COLUMN "invalidationRulesTriggered" JSONB;

ALTER TABLE "signal_position_ledger_entries"
  ADD COLUMN "lifecycleEvidenceStatus" TEXT NOT NULL DEFAULT 'ACTIVE_ENTRY',
  ADD COLUMN "exitStrategyId" TEXT,
  ADD COLUMN "exitStrategyVersion" TEXT,
  ADD COLUMN "exitSourceDecisionId" TEXT,
  ADD COLUMN "closePriceStatus" TEXT NOT NULL DEFAULT 'UNAVAILABLE',
  ADD COLUMN "exitRuleIds" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "invalidationSourceDecisionId" TEXT,
  ADD COLUMN "invalidationRuleIds" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "invalidationTimestamp" TIMESTAMP(3);
