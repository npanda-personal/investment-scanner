CREATE TABLE IF NOT EXISTS "data_quality_evaluations" (
  "id" TEXT NOT NULL,
  "instrumentId" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "companyName" TEXT,
  "sector" TEXT,
  "industry" TEXT,
  "country" TEXT,
  "currency" TEXT,
  "coverageScore" DOUBLE PRECISION NOT NULL,
  "coverageStatus" TEXT NOT NULL,
  "signalReadinessScore" DOUBLE PRECISION NOT NULL,
  "signalReadinessStatus" TEXT NOT NULL,
  "liquidityScore" DOUBLE PRECISION NOT NULL,
  "liquidityStatus" TEXT NOT NULL,
  "eligibleForSignals" BOOLEAN NOT NULL,
  "eligibleForBacktesting" BOOLEAN NOT NULL,
  "eligibleForCalibration" BOOLEAN NOT NULL,
  "dataGaps" JSONB NOT NULL,
  "warnings" JSONB NOT NULL,
  "readinessReasons" JSONB NOT NULL,
  "readinessBlockers" JSONB NOT NULL,
  "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "data_quality_evaluations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "data_quality_evaluations_instrumentId_key" ON "data_quality_evaluations"("instrumentId");
CREATE INDEX IF NOT EXISTS "data_quality_evaluations_coverageStatus_idx" ON "data_quality_evaluations"("coverageStatus");
CREATE INDEX IF NOT EXISTS "data_quality_evaluations_signalReadinessStatus_idx" ON "data_quality_evaluations"("signalReadinessStatus");
CREATE INDEX IF NOT EXISTS "data_quality_evaluations_liquidityStatus_idx" ON "data_quality_evaluations"("liquidityStatus");
CREATE INDEX IF NOT EXISTS "data_quality_evaluations_sector_idx" ON "data_quality_evaluations"("sector");
CREATE INDEX IF NOT EXISTS "data_quality_evaluations_country_idx" ON "data_quality_evaluations"("country");
CREATE INDEX IF NOT EXISTS "data_quality_evaluations_evaluatedAt_idx" ON "data_quality_evaluations"("evaluatedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'data_quality_evaluations_instrumentId_fkey'
  ) THEN
    ALTER TABLE "data_quality_evaluations"
      ADD CONSTRAINT "data_quality_evaluations_instrumentId_fkey"
      FOREIGN KEY ("instrumentId") REFERENCES "stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
