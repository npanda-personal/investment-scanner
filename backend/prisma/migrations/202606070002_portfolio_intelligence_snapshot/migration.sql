-- CreateTable
-- Persisted portfolio intelligence snapshot per portfolio (AUDIT-2).
-- Keyed unique on portfolioId — one latest row per portfolio.
-- GET /portfolios/:id/intelligence reads this row; no recomputation on read.
-- Populated by refreshPortfolioIntelligence() on holdings change or daily refresh.
CREATE TABLE "portfolio_intelligence_snapshots" (
    "id"            TEXT            NOT NULL,
    "portfolioId"   TEXT            NOT NULL,
    "computedAt"    TIMESTAMP(3)    NOT NULL,
    -- Denormalised scalars for cheap status queries
    "healthScore"   INTEGER         NOT NULL,
    "status"        TEXT            NOT NULL,
    -- Full PortfolioIntelligenceResponse payload as JSONB
    "payloadJson"   JSONB           NOT NULL,
    "createdAt"     TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3)    NOT NULL,

    CONSTRAINT "portfolio_intelligence_snapshots_pkey" PRIMARY KEY ("id")
);

-- One active snapshot per portfolio — upserted on every refresh
CREATE UNIQUE INDEX "portfolio_intelligence_snapshots_portfolioId_key"
    ON "portfolio_intelligence_snapshots"("portfolioId");

-- Fast lookup by portfolio + recency
CREATE INDEX "portfolio_intelligence_snapshots_portfolioId_computedAt_idx"
    ON "portfolio_intelligence_snapshots"("portfolioId", "computedAt");

-- FK to portfolios
ALTER TABLE "portfolio_intelligence_snapshots"
    ADD CONSTRAINT "portfolio_intelligence_snapshots_portfolioId_fkey"
    FOREIGN KEY ("portfolioId") REFERENCES "portfolios"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
