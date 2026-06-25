-- Forthcoming / ongoing IPO calendar (NSE + BSE). Created via raw SQL (NOT prisma db push):
-- the shared DB carries drift, so a full push would drop the raw-SQL landing tables. There is
-- deliberately NO Prisma model for this table — the calendar repository reads/writes it via
-- $queryRaw/$executeRaw (the InstrumentCoverage precedent), so schema.prisma stays untouched.
--
-- Descriptive subscription data only (no price-derived fields — these issues aren't listed yet).
-- India-only today (scopeRegion='IN'); columns quoted camelCase to match the read/write SQL.
-- Idempotent.
--
-- IMPORTANT: pin to the public schema. The `scanner` DB role's search_path is `scanner, public`,
-- so an unqualified CREATE lands in the `scanner` schema, where Prisma (connected with
-- ?schema=public) cannot see it. Force public so the app's $queryRaw reads/writes find the table.
SET search_path TO public;

CREATE TABLE IF NOT EXISTS "upcoming_ipo_snapshots" (
  "id" TEXT NOT NULL,
  "snapshotDate" TIMESTAMP(3) NOT NULL,
  "source" TEXT NOT NULL,
  "scopeRegion" TEXT NOT NULL DEFAULT 'IN',
  "scopeAssetType" TEXT NOT NULL DEFAULT 'STOCK',
  "exchange" TEXT,
  "ipoType" TEXT,
  "symbol" TEXT,
  "companyName" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "openDate" TIMESTAMP(3),
  "closeDate" TIMESTAMP(3),
  "priceBandMin" DOUBLE PRECISION,
  "priceBandMax" DOUBLE PRECISION,
  "issueSizeCr" DOUBLE PRECISION,
  "lotSize" INTEGER,
  "expectedListingDate" TIMESTAMP(3),
  "sourceUrl" TEXT,
  "raw" JSONB,
  "freshness" TEXT NOT NULL DEFAULT 'FRESH',
  "calculationVersion" TEXT NOT NULL DEFAULT 'upcoming-ipo-v1',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "upcoming_ipo_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "upcoming_ipo_snapshot_scope_source_company_key"
  ON "upcoming_ipo_snapshots" ("snapshotDate", "scopeRegion", "source", "companyName");

CREATE INDEX IF NOT EXISTS "upcoming_ipo_snapshot_scope_status_close_idx"
  ON "upcoming_ipo_snapshots" ("scopeRegion", "status", "closeDate");

CREATE INDEX IF NOT EXISTS "upcoming_ipo_snapshot_scope_listing_idx"
  ON "upcoming_ipo_snapshots" ("scopeRegion", "expectedListingDate");
