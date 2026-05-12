-- Market Data Foundation repair audit and durable current repair state.

CREATE TABLE IF NOT EXISTS "market_data_repair_attempts" (
  "id" TEXT NOT NULL,
  "stockId" TEXT NOT NULL,
  "region" TEXT NOT NULL,
  "assetType" TEXT,
  "repairType" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "provider" TEXT,
  "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "fieldsFilledJson" JSONB,
  "error" TEXT,
  "manualRequiredReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "market_data_repair_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "market_data_repair_states" (
  "id" TEXT NOT NULL,
  "stockId" TEXT NOT NULL,
  "region" TEXT NOT NULL,
  "assetType" TEXT,
  "repairType" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "provider" TEXT,
  "lastAttemptId" TEXT,
  "fieldsFilledJson" JSONB,
  "error" TEXT,
  "manualRequiredReason" TEXT,
  "nextRetryAt" TIMESTAMP(3),
  "firstDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastAttemptedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "market_data_repair_states_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "market_data_repair_attempts_stockId_repairType_status_attemptedAt_idx"
  ON "market_data_repair_attempts"("stockId", "repairType", "status", "attemptedAt");

CREATE INDEX IF NOT EXISTS "market_data_repair_attempts_region_assetType_repairType_status_idx"
  ON "market_data_repair_attempts"("region", "assetType", "repairType", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "market_data_repair_states_stockId_repairType_key"
  ON "market_data_repair_states"("stockId", "repairType");

CREATE INDEX IF NOT EXISTS "market_data_repair_states_region_assetType_repairType_status_idx"
  ON "market_data_repair_states"("region", "assetType", "repairType", "status");

CREATE INDEX IF NOT EXISTS "market_data_repair_states_repairType_status_nextRetryAt_idx"
  ON "market_data_repair_states"("repairType", "status", "nextRetryAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'market_data_repair_attempts_stockId_fkey'
  ) THEN
    ALTER TABLE "market_data_repair_attempts"
      ADD CONSTRAINT "market_data_repair_attempts_stockId_fkey"
      FOREIGN KEY ("stockId") REFERENCES "stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'market_data_repair_states_stockId_fkey'
  ) THEN
    ALTER TABLE "market_data_repair_states"
      ADD CONSTRAINT "market_data_repair_states_stockId_fkey"
      FOREIGN KEY ("stockId") REFERENCES "stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
