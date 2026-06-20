# Frontend Admin Recon — Set 1: Operator/Admin Pages
**Re-audit date:** 2026-06-16  
**Method:** API interrogation via authenticated curl (BE :3000) + source-code read of frontend components. Computer-use browser access was unavailable; all data sourced directly from live backend endpoints with the same auth token the frontend uses.

---

## Screen 1 — Market Data Foundation (`/admin/market-data-foundation`)

**Route file:** `frontend/src/features/market-data-foundation/routes.tsx` → path `market-data-foundation`  
**Component:** `MarketDataFoundationPage.tsx`

### Purpose
Admin catalog for all tracked instruments. Three tabs: **Catalog**, **Import & Backfill**, **Data Health**.

### UI Elements (from source)
- Global region selector (IN / US / EU / GLOBAL) drives all tabs.
- **Catalog tab:** paginated instrument table (Symbol, Company, Exchange, Asset Type, F&O Eligible for IN equities, Universe State, Last Price, Data Through). Sort, filter, search controls. Add Instrument button.
- **Import & Backfill tab:** exchange-file import controls (NSE CM, BSE CM, NSE FO, NSE delivery, NSE corporate actions, NSE index EOD), historical backfill run management, adjusted-close recompute. All mutating — skipped per mandate.
- **Data Health tab:** rendered by `MarketDataStatusPanel`. Shows: instrument count chip, latest-data timestamp, data_status badge, review-ready / price-ready / catalog-only chip row, review readiness blockers (lazy, separate fetch ~24s), scheduler status panel, source-file import history.

### API Calls
- `GET /api/market-data-foundation/stocks/` — catalog list (paginated)
- `GET /api/v1/market-data/health` — overall module health
- `GET /api/v1/market-data/universe/health?region=IN&assetType=STOCK` — universe readiness counts
- `GET /api/v1/market-data/review-readiness-summary` — lazy; review blockers
- `GET /api/v1/market-data/scheduler/status` — EOD scheduler next-run / region statuses
- `GET /api/v1/market-data/source-file-imports` — recent import history

### Data (2026-06-16 live)
- `health`: 15,909 instruments, latest data 2026-06-15, status COMPLETE, region GLOBAL
- `universe/health` (IN/STOCK): reviewReady=1,854 | priceReady=1,994 | contextReady=1,854 | catalogOnly=548 | staleOrIncomplete=395
- `review-readiness-summary` (IN/STOCK): blockers: STALE_EOD(51), PRICE_BACKFILL(1,485), PROVIDER_VALIDATION(548), BUSINESS_METADATA(546)
- Scheduler: enabled, interval 15 min, regions IN/US/EU; IN session state=MARKET_CLOSED_NO_SYNC, lastRunAt=2026-06-16T10:43:50Z, nextSuggestedRunAt=2026-06-16T13:00:00Z

### Prior Finding: "Readiness Snapshot all zeros"
**RESOLVED.** Universe health now returns non-zero counts: reviewReady=1,854, priceReady=1,994. The `MarketDataStatusPanel` has independent lazy loading for the slow endpoint. Data is populated and non-zero.

### Gaps / Issues
- `trackedCoverage` field in health endpoint returns `null` — the "Tracked coverage X/Y" chip in the status panel renders nothing for this field (not an error, data not present).
- Review-readiness endpoint takes ~24s per code comment — slow but tolerated via lazy load.
- universeSignoff status is FAIL: blockers PROVIDER_UNKNOWN_REMAINING=548, BUSINESS_METADATA_AUTO_REPAIRABLE=273, PRICE_BACKFILL=1,485. `downstreamAllowed=false`.

---

## Screen 2 — Pipeline Ops (`/admin/pipeline-ops`)

**Route file:** `frontend/src/features/pipeline-ops/routes.tsx` → path `pipeline-ops`  
**Component:** `PipelineOpsPage.tsx` + `PipelineOpsTable.tsx`

### Purpose
Run and monitor the daily market-intelligence pipeline. Shows per-stage status for the latest run plus any active run.

### UI Elements
- Header: "Daily Pipeline Ops" with subtitle directing market-data backfill to Market Data Ops.
- **Run Daily Pipeline** button (POST /api/v1/pipeline/commands, commandKey=PIPELINE_RUN_ALL) — mutating, skipped.
- **Refresh** button.
- **Active only** toggle switch.
- Alert banner: "Last pipeline run finished PARTIAL." (driven by lastRun.status=PARTIAL).
- `PipelineStatusStrip`: shows run ID, status badge, data-through date, timing.
- `PipelineOpsTable`: 20 rows for the last run (IN/STOCK scope). Each row: Module Name | Operation | Order | Status | Data-Through | Count | Duration | Errors (expandable collapsible rows).

### API Calls
- `GET /api/v1/pipeline/status?region=IN&assetType=STOCK&timeframe=1d&pipelineKey=market-intelligence&limit=100`
- `GET /api/v1/pipeline/commands/catalog?region=IN&assetType=STOCK&timeframe=1d&pipelineKey=market-intelligence`

### Data (2026-06-16 live — last run cmqfpka3s000uw59stm2blvia, 2026-06-15T21:11–21:58)
| Stage Key | Order | Status | Notes |
|---|---|---|---|
| MARKET_DATA | 1 | PARTIAL | 1 partial, 0 failed |
| MARKET_SCAN_REFRESH | 1 | COMPLETED | Unmapped Module in UI |
| DATA_QUALITY | 2 | COMPLETED | |
| RAW_SIGNALS | 3 | PARTIAL | |
| SIGNAL_CALIBRATION | 4 | PARTIAL | |
| CONTEXT_SNAPSHOTS | 5 | ABANDONED | "reaped: stale lease / interrupted run" |
| EARNINGS_INTELLIGENCE_REFRESH | 5 | PARTIAL | Unmapped Module in UI |
| MARKET_CONTEXT | 6 | COMPLETED | |
| MARKET_CONTEXT_SNAPSHOT_REFRESH | 6 | COMPLETED | Unmapped Module in UI |
| SIGNAL_QUALITY | 7 | COMPLETED | |
| SMART_MONEY | 8 | COMPLETED | |
| STRATEGY_DECISION | 9 | COMPLETED | |
| RESEARCH_PROJECTION | 11 | COMPLETED | |
| TODAY_REVIEW | 12 | COMPLETED | |
| SIGNAL_POSITION_LEDGER | 13 | COMPLETED | |
| SECTOR_INTELLIGENCE_REFRESH | 14 | COMPLETED | |
| MARKET_PULSE_REFRESH | 15 | COMPLETED | Unmapped Module in UI |
| STOCK_INTEREST_REFRESH | 16 | COMPLETED | |
| WORKBENCH_REFRESH | 17 | COMPLETED | Unmapped Module in UI |
| **SNAPSHOT_ASSEMBLER** | 19 | **FAILED** | Unmapped Module in UI; transaction timeout 7099ms > 5000ms limit in `snapshot-assembler.repository.ts:630` `createMany()` |

### Re-audit Focus: SNAPSHOT_ASSEMBLER stage status
**STILL FAILING.** Same transaction-timeout error as prior finding. Error text: `Transaction API error: Transaction already closed: A query cannot be executed on an expired transaction. The timeout for this transaction was 5000 ms, however 7099 ms passed since the start of the transaction.` Location: `snapshot-assembler.repository.ts:630`. No fix applied.

### Re-audit Focus: WORKBENCH_REFRESH stage status
**NOW COMPLETED.** Prior finding showed it stuck. Current run: WORKBENCH_REFRESH status=COMPLETED.

### Re-audit Focus: 4 "Unmapped Module" stages
**STILL PRESENT — AND MORE.** The 4 previously unmapped stages (MARKET_SCAN_REFRESH, MARKET_CONTEXT_SNAPSHOT_REFRESH, MARKET_PULSE_REFRESH, WORKBENCH_REFRESH) are still not in the `OPERATION_CATALOG` hardcoded list in `PipelineOpsTable.tsx`. Additionally, SNAPSHOT_ASSEMBLER and EARNINGS_INTELLIGENCE_REFRESH are also not in the catalog. Total: **6 stages render as "Unmapped Module"** with source link defaulting to `/pipeline-ops`. The UI still shows correct status/errors for these rows; only the module name and source path are wrong.

OPERATION_CATALOG has entries for: MARKET_DATA, DATA_QUALITY, RAW_SIGNALS, SIGNAL_CALIBRATION, CONTEXT_SNAPSHOTS, MARKET_CONTEXT, MARKET_PULSE, SIGNAL_QUALITY, SMART_MONEY, STRATEGY_DECISION, BACKTEST_PROOF, RESEARCH_PROJECTION, TODAY_REVIEW, SIGNAL_POSITION_LEDGER, SECTOR_INTELLIGENCE_REFRESH, EARNINGS_INTELLIGENCE_REFRESH — wait, EARNINGS_INTELLIGENCE_REFRESH is NOT in the list above. Confirmed: 6 stages fall through to `unknownRows`.

### Gaps / Issues
- SNAPSHOT_ASSEMBLER FAILED — transaction timeout unresolved. Directly causes 0 signals in the Signals page.
- CONTEXT_SNAPSHOTS ABANDONED — stale-lease error persists.
- 6 unmapped stages render "Unmapped Module" in the ops table.
- Destructive controls skipped: "Run Daily Pipeline" button.

---

## Screen 3 — Signal Generation Engine (`/signals`)

**Route file:** `frontend/src/features/signal-generation-engine/routes.tsx` → path `signals`  
**Component:** `SignalsDashboardPage.tsx`

### Purpose
Trader-facing signal dashboard. Persisted-read from `signalResult` table filtered through `isTrustedReadSignal` policy.

### UI Elements
- Tabs: Bullish (N) | Bearish (N) | Neutral (N) | Recent (N) | Momentum | Screener
- Direction count badges in tab labels (suppressed while loading per NR-97 comment)
- Region/scope selector
- `SignalTable`: Symbol, Score, Direction, Signal Types (triggered/negative arrays), Calibrated Score
- `SignalTrackRecordPanel`: per-instrument quality outcome panel (win rates, forward returns)
- Min-score filter, sort controls
- "Generate Signals" button (mutating, skipped)

### API Calls
- `GET /api/v1/signals/top?region=IN&assetType=STOCK&direction=BULLISH&limit=20&minScore=60`
- `GET /api/v1/signals/screener?region=IN&assetType=STOCK`
- `GET /api/v1/signals/runs/latest`
- `GET /api/v1/signals/health`

### Data (2026-06-16 live)
- Signals health: data_status=MISSING, latest_generated_at=null
- Screener directionCounts: BULLISH=0, NEUTRAL=0, BEARISH=0, total=0 (same across all region/scope combinations)
- Latest run (cmqfpnpyg0e3vw59sw73kkqfu): status=COMPLETED, modelVersion=signal-engine-v4, totalCount=12, processedCount=12, generatedCount=0, excludedByDataQuality=5, duration=174ms, 2026-06-15T21:14Z
- Calibration top (separate read): 2,059 records from 2026-06-11 exist in DB

### Re-audit Focus: does the page now show signals?
**NO — still 0/0/0.** Root cause chain:
1. SNAPSHOT_ASSEMBLER FAILED — `dailyInstrumentSnapshot` not written for 2026-06-15.
2. RAW_SIGNALS stage ran PARTIAL, only 12 instruments processed, generatedCount=0.
3. `isTrustedReadSignal` policy (in `signal-read-policy.ts`) requires `auditStatus=CURRENT` + DQ filter applied + eligible + `signalReadinessStatus=READY`. Older rows from 2026-06-11 do not pass this gate.
4. Signal health: data_status=MISSING.

### Re-audit Focus: v4 evidence-model scoring UI
**NOT PRESENT in list/screener views.** `SignalTable` shows `triggered_signals` and `negative_signals` label arrays only — no evidence breakdown columns, no factor-family display, no confidence percentile. The v4 model does produce `boosts`/`penalties` arrays (visible in calibration detail) but no new UI columns have been added to the signal dashboard components for this data.

### Gaps / Issues
- 0 signals surfaced — unchanged from prior audit. Fix path: resolve SNAPSHOT_ASSEMBLER transaction timeout, re-run pipeline to generate fresh signals with CURRENT audit status.
- signal-engine health data_status=MISSING / latest_generated_at=null — stale state.
- v4 evidence model data exists in backend calibration response but not surfaced in the signal list UI.
- "Generate Signals" button is mutating — skipped.

---

## Screen 4 — Signal Quality Lab (`/signals/quality`)

**Route file:** `frontend/src/features/signal-quality-lab/routes.tsx` → path `signals/quality`  
**Component:** `SignalQualityLabPage.tsx`

### Purpose
Operator analytics across historical signal outcomes. Win rates, forward returns, regime/sector breakdowns, noisy-signal detection.

### UI Elements
- Horizon selector: 1D / 5D / 10D / 20D / 60D
- Tabs: Overview | Performance | Noise | Instrument
- MetricCards: Total Signals, Mature Signals, Evaluated, Bullish/Bearish Win Rate, Best/Worst Signal Type, Best/Worst Sector
- RegimeTable: win rate + avg return by RISK_ON / NEUTRAL / RISK_OFF / UNKNOWN
- Performance tab: by-type, by-sector, by-score-bucket tables with winRate + avgForwardReturn
- Scorecard (direction grouping): rows per horizon × direction with winRate, avgReturnPercent, expectancy, profitFactor, avgAlphaPercent
- Instrument tab: per-instrument signal history + outcomes drilldown
- "Recalculate Signal Quality" button (mutating, skipped)

### API Calls
- `GET /api/v1/signals/quality/dashboard`
- `GET /api/v1/signals/quality/summary`
- `GET /api/v1/signals/quality/by-type`
- `GET /api/v1/signals/quality/by-sector`
- `GET /api/v1/signals/quality/by-score`
- `GET /api/v1/signals/quality/by-regime`
- `GET /api/v1/signals/quality/by-data-quality`
- `GET /api/v1/signals/quality/noisy`
- `GET /api/v1/signals/quality/scorecard`
- `GET /api/v1/signals/:instrumentId/history` (instrument tab)
- `GET /api/v1/signals/:instrumentId/outcomes` (instrument tab)

### Data (2026-06-16 live)
- Dashboard: totalSignals=1,713 | matureSignals=583 | evaluatedSignals=583 | evidenceUsability=USABLE (20D) | bullishWinRate=56.5% | bearishWinRate=50.6% | bestType=CONFIRMED_VOLUME_BREAKOUT | worstType=VOLUME_BREAKOUT | bestSector=Basic Materials | worstSector=Utilities
- by-type: all rows show status=INSUFFICIENT_FUTURE_DATA with 0 evaluated outcomes — contradicts dashboard's 583 evaluated. Separate aggregation paths in backend.
- Scorecard: 10 rows (5H × 2D); `avgAlphaPercent` non-null in 2 rows (1D horizon only), null in 8 rows.

### Re-audit Focus: benchmark/alpha now surfaced?
**PARTIALLY.** The `avgAlphaPercent` field is present in the scorecard API response and non-null for 2 of 10 rows (1D horizon). However, no "Alpha" or "Benchmark" column label appears in `SignalQualityLabPage.tsx` source code (grep confirms zero matches). The `avgAlphaPercent` value from the API is carried in the type definitions and scorecard rows but is not explicitly rendered as a labelled metric in the current UI. The prior DB finding of only 12/105K outcomes enriched for alpha computation appears to have increased somewhat (1D horizon rows non-null) but 20D, 5D, 10D, 60D remain null.

### Gaps / Issues
- Alpha/benchmark not rendered as a visible labelled column in the page component.
- by-type inconsistency: dashboard shows 583 evaluated but all by-type rows show 0 evaluated outcomes.
- `avgAlphaPercent` null for 8/10 scorecard rows — benchmark enrichment incomplete.

---

## Screen 5 — Signal Calibration Engine (`/signals/calibration`)

**Route file:** `frontend/src/features/signal-calibration-engine/routes.tsx` → path `signals/calibration`  
**Component:** `SignalCalibrationEnginePage.tsx`

### Purpose
Operator view of calibration model status. Shows per-instrument calibrated scores with boosts/penalties evidence, model configuration, and evidence basis health.

### UI Elements
- Header "Signal Calibration Engine"
- MetricCards: Calibrated Signals, Model Version, Evidence Basis (tone=error when not MEASURED), Evidence Through Date, Next Evaluable Date
- Calibration table: Symbol | Raw Score | Calibrated Score | Delta | Direction | Evidence Status | Evidence Through Date | Boosts/Penalties (expandable row detail)
- Compare instrument drilldown panel
- "Refresh Calibration" button (mutating, skipped)

### API Calls
- `GET /api/v1/signals/calibration/health`
- `GET /api/v1/signals/calibration/model`
- `GET /api/v1/signals/calibration/top?region=IN&assetType=STOCK`

### Data (2026-06-16 live)
- Health: calibratedSignals=10,514 | modelVersion=signal-calibration-v2 | dataStatus=PARTIAL | evidenceStatus=MISSING | evidenceBasis.status=MISSING_SIGNAL_QUALITY_EVIDENCE | calibrationReadiness.status=UNAVAILABLE | confidenceTier=INSUFFICIENT_SAMPLE | authoritativeScore=RAW_SCORE | downstreamInfluence=NONE
- Calibration top (IN/STOCK): 2,059 records, latest generatedAt=2026-06-11T00:43:45Z
- Sample row (ABSLAMC): rawScore=95, calibratedScore=100, delta=11, evidenceStatus=SUFFICIENT at row level; but row-level evidenceBasis.status=MISSING_SIGNAL_QUALITY_EVIDENCE

### Re-audit Focus: Evidence Basis still MISSING_SIGNAL_QUALITY_EVIDENCE?
**YES, UNCHANGED.** Page-level health and per-row calibrationEvidence.evidenceBasis.status both return MISSING_SIGNAL_QUALITY_EVIDENCE. Reason: "Existing persisted calibration rows do not store readiness evidence; refresh calibration to attach source evidence." UI renders "Evidence Basis" MetricCard in error tone (red). The discrepancy between row-level `evidenceStatus=SUFFICIENT` and `evidenceBasis.status=MISSING_SIGNAL_QUALITY_EVIDENCE` is because evidenceStatus reflects the sample size gate (sufficient evaluated outcomes exist) while evidenceBasis reflects whether the stored row carries the quality attachment (it doesn't — rows from 2026-06-11 predate the evidence-attachment schema).

### Gaps / Issues
- evidenceBasis MISSING_SIGNAL_QUALITY_EVIDENCE: unchanged. Will not resolve until a calibration refresh run reattaches evidence.
- calibrationReadiness=UNAVAILABLE / authoritativeScore=RAW_SCORE — calibration not applied downstream.
- Calibration records are 5 days stale (2026-06-11 vs today 2026-06-16).

---

## Screen 6 — Data Quality Engine (`/admin/data-quality`)

**Route file:** `frontend/src/features/data-quality-engine/routes.tsx` → path `data-quality`  
**Component:** `DataQualityEnginePage.tsx`

### Purpose
Operator view of instrument-level data quality. Coverage, signal readiness, liquidity scores, quality tiers (Daily Review / Signal / Backtest / Calibration / Automation).

### UI Elements
- Header "Data Quality Engine"
- `DataQualityPipelineStatusStrip`: pipeline status for DQE stage
- MetricCards: Total Instruments | Good Coverage | Signal Ready | Blocked Or Limited (= notSignalReadyCount)
- View filter tabs: All | Ready | Blocked | Coverage | Liquidity | Backtest
- Instrument table: Symbol | Coverage Status | Signal Readiness | Liquidity | Eligible Tiers | Data Gaps
- Quality tier columns per row: Daily Review | Signal | Backtest | Calibration | Automation
- Instrument detail drawer with full gap/blocker list
- "Evaluate Data Quality" button (mutating, skipped)

### API Calls
- `GET /api/v1/data-quality/summary?region=IN&assetType=STOCK`
- `GET /api/v1/data-quality/instruments?region=IN&assetType=STOCK`
- `GET /api/v1/data-quality/signal-readiness?region=IN&assetType=STOCK`
- `GET /api/v1/data-quality/liquidity?region=IN&assetType=STOCK`
- `GET /api/v1/data-quality/instruments/:instrumentId` (drawer detail)

### Data (2026-06-16 live, IN/STOCK)
- summary: totalInstruments=2,937 | goodCoverage=2,449 | partial=127 | poor=114 | unusable=247 | signalReady=2,372 | notSignalReady (Blocked)=**565** | stalePriceCount=293 | missingSector=820 | missingIndustry=820 | lowLiquidity=455 | latestEvaluationAt=2026-06-15T21:13:09Z | dataStatus=COMPLETE
- GLOBAL: totalInstruments=15,909 | signalReady=4,881 | notSignalReady=5,190

### Re-audit Focus: current decision (was REPAIR_DATA), blocked-instrument count
**DECISION FIELD GONE / CHANGED.** The `data-quality/summary` response no longer contains a `decision` or `eligibilityDecision` field. The DQE page component does not render a "decision" MetricCard — it uses `notSignalReadyCount` for the "Blocked Or Limited" metric. Either the `REPAIR_DATA` field was removed from the API or the prior finding referred to a different endpoint. **Current blocked count: 565 instruments (IN/STOCK).** GLOBAL blocked: 5,190. The page renders this correctly as the "Blocked Or Limited" MetricCard value.

### Gaps / Issues
- No `decision` field present in API — prior finding's REPAIR_DATA state cannot be confirmed or denied; the concept may have been refactored away.
- 820 instruments missing sector/industry — significant quality gap.
- Automation tier is policy-blocked in Phase 0 (hardcoded note in UI copy).

---

## Cross-Cutting Findings

### Console Warning: `No routes matched "/derivatives-intelligence"`
**LIKELY RESOLVED.** Route path in `features/derivatives-intelligence/routes.tsx` is `derivatives` (not `derivatives-intelligence`). Navigation in `navigationMetadata.tsx` links to `/derivatives`. No link to `/derivatives-intelligence` found anywhere in the current codebase. The prior warning was likely caused by a stale nav link or direct URL that has since been corrected.

### Signal Generation 0-signal root cause chain
1. SNAPSHOT_ASSEMBLER FAILED (transaction timeout 7099ms > 5000ms) — `dailyInstrumentSnapshot` table not written 2026-06-15.
2. RAW_SIGNALS stage ran PARTIAL — only 12 instruments processed, generatedCount=0.
3. `isTrustedReadSignal` policy (in `signal-read-policy.ts`) requires `auditStatus=CURRENT` + DQ filter applied + eligible + READY. Older rows from 2026-06-11 do not pass.
4. Signal health: data_status=MISSING.

### Evidence Basis MISSING_SIGNAL_QUALITY_EVIDENCE (Calibration page)
Unchanged from prior audit. Calibration rows generated before evidence-attachment schema change. Fix: run calibration refresh — mutating, skipped.

### Unmapped Pipeline Stages (6 total in ops table)
Stages present in the last run that fall through to the `unknownRows` path and render "Unmapped Module":
1. MARKET_SCAN_REFRESH (order=1, COMPLETED)
2. MARKET_CONTEXT_SNAPSHOT_REFRESH (order=6, COMPLETED)
3. MARKET_PULSE_REFRESH (order=15, COMPLETED)
4. WORKBENCH_REFRESH (order=17, COMPLETED)
5. SNAPSHOT_ASSEMBLER (order=19, FAILED)
6. EARNINGS_INTELLIGENCE_REFRESH (order=5, PARTIAL)

Fix: add these 6 stage keys to `OPERATION_CATALOG` in `PipelineOpsTable.tsx`.

---

## Destructive Controls Identified and Skipped
- "Run Daily Pipeline" (POST /api/v1/pipeline/commands) — Pipeline Ops page
- "Generate Signals" (POST /api/v1/signals/run) — Signals page
- "Refresh Calibration" (POST /api/v1/signals/calibration/run) — Calibration page
- "Evaluate Data Quality" (POST /api/v1/data-quality/evaluate) — DQE page
- All Import & Backfill buttons (POST /api/v1/market-data/exchange-files/...) — MDF import tab
- "Recalculate Signal Quality" (POST /api/v1/signals/quality/recalculate) — Signal Quality Lab
