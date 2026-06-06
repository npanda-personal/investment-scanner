# AUDIT-3: Screen Read-Path Endpoint Matrix
**Date:** 2026-06-06  
**Auditor:** Claude Sonnet 4.6 (read-only pass)  
**Principle:** Every trader-facing GET must return pre-persisted rows. No calculations, no multi-table aggregations, no price-history loops, no live generation on GET.

---

## Legend

| Classification | Meaning |
|---|---|
| **PERSISTED-READ** | Returns rows from a persisted snapshot/results table with light shaping only. Compliant. |
| **RUNTIME-COMPUTE** | On GET, recomputes derived values — regime/breadth/RS/scores, loops over universe, fetches price history, runs decision logic. Violation. |
| **HEAVY** | Large scans, N+1 queries, full-universe loops, unbounded result sets, multi-table aggregations with no persisted intermediary. Perf offender. |
| **GET-TRIGGERS-GENERATION** | GET causes a write / full pipeline run — hard violation. |

---

## ENDPOINT MATRIX
### Ranked worst-first (heaviest runtime-compute / slowest at top)

---

### RANK 1 — RUNTIME-COMPUTE + HEAVY + GET-TRIGGERS-GENERATION (critical)

| Endpoint | Controller / Service | File : Line | Classification | What it computes at runtime | Should be precomputed into |
|---|---|---|---|---|---|
| `GET /api/v1/market-context/regime` | `MarketContextIntelligenceController.regime` → `MarketContextIntelligenceService.regime` → `service.summary()` | `market-context-intelligence.service.ts:331–334` then `service.summary()` at `:143–149` | **RUNTIME-COMPUTE + GET-TRIGGERS-GENERATION** | `summary()` falls back to `this.run()` when no snapshot exists. `run()` loads 500-instrument universe, fetches 260 bars of price history per instrument (500 × listPricesByInstrumentId), computes SMA50/SMA200/returns/sector ranks/regime score. **On GET this triggers a full pipeline run if no snapshot is persisted.** | `MarketContextSnapshot` (already being populated by scheduled pipeline; the fallback `run()` call in `summary()` is the violation — it must be removed and return 404/empty instead) |
| `GET /api/v1/market-context/sectors` | `controller.sectors` → `service.sectors()` → `service.summary()` | `market-context-intelligence.service.ts:336–339` | same as above | Same cascade — triggers full regime + breadth + sector recompute if no snapshot | same |
| `GET /api/v1/market-context/breadth` | `controller.breadth` → `service.breadth()` → `service.summary()` | `market-context-intelligence.service.ts:341–344` | same as above | Same | same |
| `GET /api/v1/market-context/countries` | `controller.countries` → `service.countries()` → `service.summary()` | `market-context-intelligence.service.ts:346–349` | same as above | Same | same |

**Root cause:** `MarketContextIntelligenceService.summary()` (`:143–149`) has a fallback that calls `this.run(region)` whenever no persisted snapshot is found. This means ANY of the four deprecated GET endpoints (`/regime`, `/sectors`, `/breadth`, `/countries`, `/macro`) can silently trigger a full 500-stock × 260-bar × 1 index-price bulk computation on every page load when the daily snapshot is missing.

---

### RANK 2 — RUNTIME-COMPUTE + HEAVY (workbench per-instrument)

| Endpoint | Controller / Service | File : Line | Classification | What it computes at runtime | Should be precomputed into |
|---|---|---|---|---|---|
| `GET /api/v1/research/stocks/:id/workbench` | `StockResearchWorkbenchController.workbench` → `StockResearchWorkbenchService.workbench()` | `stock-research-workbench.service.ts:94–169` | **RUNTIME-COMPUTE + HEAVY** | (1) Fetches up to **5000 price bars** for the instrument; (2) fetches 5000 bars × up to 10 sector peers (N+1: per-peer `listPricesByInstrumentId(peer.id, 5000)`); (3) computes max-drawdown, CAGR(3y), volatility, returns (1D/1W/1M/YTD/1Y) in-memory; (4) fetches Nifty-50 prices for relative-strength; (5) computes relative-strength percentile ranking. This is a `O(N_peers × 5000_bars)` computation on every render. | `WorkbenchSnapshot` table keyed by `(instrumentId, range)` persisted nightly by a pipeline. Only the `signalEvidence` section (already persisted-read) would remain live. |
| `GET /api/v1/research/stocks/:id/performance` | `StockResearchWorkbenchController.performance` → `service.performance()` | `stock-research-workbench.service.ts:~350+` | **RUNTIME-COMPUTE** | Fetches price history and computes `return_1d/1W/1M/YTD/1Y/cagr_3y/maxDrawdown/volatility` live | `PerformanceSnapshot` persisted daily |
| `GET /api/v1/research/stocks/:id/relative-strength` | `StockResearchWorkbenchController.relativeStrength` → `service.relativeStrength()` | `stock-research-workbench.service.ts` | **RUNTIME-COMPUTE** | Fetches stock price history + Nifty-50 prices → computes RS | `RelativeStrengthSnapshot` persisted daily |
| `GET /api/v1/research/stocks/:id/peers` | `StockResearchWorkbenchController.peers` → `service.peers()` | `stock-research-workbench.service.ts:298–358` | **RUNTIME-COMPUTE + HEAVY** | Issues `list()` for sector/industry peers, then fetches `latest + fundamentals + 5000-bar price history` per peer in a `Promise.all` loop (up to 10 peers × 3 queries each = 30 DB round-trips); computes return metrics in-memory for each | `PeerComparisonSnapshot` persisted daily |

---

### RANK 3 — RUNTIME-COMPUTE (signals/top enrichSignals — N+1 price reads)

| Endpoint | Controller / Service | File : Line | Classification | What it computes at runtime | Should be precomputed into |
|---|---|---|---|---|---|
| `GET /api/v1/signals/top` | `SignalGenerationEngineController.top` → `service.topSignals()` → `service.enrichSignals()` | `signal-generation-engine.service.ts:255–275` (topSignals), `service.ts:795–919` (enrichSignals) | **RUNTIME-COMPUTE** | `enrichSignals()`: batch-fetches latest prices + prev-close window (2 bulk queries for live signals); when `includeStrategyContext=true` also fetches **500-bar price history per signal** via `listPricesByInstrumentId(signal.instrument_id, 500)` (line `:902`) to run `attachStrategyMatches`. Computes `dailyChange`, `dailyChangePercent`, `rsPercentile` in-memory. | Strategy-match results should be pre-computed and persisted on signal generation. `enrichSignals` should become a pure DB join on pre-persisted strategy-match rows. |
| `GET /api/v1/signals/screener` | `controller.screener` → `service.screener()` | `signal-generation-engine.service.ts:277–290` | **RUNTIME-COMPUTE** | Same `enrichSignals` path; also calls `repository.screener` (post-query rs-percentile computation in-memory over the result set) | Same as above |
| `GET /api/v1/signals/:instrumentId` | `controller.latestForInstrument` → `service.latestPersistedForInstruments()` + `enrichSignal()` | `signal-generation-engine.service.ts:300–304` | **RUNTIME-COMPUTE** | Calls `enrichSignal()` → `enrichSignals()` which fetches 500-bar price history if `includeStrategyContext` | Signal enrichment (live price, strategy matches) should be pre-joined at write time |
| `GET /api/v1/signals/exit-candidates` | `controller.exitCandidates` → `service.exitCandidates()` | `signal-generation-engine.service.ts:~320+` | **RUNTIME-COMPUTE** | Same `enrichSignals` path as topSignals | Same |
| `GET /api/v1/signals/lifecycle` | `controller.lifecycle` → `service.lifecycleSignals()` | `signal-generation-engine.service.ts:~320+` | **RUNTIME-COMPUTE** | Same | Same |

---

### RANK 4 — RUNTIME-COMPUTE (research-hub/overview live compute when no cache)

| Endpoint | Controller / Service | File : Line | Classification | What it computes at runtime | Should be precomputed into |
|---|---|---|---|---|---|
| `GET /api/v1/research/overview` | `ResearchHubController.overview` → `ResearchHubService.overview()` | `research-hub.service.ts:69–116` | **RUNTIME-COMPUTE (conditional)** | When no cache: calls `buildOverview()` (`:127–266`) which fans out to 7 downstream services: `strategyService.marketGate`, `latestPersistedMarketContext`, `fetchStrategyDecisionProofPool`, `strategyService.exits`, `fetchShortReviewCandidates`, `signalService.funnelDiagnostics`, `smartMoneyService.top`. Even the cached path re-runs `buildWhatChangedFromStoredSnapshots` + `buildActionability` + 3 extra service calls on every GET. | Full `ResearchOverview` (including whatChanged diff and actionability) should be pre-materialized as a single snapshot by a pipeline; the GET should be a one-row fetch from `pipelineRun` table. The current live `buildWhatChanged` / `buildActionability` re-invocation on every cached GET is a soft violation. |

---

### RANK 5 — RUNTIME-COMPUTE (instrument-context relative-strength computation)

| Endpoint | Controller / Service | File : Line | Classification | What it computes at runtime | Should be precomputed into |
|---|---|---|---|---|---|
| `GET /api/v1/market-intelligence/instrument-context/:id` | `MarketIntelligenceController.instrumentContext` → `assembleInstrumentContext()` | `instrument-context.service.ts:349–379` | **RUNTIME-COMPUTE** | `loadRelativeStrength()` at `:177–251`: fetches 64 price bars for the stock AND 64 bars for ^NSEI from `price_ticks`, then computes `stockReturn63d`, `benchmarkReturn63d`, `relativeReturn63d` in memory. All other fields read from persisted tables (good). The RS computation is the violation. | `InstrumentContextSnapshot` table persisted nightly with pre-computed `relativeReturn63d`; or add `relativeStrength` as a persisted column to `SignalResult` |

---

### RANK 6 — HEAVY (market-data movers/scans — large window SQL aggregations)

| Endpoint | Controller / Service | File : Line | Classification | What it computes at runtime | Should be precomputed into |
|---|---|---|---|---|---|
| `GET /api/v1/market-data/movers` | `MarketDataFoundationController.marketMovers` → `service.marketMovers()` | `market-data-foundation.service.ts:963–1010` | **HEAVY** | Issues `repository.marketMoversForRange()` per requested range (up to 4 ranges = 4 separate SQL window-function queries over price_ticks for the full IN/STOCK scope). Each query scans the full price_ticks table for the requested lookback window. Also calls `latestDataTimestamp()`. | `MarketMoversSnapshot` table persisted after each daily EOD import (top-N gainers/losers by range, pre-ranked) |
| `GET /api/v1/market-data/market-map` | `controller.marketMap` → `service.marketMap()` | `market-data-foundation.service.ts:1012–1090` | **HEAVY** | Same `marketMoversForRange` SQL scan + sector grouping in-memory | Same `MarketMoversSnapshot` or a dedicated `MarketMapSnapshot` |
| `GET /api/v1/market-data/scans/52w-high` | `controller.marketScan52wHigh` → `service.marketScan52w()` | `market-data-foundation.service.ts:15007–15057` | **HEAVY** | `repository.scan52wProximity()`: SQL window function computing `MAX(adjustedClose)/MIN(adjustedClose)` over 365 calendar days of price_ticks for the full IN/STOCK universe on every request | `MarketScan52wSnapshot` persisted after EOD import |
| `GET /api/v1/market-data/scans/52w-low` | Same method, `scanType='52w-low'` | same | **HEAVY** | Same SQL scan | Same |
| `GET /api/v1/market-data/scans/delivery-spike` | `controller.marketScanDeliverySpike` → `service.marketScanDeliverySpike()` | `market-data-foundation.service.ts:15059–15108` | **HEAVY** | `repository.scanDeliverySpike()`: scans all delivery-pct rows for lookbackBars to compute ratio vs rolling avg | `DeliverySpikeSnapshot` persisted daily |
| `GET /api/v1/market-data/scans/volume-spike` | `controller.marketScanVolumeSpike` → `service.marketScanVolumeSpike()` | `market-data-foundation.service.ts:15109–15162` | **HEAVY** | Same pattern — rolling average volume ratio computed in SQL over raw ticks | `VolumeSpikeSnapshot` persisted daily |
| `GET /api/v1/market-data/screener` | `controller.screener` (MDF) → `service.screener()` | `market-data-foundation.service.ts:15163–15230` | **HEAVY** | `repository.screener()` multi-table JOIN across stocks + latest_prices + signal_results + fno_ban_list; post-query rs-percentile ranking in a nested sort loop (`O(N²)` inside map). | Pre-compute screener result into a `ScreenerSnapshot` after each EOD + signal-generation run |

---

### RANK 7 — RUNTIME-COMPUTE (market-context/summary legacy fallback)

| Endpoint | Controller / Service | File : Line | Classification | What it computes at runtime | Should be precomputed into |
|---|---|---|---|---|---|
| `GET /api/v1/market-context/summary` | `MarketContextIntelligenceController.summary` → `service.latestPersistedSummary()` | `market-context-intelligence.controller.ts:16–41` | **PERSISTED-READ** (fixed) | No longer falls back to `run()` — the controller now calls `latestPersistedSummary()` which returns null safely. GOOD. | — |
| `GET /api/v1/market-context/persisted-summary` | `controller.persistedSummary` → `service.latestPersistedSummary()` | `market-context-intelligence.controller.ts:43–65` | **PERSISTED-READ** | Simple `latestPersistedSnapshot` DB read | — |
| `GET /api/v1/market-context/breadth-internals` | `controller.breadthInternals` → `service.breadthInternals()` | `market-context-intelligence.service.ts:846–899` | **PERSISTED-READ** | Reads `marketContextSnapshot` rows for the time series, computes delta/divergence from already-fetched rows (pure in-memory, O(rows)) — acceptable lightweight shaping | — |

---

### RANK 8 — PERSISTED-READ with minor runtime shaping

| Endpoint | Controller / Service | File : Line | Classification | Notes |
|---|---|---|---|---|
| `GET /api/v1/market-context/capital-posture` | `controller.capitalPosture` → `CapitalPostureService.capitalPosture()` | `capital-posture.service.ts:40–76` | **PERSISTED-READ** | Reads 2 persisted snapshots (`MarketContextSnapshot` + `MarketPulseSnapshot`), derives posture via pure mapping logic. No price fetches. Good. |
| `GET /api/v1/market-context/fii-dii` | `controller.fiiDiiActivity` → `getLatestFiiDiiActivity()` | `market-context-intelligence.controller.ts:125–129` | **PERSISTED-READ** | Simple `fii_dii_snapshots` read |
| `GET /api/v1/market-context/bulk-block-deals` | `controller.bulkBlockDeals` → `getLatestBulkBlockDeals()` | `market-context-intelligence.controller.ts:139–143` | **PERSISTED-READ** | Simple `bulk_block_deals` read |
| `GET /api/v1/market-context/institutional-activity` | `controller.institutionalActivity` → `getInstitutionalActivity()` | `institutional-activity.service.ts:150–320` | **PERSISTED-READ** | Composes 4 persisted reads in parallel, minimal in-memory shaping (sort top-5 by notional). Good. |
| `GET /api/v1/market-intelligence/sectors` | `controller.sectorSnapshots` → `service.latestSectorIntelligenceSnapshot()` | `market-context-intelligence.service.ts:264–295` | **PERSISTED-READ** | Reads from `SectorSnapshot` table |
| `GET /api/v1/market-intelligence/sector-rotation` | `MarketIntelligenceController.sectorRotation` → same | `market-intelligence.controller.ts:108–169` | **PERSISTED-READ** | Reads `SectorSnapshot`, derives `rotationQuadrant` in-memory (trivial enum mapping, no price fetches) |
| `GET /api/v1/market-intelligence/sector-constituents` | `controller.sectorConstituents` → `SectorConstituentsService.constituentsForSector()` | `sector-constituents.service.ts:17–70` | **PERSISTED-READ** | Reads catalog rows + latest prices (no price-history fetch) |
| `GET /api/v1/market-intelligence/event-feed` | `controller.eventFeed` → `getEventFeed()` | `event-feed.service.ts` | **PERSISTED-READ** | 4 raw SQL reads from persisted tables (bulk_block_deals, fno_ban_list, price_ticks for breakouts, fii_dii_snapshots). The 52w breakout query scans `price_ticks` but is bounded by the `days` window. Mild. |
| `GET /api/v1/market-intelligence/index-constituents` | `controller.indexConstituents` → `IndexConstituentsService.constituentsForIndex()` | `index-constituents.service.ts:18–88` | **PERSISTED-READ** | Reads curated symbol list → batch DB lookup for catalog + latest_price + signal. In-memory breadth count. Good. |
| `GET /api/v1/market-intelligence/instrument-context/:id` | as above | `instrument-context.service.ts:349–379` | **RUNTIME-COMPUTE** (partial) | See Rank 5 — RS calc is the only violation; remaining fields are persisted reads |
| `GET /api/v1/market-intelligence/stock-interest` | `controller.stockInterest` → `StockInterestSnapshotService.latestSnapshot()` | `stock-interest-snapshot.service.ts` | **PERSISTED-READ** | Reads from persisted `StockInterestSnapshot` |
| `GET /api/v1/market-intelligence/earnings` | `EarningsIntelligenceController.latest` → `service.latest()` | `earnings-intelligence.service.ts` | **PERSISTED-READ** | Reads from persisted `EarningsIntelligenceSnapshot` table |
| `GET /api/v1/market-intelligence/market-pulse` | `controller.marketPulse` → `MarketPulseSnapshotService.latestSnapshot()` | `market-pulse-snapshot.service.ts` | **PERSISTED-READ** | Reads from `MarketPulseSnapshot` |
| `GET /api/v1/market-intelligence/market-pulse/history` | `controller.marketPulseHistory` | same | **PERSISTED-READ** | Bounded time-series read |
| `GET /api/v1/today-review/latest` | `TodayTradeReviewController.latest` → `service.latest()` → `repository.latest()` | `today-trade-review.service.ts:188–192` | **PERSISTED-READ** | Reads persisted `TodayReviewRun` + candidates |
| `GET /api/v1/today-review/runs` | `controller.runs` → `service.runs()` | `today-trade-review.service.ts:194–210` | **PERSISTED-READ** | Paginated list of persisted runs |
| `GET /api/v1/today-review/runs/:id` | `controller.runById` → `service.runById()` | `today-trade-review.service.ts:212–215` | **PERSISTED-READ** | Single persisted run read |
| `GET /api/v1/today-review/candidates/:id` | `controller.candidate` → `service.candidate()` | `today-trade-review.service.ts:217–219` | **PERSISTED-READ** | Single candidate read |
| `GET /api/v1/signals/quality/dashboard` | `SignalQualityLabController.dashboard` → `service.dashboard()` | `signal-quality-lab.service.ts:99–169` | **PERSISTED-READ** (primary path) | Takes the `tryPersistedDashboard()` fast path from persisted `SignalOutcome` rows. Falls back to live computation only in legacy/test contexts. |
| `GET /api/v1/signals/quality/summary` | `controller.summary` → `service.summary()` | `signal-quality-lab.service.ts:171–179` | **PERSISTED-READ** | Same persisted-path |
| `GET /api/v1/signals/quality/by-type` | `controller.byType` | same | **PERSISTED-READ** | Same |
| `GET /api/v1/signals/quality/by-sector` | `controller.bySector` | same | **PERSISTED-READ** | Same |
| `GET /api/v1/signals/quality/by-regime` | `controller.byRegime` | same | **PERSISTED-READ** | Same |
| `GET /api/v1/signals/quality/by-score` | `controller.byScoreBucket` | same | **PERSISTED-READ** | Same |
| `GET /api/v1/signals/quality/scorecard` | `controller.scorecard` | same | **PERSISTED-READ** | SQL aggregate over `SignalOutcome` table |
| `GET /api/v1/signals/:id/history` | `controller.history` | `signal-quality-lab.service.ts:87–91` | **PERSISTED-READ** | Reads `SignalResult` history |
| `GET /api/v1/signals/:id/outcomes` | `controller.outcomes` | `signal-quality-lab.service.ts:93–97` | **PERSISTED-READ** | Reads persisted `SignalOutcome` rows |
| `GET /api/v1/signals/runs/latest` | `controller.latestRun` | `signal-generation-engine.service.ts` | **PERSISTED-READ** | Repository read of latest run audit |
| `GET /api/v1/smart-money/sectors` | `SmartMoneyIntelligenceController.sectors` | `smart-money-intelligence.service.ts` | **PERSISTED-READ** | Reads persisted `SmartMoneyContextSnapshot` |
| `GET /api/v1/smart-money/top` | `controller.top` | same | **PERSISTED-READ** | Paginated snapshot read |
| `GET /api/v1/smart-money/stocks/:id` | `controller.stock` | same | **PERSISTED-READ** | Single instrument snapshot |
| `GET /api/v1/smart-money/fno-ban` | `controller.fnoBanList` | `fno-ban.service.ts` | **PERSISTED-READ** | Reads `fno_ban_list` |
| `GET /api/v1/backtests/runs` | `BacktestingStrategyLabController.listRuns` | `backtesting-strategy-lab.service.ts` | **PERSISTED-READ** | List of persisted backtest runs |
| `GET /api/v1/backtests/runs/:id` | `controller.getRun` | same | **PERSISTED-READ** | Single run read |
| `GET /api/v1/market-data/movers` | see Rank 6 | — | **HEAVY** | — |
| `GET /api/v1/market-data/review-readiness-summary` | `controller.reviewReadinessSummary` → `service.reviewReadinessSummary()` | `market-data-foundation.service.ts:1460+` | **HEAVY** | Queries trusted universe health + repair plan + live readiness blockers — but reads persisted diagnostic state only, no price computation. Mostly OK but multiple DB queries. | — |

---

## TOP-10 WORST OFFENDERS (summary)

Ranked by severity (runtime compute weight + frequency of screen hits):

### 1. `GET /api/v1/market-context/regime` + `/sectors` + `/breadth` + `/countries`
**Severity: CRITICAL — GET-TRIGGERS-GENERATION**  
File: `market-context-intelligence.service.ts:143–149` (`summary()` fallback)  
`service.summary()` calls `this.run()` when no persisted snapshot exists. `run()` is the full pipeline: loads 500 instruments, fetches 260 bars of adjusted close per instrument (`Promise.all(instruments.map(...)` at `:561–580`), computes SMA50/SMA200/returns for regime + sector ranks + breadth + cap-band breadth. This is a full ~500-instrument × 260-bar fan-out triggered by any trader-facing GET that misses the cache.  
**Fix:** Remove the `this.run()` fallback from `summary()`. Return an explicit "snapshot not ready" response (as `latestPersistedSummary()` already does). These 4 legacy GET routes (`/regime`, `/sectors`, `/breadth`, `/countries`) should be pointed directly to `latestPersistedSummary()` with null-safe handling, same as `summary` and `persisted-summary`.

---

### 2. `GET /api/v1/research/stocks/:id/workbench`
**Severity: HIGH — N+1 price history, in-memory stat computation**  
File: `stock-research-workbench.service.ts:94–169` (`workbench()`), `:298–358` (`peerComparison()`)  
Fetches 5000-bar price history for instrument + up to 10 peers (each with another 5000-bar fetch), plus Nifty-50 price history. Computes CAGR(3y), volatility, max-drawdown, all returns (1D/1W/1M/YTD/1Y), relative-strength in-memory on every request.  
**Fix:** Nightly pipeline persisting `WorkbenchSnapshot(instrumentId, range, snapshotDate)` with all derived metrics. GET becomes a single row fetch.

---

### 3. `GET /api/v1/market-data/scans/52w-high` and `/52w-low`
**Severity: HIGH — full price_ticks window-function scan**  
File: `market-data-foundation.service.ts:15007–15057`  
`repository.scan52wProximity()` issues a SQL query computing `MAX(adjustedClose)` / `MIN(adjustedClose)` over 365 calendar days across the entire in-scope price_ticks universe on every request.  
**Fix:** Persist a `MarketScan52wSnapshot` table after each EOD import. GET reads from that table.

---

### 4. `GET /api/v1/market-data/movers` and `/market-map`
**Severity: HIGH — multi-range SQL aggregations on full price_ticks**  
File: `market-data-foundation.service.ts:963–1090`  
Issues up to 4 separate `marketMoversForRange()` SQL queries (1D, 1W, 1M, 1Y), each scanning price_ticks with window functions for return computation across the full scoped universe.  
**Fix:** Persist `MarketMoversSnapshot(scope, range, snapshotDate, gainers[], losers[])` after EOD import.

---

### 5. `GET /api/v1/signals/top` (with `includeStrategyMatches=true`)
**Severity: HIGH — N per-signal price-history fetch**  
File: `signal-generation-engine.service.ts:902` inside `enrichSignals()`  
When `includeStrategyContext=true` (the default for the signals dashboard), `enrichSignals()` fetches `listPricesByInstrumentId(signal.instrument_id, 500)` for **each signal individually** inside the `Promise.all` map loop. For 50 signals on the dashboard this is 50 × 500-bar queries in one request.  
**Fix:** Pre-compute strategy matches and store them alongside `SignalResult` rows at generation time. `enrichSignals` should do a single JOIN, not per-signal price fetches.

---

### 6. `GET /api/v1/market-data/scans/delivery-spike` and `/volume-spike`
**Severity: MEDIUM-HIGH — rolling avg over raw ticks**  
File: `market-data-foundation.service.ts:15059–15162`  
SQL scans raw `price_ticks` for `lookbackBars` (up to 60) to compute rolling delivery/volume ratios.  
**Fix:** Persist `DeliverySpikeSnapshot` and `VolumeSpikeSnapshot` tables after EOD delivery import.

---

### 7. `GET /api/v1/market-intelligence/instrument-context/:id` (relativeStrength only)
**Severity: MEDIUM — 2 price-tick fetches + return computation per GET**  
File: `instrument-context.service.ts:177–251` (`loadRelativeStrength()`)  
Fetches 64 bars from `price_ticks` for the instrument AND 64 bars for `^NSEI` on every instrument-context load; computes `stockReturn63d`, `benchmarkReturn63d`, `relativeReturn63d`.  
**Fix:** Persist `relativeReturn63d` + `benchmarkReturn63d` into a `InstrumentContextSnapshot` table updated nightly. All other fields in this endpoint already read from persisted tables.

---

### 8. `GET /api/v1/market-data/screener`
**Severity: MEDIUM — multi-table JOIN + O(N²) rs-percentile ranking**  
File: `market-data-foundation.service.ts:15163–15230`  
`repository.screener()` is a multi-table JOIN (stocks + latest_prices + signal_results + fno_ban_list). Post-query `rsPercentile` ranking runs a binary-search sort inside a `.map()` over the result set.  
**Fix:** Screener results should be materialized as `ScreenerSnapshot` after EOD + signal run. The rs-percentile ranking should be pre-applied to persisted `SignalResult.rsPercentile`.

---

### 9. `GET /api/v1/research/overview` (when no cache, or re-computation on cached path)
**Severity: MEDIUM — multi-service fan-out on each GET**  
File: `research-hub.service.ts:69–116` and `:127–266`  
When no PipelineRun cache exists, `buildOverview()` fans out to 7 downstream services. Even on the cached path, every GET re-runs `buildWhatChangedFromStoredSnapshots` + `buildActionability` + 3 service calls (calibration health, today-review latest, trade-plan list). These additional calls on every cached GET are a soft persisted-read violation.  
**Fix:** Fully materialize the `ResearchOverview` DTO (including whatChanged + actionability) at pipeline time; GET returns a single PipelineRun.metadata JSON fetch. Only the "today-review freshness" can legitimately be re-read live.

---

### 10. `GET /api/v1/research/stocks/:id/peers`
**Severity: MEDIUM — up to 30 DB round-trips per request**  
File: `stock-research-workbench.service.ts:298–358` (`peerComparison()`)  
Issues `list()` for sector/industry candidates, then `Promise.all` of `[latestPrice, fundamentals, 5000-bar prices]` for each of up to 10 peers = up to 30 DB queries + in-memory return computation.  
**Fix:** Persist `PeerComparisonSnapshot(instrumentId, range, snapshotDate)` nightly.

---

## GET-TRIGGERS-GENERATION VIOLATIONS

| Endpoint | Trigger path | File:Line |
|---|---|---|
| `GET /market-context/regime` | `service.regime()` → `service.summary()` → `this.run()` if no snapshot | `market-context-intelligence.service.ts:147` |
| `GET /market-context/sectors` | same | same |
| `GET /market-context/breadth` | same | same |
| `GET /market-context/countries` | same | same |

All four share the same root cause: the `summary()` method's fallback at line `:147`. The `controller.summary` and `controller.persistedSummary` paths do NOT have this violation (they call `latestPersistedSummary()` directly).

---

## RECOMMENDED PRECOMPUTE TARGETS

| Target Table | Populated by | Consumed by |
|---|---|---|
| `MarketContextSnapshot` | `market-context pipeline` (already scheduled) | All `/market-context/*` routes — remove `run()` fallback |
| `WorkbenchSnapshot(instrumentId, range)` | Nightly per-instrument pipeline | `GET /research/stocks/:id/workbench`, `/performance`, `/relative-strength` |
| `PeerComparisonSnapshot(instrumentId, range)` | Nightly per-instrument pipeline | `GET /research/stocks/:id/peers` |
| `MarketMoversSnapshot(scope, range)` | After EOD import | `GET /market-data/movers`, `/market-map` |
| `MarketScan52wSnapshot(scope, type)` | After EOD import | `GET /market-data/scans/52w-high`, `/52w-low` |
| `DeliverySpikeSnapshot` | After NSE delivery import | `GET /market-data/scans/delivery-spike` |
| `VolumeSpikeSnapshot` | After EOD import | `GET /market-data/scans/volume-spike` |
| `ScreenerSnapshot` | After EOD + signal-generation | `GET /market-data/screener` |
| `InstrumentContextSnapshot.relativeReturn63d` | Nightly | `GET /market-intelligence/instrument-context/:id` |
| `SignalResult.strategyMatches` (JSON column) | At signal generation time | `enrichSignals()` — eliminate per-signal price fetches |
| `ResearchOverviewSnapshot` | Research-hub pipeline | `GET /research/overview` |
