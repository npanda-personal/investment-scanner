-- Epic 9: Backtesting & Strategy Lab persistence.

CREATE TABLE IF NOT EXISTS "backtest_strategies" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "config" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "backtest_strategies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "backtest_runs" (
  "id" TEXT NOT NULL,
  "strategyId" TEXT,
  "config" JSONB NOT NULL,
  "status" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "metrics" JSONB,
  "equityCurve" JSONB,
  "trades" JSONB,
  "error" TEXT,
  CONSTRAINT "backtest_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "backtest_runs_strategyId_idx" ON "backtest_runs"("strategyId");
CREATE INDEX IF NOT EXISTS "backtest_runs_startedAt_idx" ON "backtest_runs"("startedAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'backtest_runs_strategyId_fkey') THEN
    ALTER TABLE "backtest_runs"
      ADD CONSTRAINT "backtest_runs_strategyId_fkey"
      FOREIGN KEY ("strategyId") REFERENCES "backtest_strategies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
