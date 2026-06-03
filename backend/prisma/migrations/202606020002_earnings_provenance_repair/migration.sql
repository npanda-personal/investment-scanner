ALTER TABLE "earnings_intelligence_snapshots"
  ADD COLUMN IF NOT EXISTS "periodEndDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "validatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "warnings" JSONB NOT NULL DEFAULT '[]';
