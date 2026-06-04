-- Additive nullable migration: add officialResultDate to the fundamentals table.
-- This column is populated by the ingest-nse-earnings-dates.ts script, which
-- fetches board-meeting/result-announcement dates from the NSE corporate board
-- meetings API and matches them to the corresponding Fundamental rows by
-- (stockId, periodEndDate window). Once populated, the earnings-intelligence
-- pipeline reads this column to resolve resultDateSource='OFFICIAL_CALENDAR',
-- which unlocks RESULT_WINNERS, RESULT_DISAPPOINTMENTS, and RESULT_REACTION_HISTORY.

ALTER TABLE "fundamentals"
  ADD COLUMN IF NOT EXISTS "officialResultDate" TIMESTAMP(3);

-- Index for fast lookup when the earnings-intelligence repository loads
-- fundamentals for a stock and needs to supply officialResultDate:
CREATE INDEX IF NOT EXISTS "fundamentals_stockId_officialResultDate_idx"
  ON "fundamentals"("stockId", "officialResultDate")
  WHERE "officialResultDate" IS NOT NULL;
