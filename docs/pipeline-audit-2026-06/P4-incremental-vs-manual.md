# P4: Daily=Incremental vs Full-Universe=Manual-Admin Audit

**Date:** 2026-06-06  
**Auditor:** Claude Sonnet 4.6 (automated code review)  
**Scope:** Scheduled chain + both schedulers; per-stock stage delta compliance; full-historical/full-universe gating

---

## 1. Scheduled Chain Overview

Two schedulers run at startup (`server.ts` lines 20-24):

| Scheduler | File | Trigger |
|---|---|---|
| `MarketDataFoundationScheduler` | `market-data-foundation.scheduler.ts` | Interval (default 1440 min), optional startup run |
| `EodIngestScheduler` | `eod-ingest.scheduler.ts` | Interval (5 min tick), fires jobs at UTC clock times |
| `PipelineReaperScheduler` | `pipeline-orchestration.scheduler.ts` | Startup once + interval (default 30 min) — reaper only |

---

## 2. Daily-vs-Manual Trigger Matrix

### 2A: Market-Data Layer

| Operation | Trigger | Daily-incremental? | Reads-delta-only? | Full-universe manual-gated? | Persists every run? | Verdict |
|---|---|---|---|---|---|---|
| `syncScheduledRegion` → `importNseCmUdiffDaily` | `MarketDataFoundationScheduler` (scheduled+startup) | YES — single `targetTradingDate` NSE CM UDiFF file | YES — one bhavcopy file, only changes produce `changedInstrumentIds` | N/A (not a full-historical op) | YES — upserts price rows + `upsertSyncState` | PASS |
| `importNseIndexOfficialDaily` | Same scheduler, assetType=INDEX | YES — single `targetTradingDate` index bhavcopy | YES — per-day file | N/A | YES — upserts index prices | PASS |
| `startMarketDataStartupPriceBackfill` | Startup (disabled) | N/A | N/A | N/A — disabled stub | N/A | PASS (disabled) |
| Historical exchange backfill (`runExchangeHistoricalBackfill`) | Manual only — `MARKET_DATA_HISTORICAL_EXCHANGE_BACKFILL` pipeline command + direct REST `POST /market-data/exchange-files/historical-backfill` | NOT on daily path | NO — multi-date range | YES — explicit startDate/endDate required, behind manual pipeline command | YES — upserts per date | PASS |
| Price backfill run | Manual only — `startPriceBackfillRun` REST | NOT on daily path | NO — legacy; provider-disabled in NSE/BSE-only mode | YES — REST only | YES — upserts | PASS |

### 2B: Per-Stock Pipeline Stages (scheduler-driven, consume `changedInstrumentIds`)

These stages are triggered by `MarketDataFoundationScheduler` via `runScheduledDataQualityStage` → chained downstream:

| Stage (stageKey) | Adapter | Receives changedInstrumentIds? | Daily-incremental? | Persists every run? | Verdict |
|---|---|---|---|---|---|
| `DATA_QUALITY` | `DataQualityEngineService.evaluateScheduledStage` | YES — `instrumentIds: changedInstrumentIds` | YES — delta only | YES — upserts DQ results per instrument | PASS |
| `RAW_SIGNALS` | `SignalGenerationEngineService.run` | YES — `instrumentIds: chunk` (batched) | YES — delta only | YES — upserts signals per instrument | PASS |
| `SIGNAL_CALIBRATION` | `SignalCalibrationEngineService.refresh` | YES — `instrumentIds: changedInstrumentIds` | YES — delta only | YES — upserts calibration per instrument | PASS |
| `EARNINGS_INTELLIGENCE_REFRESH` | `EarningsIntelligenceService.refreshSnapshots` | YES — `instrumentIds: chunk` (batched) | YES — delta only | YES — upserts snapshots per instrument | PASS |
| `SMART_MONEY` | `SmartMoneyIntelligenceService.run` | YES — `instrumentIds: changedInstrumentIds` | YES — delta only | YES — upserts per instrument | PASS |
| `CONTEXT_SNAPSHOTS` | `HistoricalContextSnapshotsService.generate` | YES — `instrumentIds: chunkIds` (batched) | YES — delta only | YES — upserts context snapshots per instrument | PASS |
| `SIGNAL_QUALITY` | `SignalQualityLabService.recalculate` | YES — `instrumentIds: changedInstrumentIds` | YES — delta only | YES — `persistOutcomes: true` | PASS |
| `STRATEGY_DECISION` | `StrategyDecisionEngineService.evaluate` | YES — `instrumentIds: changedInstrumentIds` | YES — delta only | YES — upserts decisions per instrument | PASS |
| `WORKBENCH_REFRESH` | `WorkbenchRefreshService.refreshWorkbenchSnapshots` | YES — `instrumentIds: changedInstrumentIds` | YES — delta only | YES — upserts workbench snapshots | PASS |

### 2C: Market-Wide Aggregate Stages (legitimately full-universe from persisted data)

These stages receive `changedInstrumentIds` as an activation gate (non-empty = run), but internally read the full persisted universe. This matches the approved pattern: market-wide aggregates produce ONE daily snapshot from persisted prices.

| Stage (stageKey) | Adapter | changedInstrumentIds used as? | Scope of computation | Persists every run? | Verdict |
|---|---|---|---|---|---|
| `MARKET_CONTEXT` | `MarketContextIntelligenceService.run` | Activation gate only — not passed to service | Full region universe (all instruments) from persisted prices | YES — `MarketContextSnapshot` upserted | PASS (legitimate market-wide aggregate) |
| `MARKET_CONTEXT_SNAPSHOT_REFRESH` | `MarketContextIntelligenceService.runAsOf` | Activation gate only | Full region snapshot — today as snapshotDate | YES — persisted to `MarketContextSnapshot` | PASS |
| `SECTOR_INTELLIGENCE_REFRESH` | `MarketContextIntelligenceService.refreshSectorSnapshots` | Activation gate only | All sector aggregates from persisted signals | YES — upserts sector snapshots | PASS |
| `MARKET_PULSE_REFRESH` | `MarketPulseSnapshotService.refreshSnapshot` | Activation gate only | Full market health score from persisted data | YES — upserts `MarketPulseSnapshot` | PASS |
| `STOCK_INTEREST_REFRESH` | `StockInterestSnapshotService.refreshSnapshots` | Activation gate only — NOT passed | Full universe batchSize/offset pagination | YES — upserts stock-interest snapshots | PASS (market-wide ranking, not per-stock signal) |
| `SIGNAL_POSITION_LEDGER` | `SignalPositionLedgerService.refreshActiveRows` | Activation gate only | All active ledger rows | YES — materializes all active position rows | PASS (cross-portfolio aggregate) |
| `RESEARCH_PROJECTION` | `ResearchHubService.refreshOverview` | Activation gate only | Full overview from persisted signals+decisions | YES — upserts research projection | PASS |
| `TODAY_REVIEW` | `TodayTradeReviewService.run` | Activation gate only | Full today-review from persisted data | YES — upserts TodayReviewRun | PASS |

### 2D: EOD Ingest Scheduler (FII/DII, Bulk/Block, F&O Ban)

| Operation | Trigger | Daily-incremental? | Full-universe? | Persists every run? | Verdict |
|---|---|---|---|---|---|
| `ingestFiiDii` | `EodIngestScheduler` — 13:00 UTC (18:30 IST) | YES — NSE returns current-day rows only | NO — 2 rows (FII+DII) | YES — `ON CONFLICT (trading_date, category) DO UPDATE` | PASS |
| `ingestBulkBlockDeals` | `EodIngestScheduler` — 13:05 UTC | YES — NSE `as_on_date` = current day | NO — today's bulk+block deals | YES — upsert on (trade_date, symbol, client_name, deal_type, qty) | PASS |
| `ingestFnoBanList` | `EodIngestScheduler` — 13:10 UTC | YES — NSE CSV contains current-day ban list | NO — typically 5-30 symbols | YES — `ON CONFLICT (ban_date, symbol)` upsert | PASS |
| `seedIfEmpty` (startup) | `EodIngestScheduler.start()` — once at startup | Conditional — only fires when table row count = 0 | First-time fill only | YES | PASS (empty-table guard, not a daily reload) |

---

## 3. Full-Universe / Full-Historical Operations — Admin Gating

### 3A: Historical Exchange Backfill

**Capability:** `MarketDataFoundationService.runExchangeHistoricalBackfill` — multi-date range backfill of NSE bhavcopy files.

**Exposure paths:**
1. Pipeline command `MARKET_DATA_HISTORICAL_EXCHANGE_BACKFILL` — `ENABLED` in command catalog, requires explicit `startDate`+`endDate` params, manually POSTed to `POST /api/v1/pipeline/commands`
2. Direct REST `POST /api/v1/market-data/exchange-files/historical-backfill` (controller line 86 of router)
3. `POST /api/v1/market-data/exchange-files/historical-backfill/runs` (separate run-management endpoint)

**On daily scheduled path?** NO. `MarketDataFoundationScheduler.runOnce()` calls `syncScheduledRegion` which routes to `importNseCmUdiffDaily` (single-day, target date). It does NOT call `runExchangeHistoricalBackfill`.

**Verdict:** PASS — not on scheduled path. Gated behind explicit manual command/REST with required date params.

**Note:** The REST endpoints for historical backfill are unauthenticated in the current architecture (no auth middleware in `app.ts`). This is a pre-existing architectural state, not introduced here. The operation is still manual-only (requires HTTP call with explicit params) — it is not auto-triggered.

### 3B: PIPELINE_RUN_ALL with full_latest_trading_date mode

**Capability:** `executeDailyPipelineCommand` — when `runMode !== 'incremental_changed_only'`, calls `withFullDailyDownstreamEligibility` which fetches ALL eligible instruments (up to 10,000) from `listDailyRefreshEligibleInstrumentIds`.

**Exposure:** Pipeline command `PIPELINE_RUN_ALL` with `runMode = 'full_latest_trading_date'` or `'single_batch'`. Only reachable via manual `POST /api/v1/pipeline/commands`.

**On daily scheduled path?** NO. `MarketDataFoundationScheduler` calls `runScheduledDataQualityStage` directly with `changedInstrumentIds` from the sync summary. It does NOT call `executeDailyPipelineCommand` / `PIPELINE_RUN_ALL`.

**Verdict:** PASS — full-universe mode only reachable via explicit manual command.

### 3C: Catalog Sync / Price Catalog Backfill

**Commands:** `MARKET_DATA_INCREMENTAL_EOD_LOAD` (FORBIDDEN), `MARKET_DATA_PRICE_BACKFILL` (FORBIDDEN), `MARKET_DATA_CATALOG_SYNC` (FORBIDDEN) in command policy.

**Verdict:** PASS — explicitly FORBIDDEN via command catalog policy.

---

## 4. Incremental Persistence Verification

All per-stock incremental stages write results every run:

- **DATA_QUALITY:** `evaluateScheduledStage` upserts DQ results — confirmed by `DataQualityEngineService`.
- **RAW_SIGNALS:** `signalGenerationService.run` generates/updates signals per instrument.
- **SIGNAL_CALIBRATION:** upserts calibration per instrument.
- **EARNINGS_INTELLIGENCE:** `refreshSnapshots` upserts per instrument.
- **SMART_MONEY:** upserts smart-money data per instrument.
- **CONTEXT_SNAPSHOTS:** upserts context snapshots per instrument.
- **SIGNAL_QUALITY:** `recalculate` with `persistOutcomes: true` — upserts outcomes.
- **STRATEGY_DECISION:** `evaluate` upserts decisions per instrument.
- **WORKBENCH_REFRESH:** `refreshWorkbenchSnapshots` upserts per instrument.

All stages use the pipeline ledger's `completeStage` / `completeRun` writes so runs are durably recorded.

**Idempotency:** Each stage computes a `stageIdempotencyKey` from `(region, assetType, dataThroughDate, sourceFingerprint, changedInstrumentFingerprint)`. A completed terminal stage on the same key returns `DUPLICATE_TERMINAL` without re-executing. This means re-triggering the same daily delta is idempotent and safe.

---

## 5. Findings Summary

### Violations Found: NONE

No daily stage does a full-historical re-import or full per-stock universe recompute from scratch. No full-universe operation is on the automatic scheduled path.

### Observations (not violations)

1. **STOCK_INTEREST_REFRESH** ignores `changedInstrumentIds` at the service layer — it paginates the full universe internally. However, this is correctly classified as a market-wide ranking aggregate (like SECTOR_INTELLIGENCE / MARKET_PULSE). The activation gate (non-empty `changedInstrumentIds` required to run the stage at all) ensures it only runs on days with actual price changes. Behavior is consistent with the approved "market-wide aggregates from persisted data" pattern.

2. **Historical backfill REST endpoints** are unauthenticated. They are still manual-only (require HTTP call with explicit date params), but there is no server-side auth guard. This is a pre-existing architectural gap. Flagged for awareness but out of scope for this pass.

3. **`PIPELINE_RUN_ALL` full-daily mode** fetches up to 10,000 instrument IDs from `listDailyRefreshEligibleInstrumentIds`. This is a manual admin tool deliberately designed for recovery scenarios. It is correctly gated behind an explicit pipeline command and not on any scheduled path.

---

## 6. No Code Fixes Required

All pipeline stages comply with the incremental mandate:
- Per-stock stages consume `changedInstrumentIds` (the trading-day delta).
- Market-wide aggregates run from persisted data — one daily snapshot, triggered by the same delta activation gate.
- Full-historical and full-universe operations are not on the daily scheduler path.
- All incremental stages persist every run (upsert semantics).

---

## 7. TypeScript Check

`cd backend && npx tsc --noEmit` — **CLEAN** (no errors). No code was changed in this pass.

---

## Appendix: Key Files

| File | Role |
|---|---|
| `backend/src/modules/market-data-foundation/market-data-foundation.scheduler.ts` | MarketDataFoundationScheduler — daily incremental sync + hands changedInstrumentIds downstream |
| `backend/src/modules/market-context-intelligence/eod-ingest.scheduler.ts` | EodIngestScheduler — FII/DII, Bulk/Block, F&O Ban daily ingests |
| `backend/src/modules/pipeline-orchestration/pipeline-orchestration.service.ts` | All scheduled pipeline stages + manual command handlers |
| `backend/src/modules/market-data-foundation/market-data-foundation.service.ts` | `syncScheduledRegion` (incremental), `runExchangeHistoricalBackfill` (manual admin) |
| `backend/src/server.ts` | Server startup — only schedulers, no full-universe operations |
