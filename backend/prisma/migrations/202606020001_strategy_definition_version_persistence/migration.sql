DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'strategy_definitions'
      AND column_name = 'code'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'strategy_definitions'
      AND column_name = 'strategyCode'
  ) THEN
    ALTER TABLE "strategy_definitions" RENAME COLUMN "code" TO "strategyCode";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'strategy_definitions'
      AND column_name = 'version'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'strategy_definitions'
      AND column_name = 'strategyVersion'
  ) THEN
    ALTER TABLE "strategy_definitions" RENAME COLUMN "version" TO "strategyVersion";
  END IF;
END $$;

ALTER TABLE "strategy_definitions"
  ADD COLUMN IF NOT EXISTS "invalidationRules" JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "strategyRating" JSONB,
  ADD COLUMN IF NOT EXISTS "readinessLabel" TEXT NOT NULL DEFAULT 'RESEARCH_ONLY',
  ADD COLUMN IF NOT EXISTS "checksum" TEXT NOT NULL DEFAULT 'LEGACY_UNCHECKED',
  ADD COLUMN IF NOT EXISTS "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DROP INDEX IF EXISTS "strategy_definitions_code_key";

CREATE UNIQUE INDEX IF NOT EXISTS "strategy_definitions_strategyCode_strategyVersion_key"
  ON "strategy_definitions"("strategyCode", "strategyVersion");

CREATE INDEX IF NOT EXISTS "strategy_definitions_strategyCode_idx"
  ON "strategy_definitions"("strategyCode");
