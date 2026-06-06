-- Migration: smart_money_snapshot_range_unique
-- Formalises the natural-key unique constraint on smart_money_context_snapshots.
--
-- Background:
--   The original migration (202604290005) created a 2-column unique index on
--   (snapshotDate, instrumentId).  When the `range` dimension was added (1M/3M/6M)
--   that 2-column index was insufficient: multiple range values for the same
--   (instrument, date) pair are valid and should each upsert in-place.
--
--   The saveSnapshot() repository method uses Prisma's named unique key
--   `snapshotDate_instrumentId_range` for its upsert `where` clause.  Without
--   the matching DB constraint Prisma silently falls back to an INSERT, producing
--   the duplicate rows seen before this migration.
--
-- This migration is additive and idempotent:
--   1. Drops the stale 2-column index (if it still exists on this environment).
--   2. Creates the correct 3-column unique index (IF NOT EXISTS — safe to run
--      on environments that already applied this via raw SQL).
--   3. Adds the columns that were backfilled outside the migration chain
--      (range, companyName, latestClose, latestVolume, averageVolume20,
--       dailyChangePercent, signals, insiderOwnership) as ALTER TABLE ADD COLUMN
--      IF NOT EXISTS statements so the migration is safe to run on a fresh DB.
--   4. Adds/removes a status+score composite index that aids the list queries.

-- Step 1: drop the stale 2-column index if it still exists
DROP INDEX IF EXISTS "smart_money_context_snapshots_snapshotDate_instrumentId_key";

-- Step 2: add missing columns (idempotent via IF NOT EXISTS)
ALTER TABLE "smart_money_context_snapshots"
  ADD COLUMN IF NOT EXISTS "range"             TEXT NOT NULL DEFAULT '3M',
  ADD COLUMN IF NOT EXISTS "companyName"       TEXT,
  ADD COLUMN IF NOT EXISTS "latestClose"       DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "latestVolume"      DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "averageVolume20"   DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "dailyChangePercent" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "signals"           JSONB,
  ADD COLUMN IF NOT EXISTS "insiderOwnership"  JSONB;

-- Step 3: create the 3-column unique index that backs the Prisma upsert key
--         (snapshotDate_instrumentId_range)
CREATE UNIQUE INDEX IF NOT EXISTS "smart_money_context_snapshots_snapshotDate_instrumentId_ran_key"
  ON "smart_money_context_snapshots" ("snapshotDate", "instrumentId", range);

-- Step 4: composite index for status+score list queries
CREATE INDEX IF NOT EXISTS "smart_money_context_snapshots_status_smartMoneyScore_idx"
  ON "smart_money_context_snapshots" (status, "smartMoneyScore");
