-- Epic 6: Watchlist Management persistence.

CREATE TABLE IF NOT EXISTS "watchlists" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "watchlists_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "watchlist_items" (
  "id" TEXT NOT NULL,
  "watchlistId" TEXT NOT NULL,
  "instrumentId" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "companyName" TEXT,
  "notes" TEXT,
  "tags" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "watchlist_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "watchlist_items_watchlistId_instrumentId_key"
  ON "watchlist_items"("watchlistId", "instrumentId");
CREATE INDEX IF NOT EXISTS "watchlist_items_watchlistId_idx" ON "watchlist_items"("watchlistId");
CREATE INDEX IF NOT EXISTS "watchlist_items_instrumentId_idx" ON "watchlist_items"("instrumentId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'watchlist_items_watchlistId_fkey') THEN
    ALTER TABLE "watchlist_items"
      ADD CONSTRAINT "watchlist_items_watchlistId_fkey"
      FOREIGN KEY ("watchlistId") REFERENCES "watchlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'watchlist_items_instrumentId_fkey') THEN
    ALTER TABLE "watchlist_items"
      ADD CONSTRAINT "watchlist_items_instrumentId_fkey"
      FOREIGN KEY ("instrumentId") REFERENCES "stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
