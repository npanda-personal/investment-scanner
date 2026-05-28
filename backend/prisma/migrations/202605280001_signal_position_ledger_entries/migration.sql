CREATE TABLE "signal_position_ledger_entries" (
  "id" TEXT NOT NULL,
  "ledgerKey" TEXT NOT NULL,
  "scopeRegion" TEXT NOT NULL,
  "scopeAssetType" TEXT NOT NULL,
  "instrumentId" TEXT NOT NULL,
  "stockKey" TEXT NOT NULL DEFAULT '',
  "activeSlot" TEXT,
  "symbol" TEXT NOT NULL,
  "companyName" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "entrySignalId" TEXT,
  "entryTriggerType" TEXT NOT NULL DEFAULT 'bullish_entry_trigger',
  "entryTriggerTimestamp" TIMESTAMP(3) NOT NULL,
  "entryTriggerPrice" DOUBLE PRECISION NOT NULL,
  "entryReasonSummary" TEXT NOT NULL,
  "strategyId" TEXT,
  "strategyVersion" TEXT,
  "strategyDecision" TEXT,
  "strategyReadinessLabel" TEXT,
  "strategyRatingGrade" TEXT,
  "entryRuleId" TEXT,
  "latestTrustedPriceDate" TIMESTAMP(3),
  "latestTrustedPrice" DOUBLE PRECISION,
  "currentReturnPercent" DOUBLE PRECISION,
  "currentReturnStatus" TEXT NOT NULL DEFAULT 'UNAVAILABLE',
  "currentDataQualityStatus" TEXT,
  "trustEvidenceStatus" TEXT NOT NULL DEFAULT 'SOURCE_PROVEN_PRICE_UNAVAILABLE',
  "calibrationEvidenceStatus" TEXT NOT NULL DEFAULT 'UNAVAILABLE',
  "displayWarnings" JSONB NOT NULL DEFAULT '[]',
  "exitSignalId" TEXT,
  "exitTriggerTimestamp" TIMESTAMP(3),
  "exitTriggerPrice" DOUBLE PRECISION,
  "exitReasonSummary" TEXT,
  "exitRuleId" TEXT,
  "exitDecision" TEXT,
  "closedAt" TIMESTAMP(3),
  "lastEvaluatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "signal_position_ledger_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "signal_position_ledger_entries_ledgerKey_key" ON "signal_position_ledger_entries"("ledgerKey");
CREATE INDEX "spl_entries_scope_status_entry_idx" ON "signal_position_ledger_entries"("scopeRegion", "scopeAssetType", "status", "entryTriggerTimestamp");
CREATE INDEX "spl_entries_scope_status_exit_idx" ON "signal_position_ledger_entries"("scopeRegion", "scopeAssetType", "status", "exitTriggerTimestamp");
CREATE INDEX "spl_entries_instrument_status_idx" ON "signal_position_ledger_entries"("instrumentId", "status");
CREATE UNIQUE INDEX "spl_entries_one_active_stock_key" ON "signal_position_ledger_entries"("scopeRegion", "scopeAssetType", "activeSlot");

ALTER TABLE "signal_position_ledger_entries"
  ADD CONSTRAINT "signal_position_ledger_entries_instrumentId_fkey"
  FOREIGN KEY ("instrumentId") REFERENCES "stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
