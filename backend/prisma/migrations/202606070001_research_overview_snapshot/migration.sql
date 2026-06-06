-- CreateTable
-- Dedicated snapshot table for research-hub overview payloads.
-- Replaces the JSONB-in-pipeline_runs hack (AUDIT-2 / AUDIT-3 #8).
-- Keyed on (region, assetType) — one "latest" row per scope.
-- The full computed payload (including pre-diffed whatChanged + actionability) is stored
-- so that GET /research/overview is a single-row read with zero recomputation.
CREATE TABLE "research_overview_snapshots" (
    "id"                TEXT        NOT NULL,
    "region"            TEXT        NOT NULL,
    "assetType"         TEXT        NOT NULL,
    -- The fully-computed ResearchOverview DTO stored as JSONB
    "overviewJson"      JSONB       NOT NULL,
    -- Denormalised top-level fields for cheap status queries (no JSONB parse needed)
    "marketGate"        TEXT        NOT NULL,
    "overallStatus"     TEXT        NOT NULL,
    "dataGaps"          TEXT[]      NOT NULL DEFAULT ARRAY[]::TEXT[],
    "computedAt"        TIMESTAMP(3) NOT NULL,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_overview_snapshots_pkey" PRIMARY KEY ("id")
);

-- One active snapshot per (region, assetType) scope — upserted on every pipeline run
CREATE UNIQUE INDEX "research_overview_snapshots_region_assetType_key"
    ON "research_overview_snapshots"("region", "assetType");

-- Fast status-page lookup
CREATE INDEX "research_overview_snapshots_gate_status_idx"
    ON "research_overview_snapshots"("region", "assetType", "marketGate", "overallStatus");
