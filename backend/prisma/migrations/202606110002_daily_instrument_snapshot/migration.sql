-- AddTable: daily_instrument_snapshot + snapshot_watermarks
-- One DailyInstrumentSnapshot row per (instrumentId, tradingDate, snapshotVersion),
-- written by the snapshot-assembler (final DAG stage).  The only read surface for
-- trader-facing queries.  snapshotVersion starts at 1; re-assembly on NSE data
-- restates writes version N+1; latest version per (instrumentId, tradingDate) is the
-- live read view.
-- SnapshotWatermark marks a (region, assetType, tradingDate) scope as READY;
-- enforced by the read path so consumers never observe mid-pipeline state.
-- Hand-written additive migration; safe to re-run (IF NOT EXISTS / guarded FKs).

-- =============================================================================
-- CreateTable: daily_instrument_snapshot
-- =============================================================================
CREATE TABLE IF NOT EXISTS "daily_instrument_snapshot" (
    "id"                    TEXT              NOT NULL,
    "instrumentId"          TEXT              NOT NULL,
    "tradingDate"           TIMESTAMP(3)      NOT NULL,
    "snapshotVersion"       INTEGER           NOT NULL DEFAULT 1,
    "region"                TEXT              NOT NULL,
    "assetType"             TEXT              NOT NULL,

    -- ELIGIBILITY (from instrument_eligibility)
    "signalEligible"        BOOLEAN           NOT NULL,
    "reviewEligible"        BOOLEAN           NOT NULL,
    "backtestEligible"      BOOLEAN           NOT NULL,
    "calibrationEligible"   BOOLEAN           NOT NULL,
    "reviewReasons"         TEXT[]            NOT NULL,
    "signalReasons"         TEXT[]            NOT NULL,
    "readinessScore"        INTEGER           NOT NULL,
    "readinessStatus"       TEXT              NOT NULL,

    -- SIGNALS
    "signalScore"           DOUBLE PRECISION,
    "signalDirection"       TEXT,
    "signalModelVersion"    TEXT,

    -- CALIBRATION
    "calibratedScore"       DOUBLE PRECISION,
    "calibrationAuthority"  TEXT,

    -- DECISION
    "strategyDecision"      TEXT,
    "rulesFired"            TEXT[]            NOT NULL,

    -- TRADE PLAN
    "stopLoss"              DECIMAL(65,30),
    "target"                DECIMAL(65,30),
    "rrRatio"               DOUBLE PRECISION,
    "planStatus"            TEXT,

    -- CONTEXT
    "marketRegime"            TEXT,
    "breadthPct"              DOUBLE PRECISION,
    "sectorRelativeStrength"  DOUBLE PRECISION,

    -- DERIVATIVES
    "oiBuildup"              TEXT,
    "participantPositioning" TEXT,

    -- EARNINGS
    "earningsProximityDays"  INTEGER,

    -- SMART MONEY
    "smartMoneyCode"         TEXT,
    "smartMoneyScore"        DOUBLE PRECISION,

    -- PROVENANCE
    -- Per-section status JSON: { eligibility, signals, calibration, decision,
    -- tradePlan, context, derivatives, earnings, smartMoney }
    -- Each value: "OK" | "STALE" | "FAILED" | "N_A"
    "provenance"             JSONB             NOT NULL,
    "assembledAt"            TIMESTAMP(3)      NOT NULL,

    "createdAt"              TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"              TIMESTAMP(3)      NOT NULL,

    CONSTRAINT "daily_instrument_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "daily_instrument_snapshot_instrument_date_version_key"
    ON "daily_instrument_snapshot"("instrumentId", "tradingDate", "snapshotVersion");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "daily_instrument_snapshot_date_scope_idx"
    ON "daily_instrument_snapshot"("tradingDate", "region", "assetType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "daily_instrument_snapshot_date_review_score_idx"
    ON "daily_instrument_snapshot"("tradingDate", "reviewEligible", "calibratedScore");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "daily_instrument_snapshot_instrument_date_idx"
    ON "daily_instrument_snapshot"("instrumentId", "tradingDate");

-- AddForeignKey (guarded; ADD CONSTRAINT has no IF NOT EXISTS)
DO $$ BEGIN
  ALTER TABLE "daily_instrument_snapshot"
    ADD CONSTRAINT "daily_instrument_snapshot_instrumentId_fkey"
    FOREIGN KEY ("instrumentId") REFERENCES "stocks"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- CreateTable: snapshot_watermarks
-- =============================================================================
CREATE TABLE IF NOT EXISTS "snapshot_watermarks" (
    "id"              TEXT         NOT NULL,
    "region"          TEXT         NOT NULL,
    "assetType"       TEXT         NOT NULL,
    "tradingDate"     TIMESTAMP(3) NOT NULL,
    "snapshotVersion" INTEGER      NOT NULL,
    "rowCount"        INTEGER      NOT NULL,
    "assembledAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "snapshot_watermarks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "snapshot_watermarks_scope_date_key"
    ON "snapshot_watermarks"("region", "assetType", "tradingDate");
