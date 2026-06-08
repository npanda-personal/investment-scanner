-- Crypto enrichment: metadata columns on crypto_assets + fundamentals + events tables.
-- HAND-WRITTEN crypto-only subset of `prisma migrate diff` output: the full diff also
-- contained DROP TABLE / ALTER statements for UNRELATED, drifted equity modules
-- (fii_dii_snapshots, fno_ban_list, fo_*, market_pulse_snapshots, workbench_snapshots,
-- fundamentals, …). Those are DELIBERATELY EXCLUDED — see memory crypto-and-shared-db-state.
-- Every statement is idempotent (IF NOT EXISTS / guarded) so re-running is safe on the
-- drifted shared DB. Touches ONLY crypto_* tables.

-- ── crypto_assets: descriptive metadata columns ─────────────────────────────
ALTER TABLE "crypto_assets"
  ADD COLUMN IF NOT EXISTS "description"            TEXT,
  ADD COLUMN IF NOT EXISTS "logoUrl"                TEXT,
  ADD COLUMN IF NOT EXISTS "websiteUrl"             TEXT,
  ADD COLUMN IF NOT EXISTS "categoryTags"           TEXT[],
  ADD COLUMN IF NOT EXISTS "circulatingSupply"      DECIMAL(65,30),
  ADD COLUMN IF NOT EXISTS "totalSupply"            DECIMAL(65,30),
  ADD COLUMN IF NOT EXISTS "maxSupply"              DECIMAL(65,30),
  ADD COLUMN IF NOT EXISTS "fullyDilutedValuation"  DECIMAL(65,30),
  ADD COLUMN IF NOT EXISTS "athPrice"               DECIMAL(65,30),
  ADD COLUMN IF NOT EXISTS "athDate"                TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "atlPrice"               DECIMAL(65,30),
  ADD COLUMN IF NOT EXISTS "atlDate"                TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "genesisDate"            TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "contractAddresses"      JSONB,
  ADD COLUMN IF NOT EXISTS "metadataSource"         TEXT,
  ADD COLUMN IF NOT EXISTS "metadataUpdatedAt"      TIMESTAMP(3);

-- ── crypto_fundamental_snapshots (DefiLlama) ────────────────────────────────
CREATE TABLE IF NOT EXISTS "crypto_fundamental_snapshots" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "defillamaSlug" TEXT,
    "category" TEXT,
    "chains" JSONB,
    "tvlUsd" DECIMAL(65,30),
    "tvlChange1dPct" DOUBLE PRECISION,
    "tvlChange7dPct" DOUBLE PRECISION,
    "fees24hUsd" DECIMAL(65,30),
    "fees7dUsd" DECIMAL(65,30),
    "revenue24hUsd" DECIMAL(65,30),
    "revenue30dUsd" DECIMAL(65,30),
    "annualizedRevenueUsd" DECIMAL(65,30),
    "stakingApyPct" DOUBLE PRECISION,
    "coverageStatus" TEXT NOT NULL DEFAULT 'NONE',
    "source" TEXT NOT NULL DEFAULT 'DEFILLAMA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "crypto_fundamental_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "crypto_fundamental_snapshots_symbol_snapshotDate_idx" ON "crypto_fundamental_snapshots"("symbol", "snapshotDate");
CREATE INDEX IF NOT EXISTS "crypto_fundamental_snapshots_snapshotDate_idx" ON "crypto_fundamental_snapshots"("snapshotDate");
CREATE UNIQUE INDEX IF NOT EXISTS "crypto_fundamental_snapshots_instrumentId_snapshotDate_key" ON "crypto_fundamental_snapshots"("instrumentId", "snapshotDate");

-- ── crypto_events (CoinMarketCal) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "crypto_events" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT,
    "symbol" TEXT,
    "source" TEXT NOT NULL DEFAULT 'COINMARKETCAL',
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "dateConfidence" TEXT,
    "isHot" BOOLEAN NOT NULL DEFAULT false,
    "percentageChange" DOUBLE PRECISION,
    "votes" INTEGER,
    "proofUrl" TEXT,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "crypto_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "crypto_events_eventDate_idx" ON "crypto_events"("eventDate");
CREATE INDEX IF NOT EXISTS "crypto_events_instrumentId_eventDate_idx" ON "crypto_events"("instrumentId", "eventDate");
CREATE INDEX IF NOT EXISTS "crypto_events_category_eventDate_idx" ON "crypto_events"("category", "eventDate");
CREATE UNIQUE INDEX IF NOT EXISTS "crypto_events_source_externalId_key" ON "crypto_events"("source", "externalId");

-- ── Foreign keys (guarded; ADD CONSTRAINT has no IF NOT EXISTS) ──────────────
DO $$ BEGIN
  ALTER TABLE "crypto_fundamental_snapshots"
    ADD CONSTRAINT "crypto_fundamental_snapshots_instrumentId_fkey"
    FOREIGN KEY ("instrumentId") REFERENCES "crypto_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "crypto_events"
    ADD CONSTRAINT "crypto_events_instrumentId_fkey"
    FOREIGN KEY ("instrumentId") REFERENCES "crypto_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
