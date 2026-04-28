-- Epic 7: Alerts & Monitoring persistence.

CREATE TABLE IF NOT EXISTS "alert_rules" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "instrumentId" TEXT,
  "portfolioId" TEXT,
  "watchlistId" TEXT,
  "condition" JSONB NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "alert_events" (
  "id" TEXT NOT NULL,
  "alertRuleId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "instrumentId" TEXT,
  "portfolioId" TEXT,
  "watchlistId" TEXT,
  "metadata" JSONB NOT NULL,
  "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  "dismissedAt" TIMESTAMP(3),
  CONSTRAINT "alert_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "alert_rules_type_scope_idx" ON "alert_rules"("type", "scope");
CREATE INDEX IF NOT EXISTS "alert_rules_enabled_idx" ON "alert_rules"("enabled");
CREATE INDEX IF NOT EXISTS "alert_rules_instrumentId_idx" ON "alert_rules"("instrumentId");
CREATE INDEX IF NOT EXISTS "alert_rules_portfolioId_idx" ON "alert_rules"("portfolioId");
CREATE INDEX IF NOT EXISTS "alert_rules_watchlistId_idx" ON "alert_rules"("watchlistId");
CREATE INDEX IF NOT EXISTS "alert_events_alertRuleId_triggeredAt_idx" ON "alert_events"("alertRuleId", "triggeredAt");
CREATE INDEX IF NOT EXISTS "alert_events_readAt_idx" ON "alert_events"("readAt");
CREATE INDEX IF NOT EXISTS "alert_events_dismissedAt_idx" ON "alert_events"("dismissedAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'alert_rules_instrumentId_fkey') THEN
    ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'alert_rules_portfolioId_fkey') THEN
    ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'alert_rules_watchlistId_fkey') THEN
    ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_watchlistId_fkey" FOREIGN KEY ("watchlistId") REFERENCES "watchlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'alert_events_alertRuleId_fkey') THEN
    ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_alertRuleId_fkey" FOREIGN KEY ("alertRuleId") REFERENCES "alert_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'alert_events_instrumentId_fkey') THEN
    ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "stocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'alert_events_portfolioId_fkey') THEN
    ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'alert_events_watchlistId_fkey') THEN
    ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_watchlistId_fkey" FOREIGN KEY ("watchlistId") REFERENCES "watchlists"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
