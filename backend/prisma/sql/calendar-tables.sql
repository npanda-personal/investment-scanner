-- Calendar module isolated tables. Created via raw SQL (NOT prisma db push) because
-- the shared DB carries drift (raw-SQL landing tables absent from schema.prisma);
-- a full push would drop them. Column names/types match the Prisma models exactly
-- (default field->column naming, camelCase quoted). Idempotent.

CREATE TABLE IF NOT EXISTS "ipo_calendar_snapshots" (
  "id" TEXT NOT NULL,
  "snapshotDate" TIMESTAMP(3) NOT NULL,
  "dataThroughDate" TIMESTAMP(3),
  "stockId" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "companyName" TEXT,
  "scopeRegion" TEXT NOT NULL,
  "scopeAssetType" TEXT NOT NULL DEFAULT 'STOCK',
  "listingDate" TIMESTAMP(3) NOT NULL,
  "daysListed" INTEGER NOT NULL,
  "exchange" TEXT,
  "sector" TEXT,
  "currency" TEXT,
  "firstClose" DOUBLE PRECISION,
  "firstCloseDate" TIMESTAMP(3),
  "latestClose" DOUBLE PRECISION,
  "latestCloseDate" TIMESTAMP(3),
  "returnSinceListing" DOUBLE PRECISION,
  "warnings" JSONB NOT NULL DEFAULT '[]',
  "freshness" TEXT NOT NULL,
  "calculationVersion" TEXT NOT NULL DEFAULT 'ipo-calendar-v1',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ipo_calendar_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ipo_calendar_snapshot_scope_symbol_key"
  ON "ipo_calendar_snapshots" ("snapshotDate", "scopeRegion", "scopeAssetType", "symbol");

CREATE INDEX IF NOT EXISTS "ipo_calendar_snapshot_scope_listing_idx"
  ON "ipo_calendar_snapshots" ("scopeRegion", "scopeAssetType", "listingDate");

CREATE TABLE IF NOT EXISTS "economic_calendar_events" (
  "id" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'FRED',
  "releaseId" TEXT NOT NULL,
  "releaseName" TEXT NOT NULL,
  "seriesId" TEXT,
  "region" TEXT NOT NULL DEFAULT 'US',
  "eventDate" TIMESTAMP(3) NOT NULL,
  "actualValue" DOUBLE PRECISION,
  "previousValue" DOUBLE PRECISION,
  "unit" TEXT,
  "sourceUrl" TEXT,
  "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "economic_calendar_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "economic_calendar_event_source_release_date_key"
  ON "economic_calendar_events" ("source", "releaseId", "eventDate");

CREATE INDEX IF NOT EXISTS "economic_calendar_event_region_date_idx"
  ON "economic_calendar_events" ("region", "eventDate");
