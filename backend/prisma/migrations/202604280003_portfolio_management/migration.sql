-- Epic 4: Portfolio Management persistence.

CREATE TABLE IF NOT EXISTS "portfolios" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "baseCurrency" TEXT NOT NULL DEFAULT 'USD',
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "portfolios_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "portfolios"
  ADD COLUMN IF NOT EXISTS "baseCurrency" TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "portfolios" DROP COLUMN IF EXISTS "holdings";

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  IF to_regclass('"portfolios"') IS NOT NULL AND to_regclass('"users"') IS NOT NULL THEN
    FOR constraint_name IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = '"portfolios"'::regclass
        AND confrelid = '"users"'::regclass
    LOOP
      EXECUTE format('ALTER TABLE "portfolios" DROP CONSTRAINT IF EXISTS %I', constraint_name);
    END LOOP;
  END IF;
END $$;

DROP TABLE IF EXISTS "scan_results" CASCADE;
DROP TABLE IF EXISTS "scan_runs" CASCADE;
DROP TABLE IF EXISTS "scan_logs" CASCADE;
DROP TABLE IF EXISTS "scanner_rules" CASCADE;
DROP TABLE IF EXISTS "backtest_results" CASCADE;
DROP TABLE IF EXISTS "backtest_configs" CASCADE;
DROP TABLE IF EXISTS "watchlists" CASCADE;
DROP TABLE IF EXISTS "alerts" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

ALTER TABLE "portfolios" DROP COLUMN IF EXISTS "userId";

CREATE TABLE IF NOT EXISTS "portfolio_holdings" (
  "id" TEXT NOT NULL,
  "portfolioId" TEXT NOT NULL,
  "instrumentId" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "companyName" TEXT,
  "quantity" DECIMAL NOT NULL,
  "averageCost" DECIMAL NOT NULL,
  "currency" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "portfolio_holdings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "portfolio_holdings_portfolioId_instrumentId_key"
  ON "portfolio_holdings"("portfolioId", "instrumentId");
CREATE INDEX IF NOT EXISTS "portfolio_holdings_portfolioId_idx" ON "portfolio_holdings"("portfolioId");
CREATE INDEX IF NOT EXISTS "portfolio_holdings_instrumentId_idx" ON "portfolio_holdings"("instrumentId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'portfolio_holdings_portfolioId_fkey') THEN
    ALTER TABLE "portfolio_holdings"
      ADD CONSTRAINT "portfolio_holdings_portfolioId_fkey"
      FOREIGN KEY ("portfolioId") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'portfolio_holdings_instrumentId_fkey') THEN
    ALTER TABLE "portfolio_holdings"
      ADD CONSTRAINT "portfolio_holdings_instrumentId_fkey"
      FOREIGN KEY ("instrumentId") REFERENCES "stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "portfolio_transactions" (
  "id" TEXT NOT NULL,
  "portfolioId" TEXT NOT NULL,
  "instrumentId" TEXT,
  "type" TEXT NOT NULL,
  "quantity" DECIMAL,
  "price" DECIMAL,
  "amount" DECIMAL,
  "currency" TEXT NOT NULL,
  "transactionDate" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "portfolio_transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "portfolio_transactions_portfolioId_transactionDate_idx"
  ON "portfolio_transactions"("portfolioId", "transactionDate");
CREATE INDEX IF NOT EXISTS "portfolio_transactions_instrumentId_idx"
  ON "portfolio_transactions"("instrumentId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'portfolio_transactions_portfolioId_fkey') THEN
    ALTER TABLE "portfolio_transactions"
      ADD CONSTRAINT "portfolio_transactions_portfolioId_fkey"
      FOREIGN KEY ("portfolioId") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'portfolio_transactions_instrumentId_fkey') THEN
    ALTER TABLE "portfolio_transactions"
      ADD CONSTRAINT "portfolio_transactions_instrumentId_fkey"
      FOREIGN KEY ("instrumentId") REFERENCES "stocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
