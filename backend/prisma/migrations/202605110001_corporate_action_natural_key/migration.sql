ALTER TABLE "corporate_actions" ADD COLUMN IF NOT EXISTS "naturalKey" TEXT;

UPDATE "corporate_actions"
SET "naturalKey" =
  "stockId" || '|' ||
  lower("actionType") || '|' ||
  to_char(date_trunc('day', "effectiveDate"), 'YYYY-MM-DD') || '|' ||
  lower(COALESCE("source", 'unknown')) || '|' ||
  CASE
    WHEN "amount" IS NULL THEN 'null'
    ELSE COALESCE(NULLIF(trim(trailing '.' from trim(trailing '0' from "amount"::text)), ''), '0')
  END || '|' ||
  CASE
    WHEN "splitRatio" IS NULL THEN 'null'
    ELSE COALESCE(NULLIF(trim(trailing '.' from trim(trailing '0' from "splitRatio"::text)), ''), '0')
  END;

DELETE FROM "corporate_actions" kept
USING (
  SELECT id
  FROM (
    SELECT
      id,
      row_number() OVER (
        PARTITION BY "naturalKey"
        ORDER BY
          CASE WHEN "effectiveDate" = date_trunc('day', "effectiveDate") THEN 0 ELSE 1 END,
          "lastUpdatedTimestamp" DESC,
          "ingestionTimestamp" DESC,
          id DESC
      ) AS rn
    FROM "corporate_actions"
  ) ranked
  WHERE ranked.rn > 1
) duplicate
WHERE kept.id = duplicate.id;

ALTER TABLE "corporate_actions" ALTER COLUMN "naturalKey" SET NOT NULL;

DROP INDEX IF EXISTS "corporate_actions_stockId_actionType_effectiveDate_source_key";
CREATE UNIQUE INDEX IF NOT EXISTS "corporate_actions_naturalKey_key" ON "corporate_actions"("naturalKey");
