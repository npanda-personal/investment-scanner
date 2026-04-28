-- Epic 3: Signal Generation Engine persistence.

CREATE TABLE IF NOT EXISTS "signal_results" (
  "id" TEXT NOT NULL,
  "instrumentId" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "companyName" TEXT,
  "sector" TEXT,
  "country" TEXT,
  "score" DOUBLE PRECISION NOT NULL,
  "direction" TEXT NOT NULL,
  "confidence" TEXT NOT NULL,
  "triggeredSignals" JSONB NOT NULL,
  "negativeSignals" JSONB NOT NULL,
  "explanation" TEXT NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source" TEXT NOT NULL DEFAULT 'signal-generation-engine',
  "dataStatus" TEXT NOT NULL DEFAULT 'PARTIAL',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "signal_results_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "signal_results_instrumentId_generatedAt_idx" ON "signal_results"("instrumentId", "generatedAt");
CREATE INDEX IF NOT EXISTS "signal_results_direction_score_idx" ON "signal_results"("direction", "score");
CREATE INDEX IF NOT EXISTS "signal_results_sector_idx" ON "signal_results"("sector");
CREATE INDEX IF NOT EXISTS "signal_results_country_idx" ON "signal_results"("country");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'signal_results_instrumentId_fkey'
  ) THEN
    ALTER TABLE "signal_results"
      ADD CONSTRAINT "signal_results_instrumentId_fkey"
      FOREIGN KEY ("instrumentId") REFERENCES "stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
