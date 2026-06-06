# AUDIT-2: Module Persistence Pipeline Audit
**Date:** 2026-06-06  
**Auditor:** Claude Sonnet 4.6  
**Principle:** Market-data is the ONLY module with external communication. Every other module must have its own pipeline that INCREMENTALLY PERSISTS its refined data into its own tables, which the screens then read. No module should compute on-the-fly at screen render.

---

## MODULE MATRIX

| Module | Has Pipeline? | Incremental? | Persists Every Run? | Table(s) | DB Rows / Latest | Read-Path Uses Persisted? | Verdict / Defect |
|--------|--------------|--------------|---------------------|----------|------------------|--------------------------|-----------------|
| signal-generation-engine | YES | YES (delta by generatedDate×instrumentId×modelVersion) | YES — upsert per instrument on every `run()` call | `signal_results`, `signal_generation_runs` | 26 442 rows / 2026-06-06 | YES — `latestSignals()` reads persisted rows; `latestForInstrument()` falls back to live-generate on cache-miss | COMPLIANT. Minor: `latestForInstrument()` triggers live recompute when no persisted row found (service:300-304). |
| signal-calibration-engine | YES | YES (upsert keyed on signalResultId×calibrationModelVersion) | YES | `signal_calibration_results` | 3 313 rows / 2026-06-06 | YES — `top()` reads from repository; `latestForInstrument()` tries persisted first then falls back to `calibrateAndPersist()` | COMPLIANT. Same on-miss fallback pattern as signal-gen. |
| signal-quality-lab | PARTIAL | NO (full recompute on `recalculate`) | PARTIAL — only when `persistOutcomes=true` flag is passed | `signal_outcomes` | 74 260 rows / 2026-06-04 | YES — `dashboard()` and `summary()` serve from persisted `signal_outcomes` first; live fallback when zero rows | PARTIAL DEFECT: `persistOutcomes` flag must be explicit. Dashboard falls back to live computation path if `signal_outcomes` is empty. Read guard at service:106 and service:178. Fix: make `persistOutcomes=true` the default or enforce it in pipeline scheduler. |
| signal-position-ledger | YES | YES (incremental in-memory refresh, then `upsertActiveLedgerRow` per instrument) | PARTIAL — uses in-memory `LedgerRefreshState` during a background refresh; DB write is per-row. If refresh is cancelled/process restarts, only completed rows survive | `signal_position_ledger_entries` (via `pipeline_runs` for metadata) | 39 rows / 2026-06-06 | YES — `listActiveRows()` reads from DB first; auto-triggers background refresh only if DB is empty and snapshot is stale | PARTIAL DEFECT: in-memory state with row-level DB writes means a crash mid-refresh leaves a partial corpus. 39 rows is very low vs universe size. Read path at service:57-84 is correctly persisted-first. |
| market-context-intelligence | YES | YES (snapshot keyed on region×snapshotDate via `saveSnapshot`) | YES | `market_context_snapshots`, `sector_snapshots` | 128 / 2026-06-06 (context); 1 154 / 2026-06-06 (sector) | YES — `summary()` tries `latestSnapshot()` first; only calls `run()` on miss | COMPLIANT. `latestPersistedSummary()` is pure read. `summary()` has a fallback live-generate on cold-start (service:147-148). |
| market-context-intelligence / market-pulse-snapshot | YES | YES (upsert on snapshotDate×region×assetType×timeframe) | YES | `market_pulse_snapshots` | 3 rows / 2026-06-05 | YES — history reads from repository | COMPLIANT. Pulse has very few rows — snapshot has only been run manually a few times. |
| market-context-intelligence / fii-dii | YES (ingestion pipeline) | YES (upsert on trading_date×category) | YES | `fii_dii_snapshots` | 2 rows / 2026-06-05 | YES — event-feed reads directly from table | NOTE: external NSE fetch lives in `fii-dii.service.ts` (line 49, `NSE_FII_DII_URL`). This is an ingestion adapter — correct architecture since fii-dii is part of market-data's external communication surface (dedicated ingest function `ingestFiiDii`). |
| market-context-intelligence / bulk-block-deals | YES (ingestion pipeline) | YES (upsert on trade_date×symbol×client) | YES | `bulk_block_deals` | 115 rows / 2026-06-05 | YES — event-feed reads directly from table | NOTE: external NSE fetch in `bulk-block-deals.service.ts` (line 59, `NSE_LARGE_DEAL_URL`). Same classification as fii-dii — ingestion adapter. |
| smart-money-intelligence (main) | YES | YES (upsert per instrumentId×range via `saveSnapshot`) | YES | `smart_money_context_snapshots` | 105 370 rows / 2026-06-05 | YES — `stockSummary()` tries persisted first (service:190) | COMPLIANT. |
| smart-money-intelligence / fno-ban | YES (ingestion pipeline) | YES (upsert on ban_date×symbol) | YES | `fno_ban_list` | 2 rows / 2026-06-08 | YES — event-feed reads directly | NOTE: external NSE fetch in `fno-ban.service.ts` (line 50, `NSE_BAN_CSV_URL`). Same ingestion-adapter classification. |
| market-intelligence / event-feed | NO PIPELINE (pure read-compose) | N/A | N/A | Reads from: `bulk_block_deals`, `fno_ban_list`, `price_ticks`, `fii_dii_snapshots` | see individual tables | YES — only persisted-read, no computation | COMPLIANT. Service comment at line 1-13 explicitly states "pure persisted-read service — no ingestion, no generation, no writes." |
| market-intelligence / sector-constituents | NO PIPELINE (pure catalog read) | N/A | N/A | Reads from: `stocks` (catalog) | n/a | YES — reads from catalog table | COMPLIANT. No output table needed — the catalog IS the data. |
| market-intelligence / index-constituents | NO PIPELINE (pure catalog read + static symbol list) | N/A | N/A | Reads from: `stocks` catalog + static symbol list (`index-constituents.symbols.ts`) | n/a | YES — reads catalog at query time | COMPLIANT for now. RISK: static symbol list (`MEMBERSHIP_AS_OF` constant) needs periodic update; not a pipeline gap but a staleness risk. |
| market-intelligence / stock-interest-snapshot | YES | YES (upsert per stockId×snapshotDate) | YES | `stock_interest_snapshots` | 6 710 rows / 2026-06-02 | YES — `latestSnapshot()` reads from repository | COMPLIANT. Latest run is 4 days stale (2026-06-02 vs audit date 2026-06-06). |
| today-trade-review | YES | YES (upsert on runDate×region×assetType via `markRunStarted` + per-candidate rows) | YES | `today_review_runs`, `today_review_candidates` | 15 runs, 479 candidates / 2026-06-06 | YES — `latest()` reads from repository (service:190); `run()` is the pipeline trigger | COMPLIANT. `latest()` is pure persisted-read (service:188-192). |
| research-hub | PARTIAL | NO (full recompute on `overview(live=true)`) | YES — saves to `pipeline_runs` table (metadata JSONB blob) | `pipeline_runs` (key: `research-hub-overview`) | 923 pipeline_run rows / 2026-06-06 | YES — `overview()` reads from `pipeline_runs` cache if not `live=true` | PARTIAL DEFECT: pipeline_runs is a generic metadata blob store, not a dedicated research-hub table. `whatChanged` diff is recomputed on every cached read (service:79-112). `actionability` is recomputed live on every cached read (service:84-91). These in-memory recomputes don't violate the principle (they reuse persisted data) but the absence of a dedicated table means no queryable history. |
| strategy-decision-engine | YES | YES (upsert per instrumentId×strategy×generatedAt) | YES | `strategy_decision_results` | 190 578 rows / 2026-06-06 | YES — `latestForInstrument()` reads from `repository.latestForInstrument()` which queries `strategy_decision_results` | COMPLIANT. `evaluate()` generates and then calls `persistDecisionBatch()` (service:237-242). |
| strategy-framework | YES (performance persistence) | YES (upsert per strategyCode×version×timeframe×region) | YES | `strategy_definitions`, `strategy_performance_summaries` | embedded in strategy_definitions and backtest runs | YES — `rankings()` reads from `strategy_performance_summaries` | COMPLIANT. Framework is a computation library, not a screener. Strategy definitions are persisted via `upsertDefinitions`. Performance summaries are persisted via `persistBacktestPerformance`. |
| backtesting-strategy-lab | YES | YES (creates a new run row per execution, does not overwrite previous runs) | YES | `backtest_runs`, `backtest_strategies` | visible in pipeline_runs; `backtest_runs` count not queried directly | YES — `listRuns()` reads from DB; `getRun()` reads from DB | COMPLIANT. Each `run()` call persists a new `BacktestRun` row. Strategy performance is also separately persisted to `strategy_performance_summaries`. |
| earnings-intelligence | YES | YES (upsert per instrumentId×snapshotDate×region×assetType) | YES | `earnings_intelligence_snapshots` | 2 534 rows / 2026-06-05 | YES — `latestSnapshot()` reads from DB; `latestProximityBySymbol()` is pure persisted-read | COMPLIANT. `refreshSnapshots()` is the pipeline entry (service:120). External NSE board-meetings URL is in `earnings-intelligence.nse-board-meetings-source.ts` as a PARSER/MAPPER only — comment at line 20 states "the caller provides the fetch" (caller is presumably market-data-foundation ingestion). This needs verification: if earnings-intelligence calls NSE directly on refresh it is a boundary violation. |
| data-quality-engine | YES | YES (upsert per instrumentId via `upsertEvaluation`) | YES | `data_quality_evaluations`, `data_quality_snapshots` | 3 456 evaluations / 2026-06-06; 12 892 snapshots / 2026-06-05 | YES — all read endpoints call `repository.getLatestEvaluationForInstrument()` or `repository.filterEligibleInstruments()` | COMPLIANT. |
| historical-context-snapshots | YES | YES (upsert per snapshotDate×region, per sector, per country, per instrumentId for smart-money and data-quality) | YES — but each `generate()` call creates/updates exactly the rows for the requested date+scope. | `market_context_snapshots`, `sector_context_snapshots`, `country_context_snapshots`, `smart_money_context_snapshots`, `data_quality_snapshots` | 155 / 2026-06-06 (country); 1 154 / 2026-06-06 (sector); 12 892 / 2026-06-05 (DQ snapshots) | YES — `lookup()` reads from persisted snapshot tables | COMPLIANT. |
| trade-plan-risk-engine | YES | YES (upsert per instrumentId×strategy via `persistWithReadiness`) | YES | `trade_plan_results` | 878 rows / 2026-06-04 | YES — `list()` and `get()` read from repository | COMPLIANT. `persistWithReadiness()` called at service:1630. Latest run 2 days stale. |
| portfolio-intelligence | NO PIPELINE | N/A | N/A | None — computes derived metrics from `portfolio_holdings`, `portfolio_transactions`, market data | none | COMPUTE-ON-READ: `intelligence()` calls `buildIntelligence()` on every request | VIOLATION: Computes portfolio intelligence (health score, red flags, score breakdown, holding classifications) on every GET request. No snapshot table. Since this module reads from the already-persisted portfolio and signal tables it does not access external data, but it does violate the "no compute at render" principle for a non-trivial calculation. |
| ai-investment-copilot | NO PIPELINE | N/A | N/A | None — assembles text from other modules' persisted data | none | COMPUTE-ON-READ: `stockSummary()`, `portfolioSummary()`, `marketBrief()` assemble on every call | PARTIAL VIOLATION: Copilot assembles LLM-free explanations from already-persisted data (signals, decisions, trade plans, market context). No write-side pipeline exists. For the current deterministic (non-LLM) implementation this is acceptable since all sources are persisted. Risk: if LLM summarisation is added without a persistence layer, this becomes a full violation. |
| stock-research-workbench | NO PIPELINE | N/A | N/A | None — reads market data, calibration, signals from other tables | none | COMPUTE-ON-READ: `workbench()` recomputes performance metrics from `price_ticks` on every GET | VIOLATION: `workbench()` (service:94) and `performance()` (service:246) recompute RSI, SMA, drawdown, Sharpe, peer comparison from raw `price_ticks` on every request. Comment at service:124 says "Signal evidence: persisted-read only" but price-action metrics are live computations. No snapshot table exists for workbench output. |

---

## SUMMARY OF FINDINGS

### Modules with NO Persistence Pipeline (Compute-On-Read Violations)

| Module | Defect Severity | Description |
|--------|----------------|-------------|
| **portfolio-intelligence** | HIGH | `intelligence()` computes health score, red flags, holding classifications from portfolio+signal tables on every GET. File: `portfolio-intelligence.service.ts:52-57`. No output table. |
| **stock-research-workbench** | HIGH | `workbench()` / `performance()` recomputes price-action metrics (SMA, RSI, Sharpe, drawdown, peer relative-strength) from raw `price_ticks` on every request. File: `stock-research-workbench.service.ts:94,246`. No output table. |
| **ai-investment-copilot** | MEDIUM | Assembles explanations from persisted data on each call. Acceptable now (deterministic, fast). Risk escalates if LLM path is added. File: `ai-investment-copilot.service.ts:100+`. |

### Modules with Partial-Save / Inconsistency Risk

| Module | Risk | Description |
|--------|------|-------------|
| **signal-quality-lab** | MEDIUM | `persistOutcomes` flag must be explicitly set `true` in the pipeline call. If the scheduler calls `recalculate` without this flag, outcomes are computed but not saved. File: `signal-quality-lab.service.ts:480`. The dashboard has a live-fallback path activated when `signal_outcomes` is empty (service:106-109), meaning a missed pipeline run degrades silently rather than failing visibly. |
| **signal-position-ledger** | MEDIUM | Uses in-memory `LedgerRefreshState` during background refresh with per-row DB writes. A process restart mid-refresh leaves a partial corpus in the DB. 39 rows in `signal_position_ledger_entries` is far below the expected universe size (~1000+ active signals). File: `signal-position-ledger.service.ts:464` (`runIncrementalRefresh`). |
| **research-hub** | LOW | Uses generic `pipeline_runs` JSONB blob rather than a dedicated output table. `whatChanged` and `actionability` are recomputed on every cached read from the stored data (service:79-112). No query-able history per region/date. |

### Modules That Re-Fetch External Data (Boundary Violations)

| Module | Boundary Risk | Details |
|--------|--------------|---------|
| **market-context-intelligence / fii-dii** | YELLOW — ingestion adapter | `fii-dii.service.ts:49` — `NSE_FII_DII_URL` fetches from `https://www.nseindia.com/api/fiidiiTradeReact`. This is an ingestion function (`ingestFiiDii`) that writes to `fii_dii_snapshots`. Correct architecture IF invoked only from a scheduled ingestion job. Risk: if any non-market-data module calls `ingestFiiDii()` directly, it violates the boundary. |
| **market-context-intelligence / bulk-block-deals** | YELLOW — ingestion adapter | `bulk-block-deals.service.ts:59` — `NSE_LARGE_DEAL_URL`. Same classification. |
| **smart-money-intelligence / fno-ban** | YELLOW — ingestion adapter | `fno-ban.service.ts:50` — `NSE_BAN_CSV_URL`. Same classification. |
| **earnings-intelligence** | REQUIRES VERIFICATION | `earnings-intelligence.nse-board-meetings-source.ts:76` — exports `NSE_BOARD_MEETINGS_URL` and a parser. Comment states "the caller provides the fetch." If `refreshSnapshots()` invokes this source directly with a live fetch call it is a boundary violation. If `refreshSnapshots()` only reads from already-persisted fundamentals/price data it is compliant. The service currently reads from `this.repository.loadCalculationInputs()` (service:154), which appears DB-only — likely compliant. |

### Modules Whose Screen Still Recomputes Instead of Reading Snapshot

| Module | Recompute Location | Impact |
|--------|--------------------|--------|
| **stock-research-workbench** | `workbench()` (service:94) — full price metric recompute per request | Every research tab open triggers price_ticks aggregation |
| **portfolio-intelligence** | `buildIntelligence()` (service:70) — on every GET | Portfolio dashboard recomputes holding labels and scores on load |
| **signal-calibration-engine** | `latestForInstrument()` (service:112-119) — on cache-miss triggers `calibrateAndPersist()` | Single-stock view may trigger live recalibration |
| **signal-generation-engine** | `latestForInstrument()` (service:299-304) — on cache-miss triggers `run()` | Single-stock signal view may trigger live signal generation |

---

## KEY FILE REFERENCES

- Signal generation persistence: `backend/src/modules/signal-generation-engine/signal-generation-engine.repository.ts:63` (upsert)
- Signal generation run entry: `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts:356` (`run()`)
- Signal quality lab flag risk: `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts:480` (`recalculate`)
- Signal position ledger partial-save: `backend/src/modules/signal-position-ledger/signal-position-ledger.service.ts:464` (`runIncrementalRefresh`)
- Portfolio intelligence violation: `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts:52` (`intelligence()`)
- Workbench violation: `backend/src/modules/stock-research-workbench/stock-research-workbench.service.ts:94` (`workbench()`)
- Research hub generic blob store: `backend/src/modules/research-hub/research-hub.service.ts:287` (`saveCachedOverview`)
- FII/DII external fetch: `backend/src/modules/market-context-intelligence/fii-dii.service.ts:49`
- Bulk/block deals external fetch: `backend/src/modules/market-context-intelligence/bulk-block-deals.service.ts:59`
- FnO ban external fetch: `backend/src/modules/smart-money-intelligence/fno-ban.service.ts:50`
- Earnings NSE source: `backend/src/modules/earnings-intelligence/earnings-intelligence.nse-board-meetings-source.ts:76`

---

## RECOMMENDED REMEDIATION PRIORITY

1. **P0 — stock-research-workbench**: Add a `workbench_snapshots` table. Pipeline: after each daily signal run, generate and upsert the full workbench output per instrument. Screen reads the snapshot.
2. **P0 — portfolio-intelligence**: Add a `portfolio_intelligence_snapshots` table keyed on portfolioId×date. Refresh on each signal run. Screen reads the snapshot.
3. **P1 — signal-quality-lab**: Enforce `persistOutcomes=true` in the pipeline scheduler call. Remove the live-fallback path in `dashboard()` (or surface it as an explicit error rather than a silent degraded compute).
4. **P1 — signal-position-ledger**: Investigate why only 39 rows are in `signal_position_ledger_entries`; expected ~hundreds of active signal rows. Fix crash-resilience: write each row to DB as it's generated rather than accumulating in-memory then flushing.
5. **P2 — research-hub**: Add a dedicated `research_hub_snapshots` table with schema for overview fields. Retire the `pipeline_runs` JSONB approach.
6. **P2 — earnings-intelligence**: Confirm that `refreshSnapshots()` reads from DB-persisted fundamentals only (not via live NSE fetch). Document clearly.
