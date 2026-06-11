-- AddTable: instrument_eligibility
-- One row per (instrumentId, tradingDate).  Written by the data-quality-engine
-- stage; consumers read named verdict fields — no inline re-computation.
-- Hand-written additive migration; safe to re-run (IF NOT EXISTS / guarded FKs).

-- CreateTable
CREATE TABLE IF NOT EXISTS "instrument_eligibility" (
    "id"                  TEXT              NOT NULL,
    "instrumentId"        TEXT              NOT NULL,
    "tradingDate"         TIMESTAMP(3)      NOT NULL,

    -- FACTS
    "priceBars"           INTEGER           NOT NULL,
    "lastPriceDate"       TIMESTAMP(3),
    "staleSessions"       INTEGER           NOT NULL,
    "volumeCoveragePct"   DECIMAL(65,30)    NOT NULL,
    "maxGapDays"          INTEGER           NOT NULL,
    "liquidityScore"      INTEGER           NOT NULL,
    "hasFundamentals"     BOOLEAN           NOT NULL,
    "hasSector"           BOOLEAN           NOT NULL,
    "hasIndustry"         BOOLEAN           NOT NULL,
    "hasCountry"          BOOLEAN           NOT NULL,

    -- VERDICTS
    "signalEligible"      BOOLEAN           NOT NULL,
    "reviewEligible"      BOOLEAN           NOT NULL,
    "backtestEligible"    BOOLEAN           NOT NULL,
    "calibrationEligible" BOOLEAN           NOT NULL,

    "signalReasons"       TEXT[]            NOT NULL,
    "reviewReasons"       TEXT[]            NOT NULL,
    "backtestReasons"     TEXT[]            NOT NULL,
    "calibrationReasons"  TEXT[]            NOT NULL,

    -- READINESS SUMMARY
    "readinessScore"      INTEGER           NOT NULL,
    "readinessStatus"     TEXT              NOT NULL,

    -- PROVENANCE
    "policyVersion"       TEXT              NOT NULL,
    "computedAt"          TIMESTAMP(3)      NOT NULL,

    "createdAt"           TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3)      NOT NULL,

    CONSTRAINT "instrument_eligibility_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "instrument_eligibility_instrument_date_key"
    ON "instrument_eligibility"("instrumentId", "tradingDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "instrument_eligibility_trading_date_idx"
    ON "instrument_eligibility"("tradingDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "instrument_eligibility_date_signal_idx"
    ON "instrument_eligibility"("tradingDate", "signalEligible");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "instrument_eligibility_date_review_idx"
    ON "instrument_eligibility"("tradingDate", "reviewEligible");

-- AddForeignKey (guarded; ADD CONSTRAINT has no IF NOT EXISTS)
DO $$ BEGIN
  ALTER TABLE "instrument_eligibility"
    ADD CONSTRAINT "instrument_eligibility_instrumentId_fkey"
    FOREIGN KEY ("instrumentId") REFERENCES "stocks"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
