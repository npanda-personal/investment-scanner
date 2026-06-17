-- Conviction-tab performance: supporting index for "latest smart-money snapshot
-- per instrument per range" (the DISTINCT ON used by both the conviction list and
-- funnel queries in market-data-foundation.repository.conviction.ts).
--
-- Without this index each range CTE does an Incremental Sort over ~50k rows; the
-- composite (range, instrumentId, snapshotDate DESC) lets the planner seek range=X
-- then read in (instrumentId, snapshotDate DESC) order, satisfying the DISTINCT ON
-- with no sort. Benefits the list query AND the funnel query.
--
-- Applied via raw SQL (NOT `prisma db:push`) because the shared DB carries drift,
-- mirroring the InstrumentCoverage precedent. CONCURRENTLY = no table lock.
--
-- Run:
--   docker exec investment_scanner_postgres psql -U scanner -d investment_scanner \
--     -f - < backend/scripts/add-conviction-smartmoney-index.sql
-- (CONCURRENTLY cannot run inside a transaction block; psql runs each statement
--  autocommit by default, so this file must not be wrapped in BEGIN/COMMIT.)

CREATE INDEX CONCURRENTLY IF NOT EXISTS
  smart_money_context_snapshots_range_instrument_date_idx
  ON smart_money_context_snapshots ("range", "instrumentId", "snapshotDate" DESC);
