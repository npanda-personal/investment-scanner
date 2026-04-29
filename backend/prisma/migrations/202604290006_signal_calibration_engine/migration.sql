CREATE TABLE IF NOT EXISTS "signal_calibration_results" (
  "id" TEXT NOT NULL,
  "signalResultId" TEXT NOT NULL,
  "instrumentId" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "companyName" TEXT,
  "sector" TEXT,
  "country" TEXT,
  "rawScore" DOUBLE PRECISION NOT NULL,
  "calibratedScore" DOUBLE PRECISION NOT NULL,
  "scoreDelta" DOUBLE PRECISION NOT NULL,
  "rawDirection" TEXT NOT NULL,
  "calibratedDirection" TEXT NOT NULL,
  "rawConfidence" TEXT NOT NULL,
  "calibratedConfidence" TEXT NOT NULL,
  "boosts" JSONB NOT NULL,
  "penalties" JSONB NOT NULL,
  "calibrationReasons" JSONB NOT NULL,
  "dataGaps" JSONB NOT NULL,
  "calibrationModelVersion" TEXT NOT NULL,
  "rawSignalModelVersion" TEXT,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "signal_calibration_results_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "signal_calibration_results_instrumentId_generatedAt_idx" ON "signal_calibration_results"("instrumentId", "generatedAt");
CREATE INDEX IF NOT EXISTS "signal_calibration_results_calibratedDirection_calibratedScore_idx" ON "signal_calibration_results"("calibratedDirection", "calibratedScore");
CREATE INDEX IF NOT EXISTS "signal_calibration_results_sector_idx" ON "signal_calibration_results"("sector");
CREATE INDEX IF NOT EXISTS "signal_calibration_results_country_idx" ON "signal_calibration_results"("country");
