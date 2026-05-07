CREATE TABLE IF NOT EXISTS "price_ticks" (
  "id" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "region" TEXT,
  "exchange" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL,
  "open" DECIMAL NOT NULL,
  "high" DECIMAL NOT NULL,
  "low" DECIMAL NOT NULL,
  "close" DECIMAL NOT NULL,
  "adjustedClose" DECIMAL,
  "volume" BIGINT,
  "source" TEXT,
  "ingestionTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUpdatedTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dataStatus" TEXT NOT NULL DEFAULT 'COMPLETE',
  CONSTRAINT "price_ticks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "price_ticks_symbol_timestamp_key"
  ON "price_ticks"("symbol", "timestamp");

CREATE INDEX IF NOT EXISTS "price_ticks_symbol_timestamp_idx"
  ON "price_ticks"("symbol", "timestamp");

CREATE INDEX IF NOT EXISTS "price_ticks_region_idx"
  ON "price_ticks"("region");

CREATE TABLE IF NOT EXISTS "latest_prices" (
  "symbol" TEXT NOT NULL,
  "region" TEXT,
  "price" DECIMAL NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "latest_prices_pkey" PRIMARY KEY ("symbol")
);

CREATE TABLE IF NOT EXISTS "stocks" (
  "id" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "region" TEXT NOT NULL,
  "exchange" TEXT,
  "country" TEXT,
  "sector" TEXT,
  "industry" TEXT,
  "currency" TEXT,
  "marketCap" DECIMAL,
  "assetType" TEXT,
  "isDelisted" BOOLEAN NOT NULL DEFAULT false,
  "ipoDate" TIMESTAMP(3),
  "isin" TEXT,
  "source" TEXT NOT NULL DEFAULT 'database',
  "dataStatus" TEXT NOT NULL DEFAULT 'PARTIAL',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastSuccessfulDataLoadTimestamp" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stocks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "stocks_symbol_key"
  ON "stocks"("symbol");

CREATE TABLE IF NOT EXISTS "market_data_sync_states" (
  "id" TEXT NOT NULL,
  "region" TEXT NOT NULL,
  "assetType" TEXT NOT NULL,
  "scopeType" TEXT NOT NULL DEFAULT 'CATALOG',
  "scopeKey" TEXT NOT NULL DEFAULT 'DEFAULT',
  "timeframe" TEXT NOT NULL DEFAULT '1D',
  "tradingDate" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL,
  "lastCheckedAt" TIMESTAMP(3),
  "lastProviderFetchAt" TIMESTAMP(3),
  "lastRunAt" TIMESTAMP(3),
  "lastInsertedCount" INTEGER NOT NULL DEFAULT 0,
  "lastUpdatedCount" INTEGER NOT NULL DEFAULT 0,
  "lastNoOpCount" INTEGER NOT NULL DEFAULT 0,
  "lastSkippedCount" INTEGER NOT NULL DEFAULT 0,
  "lastWarningCount" INTEGER NOT NULL DEFAULT 0,
  "lastSummary" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "market_data_sync_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "market_data_sync_states_region_assetType_scopeType_scopeKey_timeframe_tradingDate_key"
  ON "market_data_sync_states"("region", "assetType", "scopeType", "scopeKey", "timeframe", "tradingDate");

CREATE INDEX IF NOT EXISTS "market_data_sync_states_region_assetType_scopeType_timeframe_status_idx"
  ON "market_data_sync_states"("region", "assetType", "scopeType", "timeframe", "status");

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
