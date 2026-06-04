-- Trade Journal: records human decisions and realized outcomes for research-support post-mortem.
-- Additive migration — no existing tables modified.

CREATE TABLE IF NOT EXISTS "trade_journal_entries" (
  "id"                TEXT        NOT NULL,
  "userId"            TEXT        NOT NULL,
  "instrumentId"      TEXT,
  "symbol"            TEXT        NOT NULL,
  "sourceSignalId"    TEXT,
  "direction"         TEXT        NOT NULL,
  "decision"          TEXT        NOT NULL,
  "reviewedAt"        TIMESTAMP(3) NOT NULL,
  "entryPrice"        DECIMAL(65,30),
  "stopPrice"         DECIMAL(65,30),
  "targetPrice"       DECIMAL(65,30),
  "thesis"            TEXT,
  "conviction"        DECIMAL(65,30),
  "outcomeStatus"     TEXT,
  "exitPrice"         DECIMAL(65,30),
  "exitAt"            TIMESTAMP(3),
  "realizedReturnPct" DECIMAL(65,30),
  "notes"             TEXT,
  "tags"              JSONB,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "trade_journal_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "trade_journal_entries_userId_idx"
  ON "trade_journal_entries"("userId");

CREATE INDEX IF NOT EXISTS "trade_journal_entries_userId_reviewedAt_idx"
  ON "trade_journal_entries"("userId", "reviewedAt");

CREATE INDEX IF NOT EXISTS "trade_journal_entries_instrumentId_idx"
  ON "trade_journal_entries"("instrumentId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trade_journal_entries_userId_fkey') THEN
    ALTER TABLE "trade_journal_entries"
      ADD CONSTRAINT "trade_journal_entries_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
