# Pipeline Audit — Stage & Scheduler Map
**Date:** 2026-06-06  
**Scope:** investment-scanner backend — all pipeline stages and scheduled jobs  
**Audit type:** Read-only code + DB inspection

---

## 1. Schedulers

### 1a. MarketDataFoundationScheduler
**File:** `backend/src/modules/market-data-foundation/market-data-foundation.scheduler.ts`  
**Config (from `.env`):**
| Env var | Value |
|---------|-------|
| `MARKET_DATA_SCHEDULER_ENABLED` | `true` |
| `MARKET_DATA_SCHEDULER_INTERVAL_MINUTES` | `15` (min=1440 enforced by code → effective **1440 min / daily**) |
| `MARKET_DATA_SCHEDULER_BATCH_SIZE` | `25` |
| `MARKET_DATA_SCHEDULER_RUN_ON_STARTUP` | `true` |

**Note (DEFECT-5):** `.env` sets `INTERVAL_MINUTES=15` but the scheduler clamps to `max(parsed, 1440)` at line 334 (`Math.max(parseNumber(env.MARKET_DATA_SCHEDULER_INTERVAL_MINUTES, 1440), 1440)`). Effective interval is **1440 min (once daily)**. The `.env` value of 15 is misleading/dead config.

**Startup behaviour:** `server.ts:19` calls `startMarketDataStartupLoads()` which calls `runOnce()` with `triggerType: 'startup'` after confirming `MARKET_DATA_SCHEDULER_ENABLED=true` and `runOnStartup=true`.

**Tick logic:** On each tick (daily), calls `service.syncScheduledRegion()` (incremental-latest-candle path for IN/STOCK). If the result has changed instruments and passes `shouldRunScheduledDataQuality()`, it calls `PipelineOrchestrationService.runScheduledDataQualityStage()` which fans out through the full downstream chain. On a skipped tick (already current), it calls `runDownstreamCatchUp()` using the last stored sync summary to retry downstream stages that may not have completed.

---

### 1b. EodIngestScheduler
**File:** `backend/src/modules/market-context-intelligence/eod-ingest.scheduler.ts`  
**Tick interval:** 5 min (checks clock; fires jobs by UTC time once per calendar day)  
**Startup:** `server.ts:22` calls `startEodIngestScheduler()`. Calls `seedIfEmpty()` once at startup — fires each NSE ingest only if the corresponding table has 0 rows.

| Job name | UTC time | IST time | Function |
|----------|----------|----------|----------|
| FII/DII Activity | 13:00 UTC | 18:30 IST | `ingestFiiDii()` |
| Bulk & Block Deals | 13:05 UTC | 18:35 IST | `ingestBulkBlockDeals()` |
| F&O Ban List | 13:10 UTC | 18:40 IST | `ingestFnoBanList()` |
| Market Pulse Snapshot | 13:30 UTC | 19:00 IST | `MarketPulseSnapshotService.refreshSnapshot()` |
| Research Hub Snapshot | 13:40 UTC | 19:10 IST | `ResearchHubService.refreshOverview()` |

**Important:** The Market Pulse and Research Hub snapshot jobs in this scheduler fire **independently** from the pipeline-orchestration chain. The pipeline chain also runs `MARKET_PULSE` (via `MARKET_PULSE_REFRESH` command, manual only) and `RESEARCH_PROJECTION` (scheduled downstream). See DEFECT-1 and DEFECT-2.

---

## 2. Complete Stage Matrix

The pipeline chain entry point is `syncScheduledRegion` → `runScheduledDataQualityStage` → inline downstream fanout. All scheduled stages share `triggerType: 'scheduled'`; manual commands use `triggerType: 'manual'`.

| # | Stage key (stageKey in ledger) | Trigger | Run mode | Persists? → Table | Incremental correct? | Idempotent? | Error handled? | Issues |
|---|-------------------------------|---------|----------|-------------------|---------------------|-------------|---------------|--------|
| 1 | **MARKET_DATA** | MarketDataFoundationScheduler (daily / startup) + `PIPELINE_RUN_ALL` (manual) | Incremental: latest NSE CM udiff file for `targetTradingDate`; only changed symbols downstream | `price_ticks`, `latest_prices`, `market_data_sync_states` | YES — only changed symbols used for downstream | Mirror-upsert via `recordMarketDataStageSnapshot()` to `pipeline_stage_runs` | try/catch + FAILED status written; errors recorded in stage | DEFECT-5 (interval mismatch in .env) |
| 2 | **DATA_QUALITY** | Downstream from MARKET_DATA (scheduled) or manual `DATA_QUALITY_EVALUATE_SCOPE` | Incremental: explicit changed instrument ids only | `data_quality_evaluations`, `data_quality_snapshots` | YES — chunk-level progress persisted via `onProgress` callback | Deterministic idempotency key; lease prevents double-exec | Full try/catch; FAILED + run status persisted | 2 `RUNNING` orphans in DB (see DB notes) |
| 3 | **RAW_SIGNALS** | Downstream from DATA_QUALITY (scheduled); manual is `DEFERRED` | Incremental: same changed instrument ids | `signal_results`, `signal_generation_runs` | YES — adaptor processes explicit ids only | Deterministic idempotency key; lease prevents double-exec | try/catch + FAILED persisted | 3 `RUNNING` orphans in DB; 26 `PARTIAL` runs (see DEFECT-3) |
| 4 | **SIGNAL_CALIBRATION** | Downstream from RAW_SIGNALS (scheduled); manual is `DEFERRED` | Incremental: same changed instrument ids, chunk loop | `signal_calibration_results` | YES — iterates all changed ids across batches before reporting terminal | Deterministic idempotency key; lease prevents double-exec | try/catch + FAILED persisted | 1 `RUNNING` orphan; 20 `PARTIAL` runs |
| 5 | **EARNINGS_INTELLIGENCE_REFRESH** | Downstream from SIGNAL_CALIBRATION (scheduled); manual `EARNINGS_INTELLIGENCE_REFRESH` (`ENABLED`) | Scheduled: explicit changed instruments, chunked. Manual: batchSize/offset | `earnings_intelligence_snapshots` | YES — chunks all changed ids | Deterministic idempotency key | try/catch + FAILED persisted | 130 `PARTIAL` runs (see DEFECT-4); 1 `COMPLETED` vs 130 `PARTIAL` |
| 6 | **MARKET_CONTEXT** | Downstream from EARNINGS_INTELLIGENCE_REFRESH (scheduled); manual is `DEFERRED` | **FULL UNIVERSE** — calls `marketContextService.run(region)` which loads top-500 instruments by marketCap regardless of changed ids | `market_context_snapshots` | NO — full-universe snapshot on daily scheduled path (DEFECT-A) | Deterministic idempotency key | try/catch + FAILED persisted | **DEFECT-A: full-universe on daily path** |
| 6b | **MARKET_CONTEXT_SNAPSHOT_REFRESH** | Downstream from MARKET_CONTEXT (scheduled, only if COMPLETED); manual is `DEFERRED` | Same scope as MARKET_CONTEXT — `runAsOf(region, undefined)` loads same full-500 universe | `market_context_snapshots` | NO — same full-universe issue | Deterministic idempotency key | try/catch + FAILED persisted | **DEFECT-A secondary**: full-universe on scheduled path |
| 7 | **SMART_MONEY** | Downstream from MARKET_CONTEXT_SNAPSHOT_REFRESH (scheduled) | Incremental: changed instrument ids passed to `SmartMoneyIntelligenceService.run()` | `smart_money_context_snapshots` | YES — drains changed set across batches | Deterministic idempotency key | try/catch + FAILED persisted | None significant |
| 8 | **CONTEXT_SNAPSHOTS** | Downstream from SMART_MONEY (scheduled) | Incremental: changed instrument ids chunked | `country_context_snapshots`, `sector_context_snapshots` (via `HistoricalContextSnapshotsService.generate()`) | YES — all changed ids drained across batches | Deterministic idempotency key | try/catch + FAILED persisted | None significant |
| 9 | **SIGNAL_QUALITY** | Downstream from CONTEXT_SNAPSHOTS (scheduled); manual `DEFERRED` | Incremental: changed instrument ids, while-loop over pages | `signal_outcomes` (via `SignalQualityLabService.recalculate`) | YES — processes all supplied ids | Deterministic idempotency key | try/catch + FAILED persisted | 17 `PARTIAL` runs in DB |
| 10 | **STRATEGY_DECISION** | Downstream from SIGNAL_QUALITY (scheduled); manual `DEFERRED` | Incremental: changed instrument ids, while-loop | `strategy_decision_results` | YES — processes all supplied ids | Deterministic idempotency key | try/catch + FAILED persisted | 2 `RUNNING` orphans in DB |
| 11 | **RESEARCH_PROJECTION** | Downstream from STRATEGY_DECISION (scheduled); manual `FORBIDDEN` | **FULL UNIVERSE** — calls `researchHubService.refreshOverview()` which reads all strategy decisions + signals for region (no instrument-id scoping) | `research_hub_snapshots` (saveCachedOverview) | NO — compute-and-save but always full region sweep | Deterministic idempotency key | try/catch + FAILED persisted | **DEFECT-B: full-universe on scheduled path** |
| 12 | **TODAY_REVIEW** | Downstream from RESEARCH_PROJECTION (scheduled); manual `FORBIDDEN` | **FULL UNIVERSE** — `TodayTradeReviewService.run()` loads full `reviewUniverse` (all trusted instruments), all `entryCandidates`, `exitCandidates` for the region | `today_review_runs`, `today_review_candidates` | NO — full-universe daily run (DEFECT-C) | `markRunStarted` + `completeRun` persists; no lease on the run | try/catch + FAILED run persisted | **DEFECT-C: full-universe on scheduled path**; 1 `RUNNING` orphan |
| 13 | **SIGNAL_POSITION_LEDGER** | Downstream from TODAY_REVIEW (scheduled); manual `DEFERRED` | Reads all active signal ledger entries; offset=0/limit=batchSize so processes the top slice only (not bounded by changed ids) — **bounded but not incremental** | `signal_position_ledger_entries` | PARTIAL — takes limit=normalizedBatchSize at offset=0; does not walk entire universe per run | Deterministic idempotency key | try/catch + FAILED persisted | **DEFECT-D**: single-batch (offset=0) may not refresh tail entries |
| 14 | **SECTOR_INTELLIGENCE_REFRESH** | Downstream from SIGNAL_POSITION_LEDGER (scheduled); manual `ENABLED` | **FULL UNIVERSE** — `refreshSectorSnapshots()` reads all sector index catalog rows + price data for the region | `sector_snapshots` | NO — full region snapshot on scheduled path (DEFECT-E) | Deterministic idempotency key | try/catch + FAILED persisted | **DEFECT-E: full-universe on scheduled path**; 12 `PARTIAL` in DB |
| – | **MARKET_PULSE** | EodIngestScheduler 19:00 IST daily (not via pipeline chain); manual `ENABLED` via `MARKET_PULSE_REFRESH` | Reads persisted price/index/sector data — DB-only, scoped snapshot | `market_pulse_snapshots` | YES — single snapshot per refresh, reads persisted data | Pipeline command uses idempotency key; EodIngestScheduler has no dedup | EodIngestScheduler: try/catch logged. Pipeline command: try/catch + FAILED persisted | DEFECT-1: EodIngestScheduler fires without ledger record — not visible in pipeline_stage_runs; 8 `PARTIAL` in DB from older attempts; **no `COMPLETED` ever** |
| – | **RESEARCH_HUB snapshot** | EodIngestScheduler 19:10 IST daily (not via pipeline chain) | Full universe (same as RESEARCH_PROJECTION) | In-memory cache + DB via `saveCachedOverview` (research_hub_snapshots if table exists) | NO | EodIngestScheduler: no dedup | try/catch logged, non-fatal | DEFECT-2: runs independently of pipeline chain; double-execution when both paths run same day |
| – | **FII/DII** | EodIngestScheduler 18:30 IST daily | Full refresh from NSE | `fii_dii_snapshots` | N/A (full daily snapshot) | Startup seed guards empty table; no daily dedup | try/catch + logged warning | None critical |
| – | **Bulk/Block Deals** | EodIngestScheduler 18:35 IST daily | Full refresh from NSE | `bulk_block_deals` | N/A | Same as FII/DII | try/catch + logged warning | None critical |
| – | **F&O Ban List** | EodIngestScheduler 18:40 IST daily | Full refresh from NSE | `fno_ban_list` | N/A | Same as FII/DII | try/catch + logged warning | None critical |
| – | **BACKTEST_PROOF** | `FORBIDDEN` in command policy | N/A | `backtest_runs`, `strategy_performance_summaries` | Not scheduled | N/A | N/A | **DEFECT-F: not wired** — no scheduled or automated path exists |
| – | **CATALOG_SYNC / MARKET_DATA_CATALOG_SYNC** | `FORBIDDEN` in command policy | N/A | `stocks` (instrument catalog) | Not on daily path | N/A | N/A | Manual-admin only; never seen in `pipeline_stage_runs` |
| – | **HISTORICAL_EXCHANGE_BACKFILL** | Manual `ENABLED` (`MARKET_DATA_HISTORICAL_EXCHANGE_BACKFILL`) | User-specified date range | `price_ticks`, `latest_prices` | N/A (one-off backfill) | Deterministic idempotency key per date | try/catch + FAILED persisted | None — correctly manual-only |
| – | **MANUAL_VERIFIED_FUNDAMENTALS_IMPORT** | Manual `ENABLED` | Single stock/period | `fundamentals` | N/A | Deterministic idempotency key | try/catch + FAILED persisted | None |
| – | **PIPELINE_RETRY_FAILED_STAGE** | Manual `ENABLED` | Retries last failed stage | Depends on retried stage | N/A | New idempotency key per retry | try/catch + upstream FAILED path | None |
| – | **STOCK_INTEREST_REFRESH** | Manual `ENABLED`; NOT on scheduled chain | batchSize/offset | `stock_interest_snapshots` | NO — not wired into daily scheduled chain | Deterministic idempotency key | try/catch + FAILED persisted | **DEFECT-G: orphaned from scheduled chain** |

---

## 3. DB Snapshot (as of 2026-06-06)

```
pipeline_stage_runs (excluding HISTORICAL_EXCHANGE stages):

stageKey                    | status    | count | latest
CONTEXT_SNAPSHOTS           | COMPLETED | 28    | 2026-06-06 09:54:49
CONTEXT_SNAPSHOTS           | PARTIAL   | 2     | 2026-05-25
DATA_QUALITY                | COMPLETED | 39    | 2026-06-06 09:50:36
DATA_QUALITY                | FAILED    | 12    | 2026-06-02
DATA_QUALITY                | RUNNING   | 2     | 2026-06-05  ← orphan
EARNINGS_INTELLIGENCE_REFRESH| COMPLETED | 1    | 2026-06-06 03:58
EARNINGS_INTELLIGENCE_REFRESH| FAILED    | 2    | 2026-06-02
EARNINGS_INTELLIGENCE_REFRESH| PARTIAL   | 130  | 2026-06-06 09:53  ← high partial rate
MARKET_CONTEXT              | COMPLETED | 30    | 2026-06-06 09:53:45
MARKET_CONTEXT_SNAPSHOT_REFRESH| COMPLETED| 2   | 2026-06-06 09:54:05
MARKET_DATA                 | COMPLETED | 33    | 2026-06-06 09:50:10
MARKET_DATA                 | FAILED    | 22    | 2026-06-02
MARKET_DATA                 | RUNNING   | 7     | 2026-06-05  ← orphan
MARKET_PULSE                | PARTIAL   | 8     | 2026-06-02  ← NEVER COMPLETED
RAW_SIGNALS                 | COMPLETED | 6     | 2026-05-26
RAW_SIGNALS                 | PARTIAL   | 26    | 2026-06-06 09:51  ← high partial rate
RAW_SIGNALS                 | RUNNING   | 3     | 2026-06-05  ← orphan
RESEARCH_PROJECTION         | COMPLETED | 26    | 2026-06-06 09:59:39
RESEARCH_PROJECTION         | FAILED    | 1     | 2026-06-06 03:58  ← recent failure
SECTOR_INTELLIGENCE_REFRESH | PARTIAL   | 12    | 2026-06-06 10:01  ← NEVER COMPLETED
SIGNAL_CALIBRATION          | COMPLETED | 11    | 2026-05-27
SIGNAL_CALIBRATION          | PARTIAL   | 20    | 2026-06-06 09:52  ← high partial rate
SIGNAL_CALIBRATION          | RUNNING   | 1     | 2026-06-04  ← orphan
SIGNAL_POSITION_LEDGER      | FAILED    | 1     | 2026-06-01
SIGNAL_POSITION_LEDGER      | PARTIAL   | 8     | 2026-06-06 10:00
SIGNAL_QUALITY              | COMPLETED | 11    | 2026-05-27
SIGNAL_QUALITY              | PARTIAL   | 17    | 2026-06-06 09:56
SMART_MONEY                 | COMPLETED | 28    | 2026-06-06 09:54
STRATEGY_DECISION           | COMPLETED | 27    | 2026-06-06 09:56
STRATEGY_DECISION           | RUNNING   | 2     | 2026-06-03  ← orphan
TODAY_REVIEW                | PARTIAL   | 24    | 2026-06-06 09:59
TODAY_REVIEW                | RUNNING   | 1     | 2026-06-02  ← orphan
STOCK_INTEREST_REFRESH      | COMPLETED | 245   | 2026-06-02 (never seen post-2026-06-02)
```

**pipeline_runs by triggerType:**
- `scheduled/COMPLETED`: 207, `scheduled/PARTIAL`: 112, `scheduled/FAILED`: 18
- `manual/COMPLETED`: 266, `manual/PARTIAL`: 149
- `startup`: 25 total (last: 2026-05-26)

---

## 4. Prioritized Defect List

### P0 — Full-Universe on Daily Scheduled Path (owner's key constraint violation)

**DEFECT-A: MARKET_CONTEXT runs full universe daily**
- `service.ts:3386` calls `marketContextService.run(region)` which calls `loadContextInstruments()` → loads top-500 instruments by marketCap (constant `SAMPLE_SIZE=500` at `market-context-intelligence.service.ts:30`)
- Same for MARKET_CONTEXT_SNAPSHOT_REFRESH (`runAsOf(region, undefined)` at `service.ts:3421`)
- Both ignore the `changedInstrumentIds` passed in the request
- **Impact:** Full-500 instrument DB scan + price history load on every scheduled run
- **Fix needed:** Pass changed ids to a scoped market-context refresh, OR accept that this stage is inherently full-universe and gate it to manual-admin-only

**DEFECT-B: RESEARCH_PROJECTION runs full universe daily**
- `service.ts:3857` calls `researchHubService.refreshOverview(region, assetType)` — no instrument-id scoping; reads all strategy decisions, signals, market context for region
- **Impact:** Full region sweep on every scheduled run
- **Fix needed:** Accept as full-universe materialization (it's a summary view) and document it, OR rate-gate it to run only if STRATEGY_DECISION had >0 changed instruments

**DEFECT-C: TODAY_REVIEW runs full universe daily**
- `service.ts:3900` calls `todayReviewService.run()` with `skipTradePlanGeneration: true`; this loads `reviewUniverse` (all trusted instruments), all entry/exit candidates for the region — `today-trade-review.service.ts:239–263`
- **Impact:** Full-universe compute; was previously flagged as causing connection-pool exhaustion (task #51)
- **Fix needed:** Accept as full-universe and mark manual-only, OR add a `changedInstrumentIds` gate that skips if upstream reported 0 changed

**DEFECT-E: SECTOR_INTELLIGENCE_REFRESH runs full universe daily**
- `service.ts:3989` calls `marketContextService.refreshSectorSnapshots()` which reads ALL sector index catalog + PriceTick + LatestPrice rows for the region
- DB shows 12 `PARTIAL` runs — **never COMPLETED** even once in the scheduled chain
- **Fix needed:** Accept as full-universe (sector count is small, ~10–20) but investigate why it never completes

### P1 — Persistent Orphans / Stale RUNNING Stages

**DEFECT-ORPHANS:** Multiple stages are stuck in `RUNNING` state from past runs:
- `MARKET_DATA`: 7 RUNNING (latest: 2026-06-05 23:49:40)
- `DATA_QUALITY`: 2 RUNNING (latest: 2026-06-05 22:35:33)
- `RAW_SIGNALS`: 3 RUNNING (latest: 2026-06-05 23:52:08)
- `SIGNAL_CALIBRATION`: 1 RUNNING (latest: 2026-06-04)
- `STRATEGY_DECISION`: 2 RUNNING (latest: 2026-06-03)
- `TODAY_REVIEW`: 1 RUNNING (latest: 2026-06-02)

These are stale leases that will auto-expire after `DEFAULT_LEASE_MS` (10 min) but the rows remain as RUNNING permanently (no cleanup job). `findActiveRun()` should filter them out since they are past stale threshold, but they clutter `pipeline_stage_runs`.

### P1 — MARKET_PULSE Never Completed

**DEFECT-1: MARKET_PULSE stage has 0 COMPLETED rows; all 8 are PARTIAL**
- The `MARKET_PULSE_REFRESH` command is `ENABLED` (manual) but the scheduled path via `EodIngestScheduler` at 19:00 IST does NOT write a `pipeline_stage_runs` record — it calls `MarketPulseSnapshotService.refreshSnapshot()` directly
- The 8 PARTIAL rows come from earlier manual command attempts, all partial
- `market_pulse_snapshots` has only 3 rows
- **Fix needed:** Either wire `MARKET_PULSE_REFRESH` into the scheduled chain after `MARKET_DATA` completes, or investigate why the manual command always returns PARTIAL

### P1 — High PARTIAL Rate on RAW_SIGNALS and SIGNAL_CALIBRATION

**DEFECT-3: RAW_SIGNALS 26 PARTIAL vs 6 COMPLETED**
- All recent (2026-06-06) runs are PARTIAL. The scheduled chain continues from PARTIAL (code: `status === 'COMPLETED' || (status === 'PARTIAL' && completedStage.succeededCount > 0) || status === 'SKIPPED'`) but PARTIAL typically means some instruments had DQ-excluded or missing signals
- Root cause needs investigation: likely many instruments are failing DQ gates or have no signals

**DEFECT-4: EARNINGS_INTELLIGENCE_REFRESH 130 PARTIAL vs 1 COMPLETED**
- Almost every run is PARTIAL (130/131 = 99.2% PARTIAL)
- The one COMPLETED is from 2026-06-06 03:58 (manual admin run)
- All scheduled runs since at least mid-May have been PARTIAL
- Root cause: `EarningsIntelligenceService.refreshSnapshots()` reports partial when some instruments lack earnings data — likely by design (most stocks won't have upcoming earnings), but the stage should perhaps use `SKIPPED` semantics for no-earnings instruments rather than `PARTIAL`

### P1 — EodIngestScheduler Not Wired to Pipeline Ledger

**DEFECT-1b: EodIngestScheduler Market Pulse and Research Hub snapshots fire independently**
- 19:00 IST: `MarketPulseSnapshotService.refreshSnapshot()` fires from `EodIngestScheduler` — writes `market_pulse_snapshots` but does NOT create a `pipeline_stage_runs` record → invisible to Pipeline Ops
- 19:10 IST: `ResearchHubService.refreshOverview()` fires — similar issue
- Also: both these jobs and the pipeline chain's RESEARCH_PROJECTION stage call `refreshOverview()` on the same day → **double execution** (DEFECT-2)

### P2 — STOCK_INTEREST_REFRESH Orphaned from Scheduled Chain

**DEFECT-G: STOCK_INTEREST_REFRESH is not in the scheduled downstream chain**
- Command policy: `ENABLED` (manual only)
- `SCHEDULED_DOWNSTREAM_STAGE_KEYS` array at `service.ts:74–89` does NOT include `STOCK_INTEREST_REFRESH`
- DB shows 245 `COMPLETED` rows (all from manual runs up to 2026-06-02); **no runs since 2026-06-02**
- Stock interest snapshots (`stock_interest_snapshots`: 6710 rows) are only refreshed via manual Pipeline Ops trigger
- **Fix needed:** Wire into the scheduled downstream chain after SIGNAL_POSITION_LEDGER, or add a daily scheduled trigger

### P2 — SIGNAL_POSITION_LEDGER Single-Batch Problem

**DEFECT-D: SIGNAL_POSITION_LEDGER at offset=0 only**
- `service.ts:3946`: `signalPositionLedgerService.refreshActiveRows({ limit: normalizedBatchSize, offset: 0 }, { force: true, wait: true })`
- Always starts at offset 0; if there are more active ledger entries than `normalizedBatchSize`, tail entries are not refreshed in one scheduled run
- However, `force: true, wait: true` likely means the service drains all active rows internally — needs verification against `SignalPositionLedgerService` implementation
- DB shows 8 `PARTIAL` and 0 `COMPLETED` in the scheduled chain

### P2 — CATALOG_SYNC (MARKET_DATA_CATALOG_SYNC) Never on Daily Path

**DEFECT-6: CATALOG_SYNC is FORBIDDEN** — No `pipeline_stage_runs` rows with stageKey `CATALOG_SYNC` or `MARKET_DATA_CATALOG_SYNC` exist. The instrument catalog (stocks table: underlying `syncScheduledRegion` uses `listActiveStockSyncTasks` from the catalog) never gets a refresh triggered from the pipeline. New instruments added to NSE will not appear until a manual admin action.

### P3 — BACKTEST_PROOF Not Wired

**DEFECT-F: BACKTEST_PROOF is FORBIDDEN** in command policy with reason "Backtesting proof execution is out of scope for this first command slice." No scheduled or automated path. Backtest runs must be manually triggered from the backtest UI. No rows exist in `pipeline_stage_runs` for `BACKTEST_PROOF`. This is by design (documented in `pipeline-orchestration.md`) but means backtest freshness is entirely user-driven.

---

## 5. Dependency Order

The actual scheduled chain order is:

```
MARKET_DATA (1)
  └─ DATA_QUALITY (2)
       └─ RAW_SIGNALS (3)
            └─ SIGNAL_CALIBRATION (4)
                 └─ EARNINGS_INTELLIGENCE_REFRESH (5)
                      └─ MARKET_CONTEXT (6)
                           └─ MARKET_CONTEXT_SNAPSHOT_REFRESH (6b)
                                └─ SMART_MONEY (7)
                                     └─ CONTEXT_SNAPSHOTS (8)
                                          └─ SIGNAL_QUALITY (9)
                                               └─ STRATEGY_DECISION (10)
                                                    └─ RESEARCH_PROJECTION (11) [full-universe]
                                                         └─ TODAY_REVIEW (12) [full-universe]
                                                              └─ SIGNAL_POSITION_LEDGER (13)
                                                                   └─ SECTOR_INTELLIGENCE_REFRESH (14) [full-universe]
```

**Order assessment:** Correct — market data precedes DQ, signals, calibration, context, and downstream. MARKET_CONTEXT correctly precedes SMART_MONEY and CONTEXT_SNAPSHOTS. STRATEGY_DECISION correctly follows SIGNAL_QUALITY.

**Problem:** Stages 6, 11, 12, 14 are full-universe operations embedded in the incremental chain. They defeat the incremental-only guarantee for those stages even when only a small changed set is being processed.

---

## 6. Key Files

| File | Role |
|------|------|
| `backend/src/modules/pipeline-orchestration/pipeline-orchestration.service.ts` | Full chain orchestration (257KB); `runScheduledDataQualityStage` → `runScheduledRawSignalsStage` → `runScheduledSignalCalibrationStage` → `runScheduledEarningsIntelligenceStage` → `runScheduledMarketContextStage` → ... |
| `backend/src/modules/pipeline-orchestration/pipeline-orchestration.types.ts` | All type definitions including `PipelineCommandKey`, `PipelineCommandRunMode` |
| `backend/src/modules/market-data-foundation/market-data-foundation.scheduler.ts` | `MarketDataFoundationScheduler`; `readMarketDataSchedulerConfig()` |
| `backend/src/modules/market-context-intelligence/eod-ingest.scheduler.ts` | `EodIngestScheduler`; 5 daily jobs |
| `backend/src/server.ts` | Startup wiring of both schedulers |
| `backend/.env` | `MARKET_DATA_SCHEDULER_INTERVAL_MINUTES=15` (dead — clamped to 1440 by code) |

---

## 7. Summary of Defects by Priority

| ID | Priority | Description | Code location |
|----|----------|-------------|---------------|
| DEFECT-A | P0 | MARKET_CONTEXT + MARKET_CONTEXT_SNAPSHOT_REFRESH run full-500-instrument universe on daily scheduled path | `service.ts:3386`, `service.ts:3421`; `market-context-intelligence.service.ts:30` |
| DEFECT-B | P0 | RESEARCH_PROJECTION runs full region universe daily | `service.ts:3857`; `research-hub.service.ts:119` |
| DEFECT-C | P0 | TODAY_REVIEW runs full trusted-review universe daily | `service.ts:3900`; `today-trade-review.service.ts:239` |
| DEFECT-E | P0 | SECTOR_INTELLIGENCE_REFRESH full-universe + never COMPLETED in scheduled chain | `service.ts:3989`; DB: 12 PARTIAL/0 COMPLETED |
| DEFECT-ORPHANS | P1 | 16 stale RUNNING stage rows from 2026-06-02 to 06-05 (no cleanup) | DB: pipeline_stage_runs |
| DEFECT-1 | P1 | MARKET_PULSE never COMPLETED; EodIngestScheduler fires without ledger; 8 PARTIAL | `eod-ingest.scheduler.ts:114`; DB: MARKET_PULSE all PARTIAL |
| DEFECT-2 | P1 | Research Hub snapshot double-execution: EodIngestScheduler (19:10 IST) + pipeline RESEARCH_PROJECTION on same day | `eod-ingest.scheduler.ts:124`; `service.ts:3848` |
| DEFECT-3 | P1 | RAW_SIGNALS: 26 PARTIAL vs 6 COMPLETED (81% partial rate) | DB |
| DEFECT-4 | P1 | EARNINGS_INTELLIGENCE_REFRESH: 130 PARTIAL vs 1 COMPLETED (99% partial rate) | DB; `service.ts:4016` |
| DEFECT-5 | P2 | `.env` `MARKET_DATA_SCHEDULER_INTERVAL_MINUTES=15` is dead config; effective=1440 | `market-data-foundation.scheduler.ts:334` |
| DEFECT-D | P2 | SIGNAL_POSITION_LEDGER always at offset=0; may miss tail entries | `service.ts:3946` |
| DEFECT-G | P2 | STOCK_INTEREST_REFRESH not in scheduled chain; stale since 2026-06-02 | `service.ts:74–89`; DB: last run 2026-06-02 |
| DEFECT-F | P3 | BACKTEST_PROOF not wired to any scheduled path | `service.ts:147`; by design but worth documenting |
| DEFECT-6 | P3 | CATALOG_SYNC FORBIDDEN; new NSE instruments never auto-added | `service.ts:133–135` |
