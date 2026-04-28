ALTER TABLE "price_ticks"
  ADD COLUMN IF NOT EXISTS "adjustedClose" DECIMAL,
  ADD COLUMN IF NOT EXISTS "ingestionTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "lastUpdatedTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "dataStatus" TEXT NOT NULL DEFAULT 'COMPLETE';

ALTER TABLE "stocks"
  ADD COLUMN IF NOT EXISTS "country" TEXT,
  ADD COLUMN IF NOT EXISTS "sector" TEXT,
  ADD COLUMN IF NOT EXISTS "industry" TEXT,
  ADD COLUMN IF NOT EXISTS "currency" TEXT,
  ADD COLUMN IF NOT EXISTS "marketCap" DECIMAL,
  ADD COLUMN IF NOT EXISTS "assetType" TEXT,
  ADD COLUMN IF NOT EXISTS "isDelisted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "ipoDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "isin" TEXT,
  ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'database',
  ADD COLUMN IF NOT EXISTS "dataStatus" TEXT NOT NULL DEFAULT 'PARTIAL';

CREATE TABLE IF NOT EXISTS "fundamentals" (
  "id" TEXT NOT NULL,
  "stockId" TEXT NOT NULL,
  "revenue" DECIMAL,
  "eps" DECIMAL,
  "netIncome" DECIMAL,
  "peRatio" DECIMAL,
  "dividendYield" DECIMAL,
  "sharesOutstanding" BIGINT,
  "marketCap" DECIMAL,
  "currency" TEXT,
  "periodType" TEXT NOT NULL,
  "periodEndDate" TIMESTAMP(3) NOT NULL,
  "source" TEXT NOT NULL,
  "ingestionTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUpdatedTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dataStatus" TEXT NOT NULL DEFAULT 'PARTIAL',
  CONSTRAINT "fundamentals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fundamentals_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "fundamentals_stockId_periodType_periodEndDate_source_key"
  ON "fundamentals"("stockId", "periodType", "periodEndDate", "source");

CREATE INDEX IF NOT EXISTS "fundamentals_stockId_periodEndDate_idx"
  ON "fundamentals"("stockId", "periodEndDate");

CREATE TABLE IF NOT EXISTS "corporate_actions" (
  "id" TEXT NOT NULL,
  "stockId" TEXT NOT NULL,
  "actionType" TEXT NOT NULL,
  "effectiveDate" TIMESTAMP(3) NOT NULL,
  "declaredDate" TIMESTAMP(3),
  "paymentDate" TIMESTAMP(3),
  "amount" DECIMAL,
  "splitRatio" DECIMAL,
  "currency" TEXT,
  "source" TEXT NOT NULL,
  "ingestionTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUpdatedTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dataStatus" TEXT NOT NULL DEFAULT 'COMPLETE',
  CONSTRAINT "corporate_actions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "corporate_actions_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "corporate_actions_stockId_actionType_effectiveDate_source_key"
  ON "corporate_actions"("stockId", "actionType", "effectiveDate", "source");

CREATE INDEX IF NOT EXISTS "corporate_actions_stockId_effectiveDate_idx"
  ON "corporate_actions"("stockId", "effectiveDate");

CREATE TABLE IF NOT EXISTS "fx_rates" (
  "id" TEXT NOT NULL,
  "pair" TEXT NOT NULL,
  "baseCurrency" TEXT NOT NULL,
  "quoteCurrency" TEXT NOT NULL,
  "rate" DECIMAL NOT NULL,
  "rateTimestamp" TIMESTAMP(3) NOT NULL,
  "source" TEXT NOT NULL,
  "ingestionTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUpdatedTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dataStatus" TEXT NOT NULL DEFAULT 'COMPLETE',
  CONSTRAINT "fx_rates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "fx_rates_pair_key" ON "fx_rates"("pair");
CREATE INDEX IF NOT EXISTS "fx_rates_baseCurrency_quoteCurrency_idx" ON "fx_rates"("baseCurrency", "quoteCurrency");
