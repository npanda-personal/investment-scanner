-- Migration: 202606040001_signal_lifecycle_state
-- Additive / nullable only — safe for rolling deploys; no existing rows are affected.
--
-- Adds two nullable columns to signal_results:
--   lifecycleState  TEXT    — ENTRY | ACTIVE | EXIT | EXPIRED (null for pre-migration rows)
--   priorScore      DOUBLE  — composite score from the prior persisted run for the same instrument
--
-- Also adds an index on lifecycleState for fast EXIT-candidate reads.

-- AlterTable
ALTER TABLE "signal_results"
  ADD COLUMN "lifecycleState" TEXT,
  ADD COLUMN "priorScore"     DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "signal_results_lifecycleState_idx" ON "signal_results"("lifecycleState");
