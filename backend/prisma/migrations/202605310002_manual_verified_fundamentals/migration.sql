ALTER TABLE "fundamentals"
  ADD COLUMN IF NOT EXISTS "sourceNote" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "validatedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "validatedAt" TIMESTAMP(3);

DROP INDEX IF EXISTS "fundamentals_stockId_periodType_source_key";

CREATE UNIQUE INDEX IF NOT EXISTS "fundamentals_stockId_periodType_periodEndDate_source_key"
  ON "fundamentals"("stockId", "periodType", "periodEndDate", "source");
