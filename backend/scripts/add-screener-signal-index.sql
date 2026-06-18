-- Screener performance: two supporting indexes that eliminate full Incremental Sorts
-- on the screener's two heaviest DISTINCT-ON CTEs.
--
-- ROOT CAUSE OF 33s (region=IN) / 18s (region=US) SCREENER HANGS:
--
-- 1. latest_signal CTE — wrong index column (generatedAt ≠ generatedDate):
--      ORDER BY sr."instrumentId", sr."generatedDate" DESC
--    Existing index: signal_results_instrumentId_generatedAt_idx (instrumentId, generatedAt)
--    generatedAt is the row-insert timestamp; generatedDate is the signal date.
--    Postgres uses the generatedAt index for the instrumentId presort, then does a full
--    Incremental Sort of ~50k rows by generatedDate DESC — measured: 930ms.
--
-- 2. latest_delivery CTE — index direction mismatch (ASC vs DESC):
--      DISTINCT ON (d.symbol) ... ORDER BY d.symbol, d."tradingDate" DESC
--    Existing index: market_delivery_snapshots_symbol_tradingDate_idx (symbol, tradingDate ASC)
--    For DISTINCT ON the planner needs data ordered (symbol ASC, tradingDate DESC). The ASC index
--    satisfies the outer symbol ordering but forces an Incremental Sort within each symbol group
--    to flip tradingDate to DESC — measured: 3,938ms on 217k rows.
--
-- FIXES (both partial, CONCURRENTLY, idempotent):
--
-- After both indexes:
--   latest_signal:  SkipScan, 0.1–0.6ms (from 930ms)
--   latest_delivery: SkipScan, 135ms (from 3,938ms)
--   Combined CTEs:  ~310ms (from ~4s)
--
-- Applied via raw SQL (NOT `prisma db:push`) — shared DB carries drift;
-- same precedent as the smart_money conviction-index. CONCURRENTLY = no table lock.
-- IF NOT EXISTS = idempotent re-runs.
--
-- Run:
--   docker exec investment_scanner_postgres psql -U scanner -d investment_scanner \
--     -f - < backend/scripts/add-screener-signal-index.sql
-- (CONCURRENTLY cannot run inside a transaction block; psql autocommits each
--  statement by default — do NOT wrap in BEGIN/COMMIT.)

-- Fix 1: signal_results — match the DISTINCT ON ORDER BY exactly
CREATE INDEX CONCURRENTLY IF NOT EXISTS
  signal_results_instrumentId_generatedDate_idx
  ON signal_results ("instrumentId", "generatedDate" DESC)
  WHERE "generatedDate" IS NOT NULL;

-- Fix 2: market_delivery_snapshots — DESC on tradingDate + partial matching the CTE WHERE
CREATE INDEX CONCURRENTLY IF NOT EXISTS
  market_delivery_snapshots_symbol_tradingdate_desc_idx
  ON market_delivery_snapshots (symbol, "tradingDate" DESC)
  WHERE "deliveryPercent" IS NOT NULL AND "deliveryPercent" > 0;
