-- Add daily idempotency support for signal results without rewriting older history.
-- Existing duplicate historical rows keep a NULL generatedDate and can be reviewed
-- with the duplicate audit script before optional cleanup.
ALTER TABLE "signal_results"
ADD COLUMN IF NOT EXISTS "generatedDate" TIMESTAMP(3);

-- Signal results are daily idempotent for MVP quality/calibration workflows.
-- Keep the best row per instrument/model/day before backfilling generatedDate.
WITH ranked_signal_results AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "instrumentId", "modelVersion", COALESCE("generatedDate", date_trunc('day', "generatedAt"))
      ORDER BY
        CASE "dataStatus" WHEN 'COMPLETE' THEN 0 WHEN 'PARTIAL' THEN 1 ELSE 2 END,
        "updatedAt" DESC,
        "createdAt" DESC,
        "id" ASC
    ) AS row_number
  FROM "signal_results"
)
DELETE FROM "signal_results"
WHERE "id" IN (
  SELECT "id"
  FROM ranked_signal_results
  WHERE row_number > 1
);

UPDATE "signal_results"
SET "generatedDate" = date_trunc('day', "generatedAt")
WHERE "generatedDate" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "signal_results_instrumentId_modelVersion_generatedDate_key"
ON "signal_results"("instrumentId", "modelVersion", "generatedDate");

-- Calibration results are latest-per-signal/model. If repeated calibration already
-- created duplicates, keep the most recently updated row before enforcing uniqueness.
WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "signalResultId", "calibrationModelVersion"
      ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" ASC
    ) AS row_number
  FROM "signal_calibration_results"
)
DELETE FROM "signal_calibration_results"
WHERE "id" IN (
  SELECT "id"
  FROM ranked
  WHERE row_number > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS "signal_calibration_results_signalResultId_calibrationModelVersion_key"
ON "signal_calibration_results"("signalResultId", "calibrationModelVersion");
