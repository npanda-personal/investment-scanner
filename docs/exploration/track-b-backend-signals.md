# Track B Backend API Inventory — Signals, Strategy & Intelligence Modules

> Read-only reconnaissance as of 2026-06-16 (re-audit). All paths are under the `/api/v1` prefix
> unless noted in the module header. Auth = `requireAuth` middleware = JWT-gated user
> session; "public" = no auth middleware on that router.
>
> v4 scoring changes and benchmark/alpha persistence answer documented inline.

---

## 1. signal-generation-engine

**URL prefix:** `/api/v1` (router mounts directly)
**Auth:** Public (no `requireAuth` on this router)
**DB tables:** `signal_results`, `signal_run_audits`, `crypto_signal_results`, `crypto_price_history`, `price_history`, `instruments`

### Endpoint Table

| # | Method | Path | Purpose | Key Request Fields | Key Response Fields | Auth | Data Origin |
|---|--------|------|---------|-------------------|---------------------|------|-------------|
| 1 | GET | `/api/v1/signals/health` | Module health + signal freshness check | `?region`, `?assetType` | `status`, `latest_generated_at`, `data_status`, `signalCount` | public | `signal_results` (equity) / `crypto_signal_results` (crypto) |
| 2 | GET | `/api/v1/signals/runs/latest` | Latest signal-run audit record | `?region`, `?assetType`, `?modelVersion` | `runAudit` object with run metadata | public | `signal_run_audits` |
| 3 | GET | `/api/v1/signals/top` | Paginated top signals (persisted-read) | `?direction`, `?minScore`, `?limit`, `?offset`, `?sector`, `?region`, `?assetType`, `?confidence`, `?reliabilityTier`, `?lifecycleState`, `?strategyCode`, `?search`, `?sortBy`, `?sortDirection` | `{ signals[], items[], total, hasMore, directionCounts, filtersApplied, scope }` | public | `signal_results` / `crypto_signal_results` |
| 4 | GET | `/api/v1/signals/screener` | Signal screener (same logic as top, separate route) | Same as top | Same shape as top | public | `signal_results` |
| 5 | GET | `/api/v1/signals/exit-candidates` | EXIT-lifecycle signals (persisted-read) | Same filters as top; `lifecycleState` locked to `EXIT` | Same paginated envelope; `notApplicable=true` for crypto | public | `signal_results` filtered to `lifecycleState=EXIT` |
| 6 | GET | `/api/v1/signals/lifecycle` | Generic lifecycle-state filter (`?lifecycleState=ENTRY\|ACTIVE\|EXIT\|EXPIRED`) | Same as top + `?lifecycleState` | Same paginated envelope | public | `signal_results` |
| 7 | GET | `/api/v1/signals/:instrumentId` | Latest persisted signal for one instrument | path param `instrumentId`; `?region`, `?assetType` | Full `SignalResultDto` | public | `signal_results` / `crypto_signal_results` |
| 8 | POST | `/api/v1/signals/run` | Trigger batch signal generation | `{ instrumentId?, symbol?, batchSize?, offset?, maxConcurrency?, direction?, sector?, region?, assetType?, useDataQualityFilter?, force?, strategyCode?, includeStrategyMatches? }` | `{ generated, skipped, errors, warnings, dataQuality, results[], runAudit, directionCountsGenerated, scope }` | public | Reads: `instruments`, `price_history`, `fundamentals`; Writes: `signal_results`, `signal_run_audits` |

**Notes:**
- Crypto scope (`assetType=CRYPTO` or `region=GLOBAL`) routes to the isolated `crypto_*` plane; `POST /signals/run` returns 409 for crypto.
- Route order: `/signals/exit-candidates`, `/signals/lifecycle` registered BEFORE `/:instrumentId` to prevent shadowing.
- `latestRun` (controller method) handles crypto by returning `{ notApplicable: true }`.
- The `screener` method is functionally identical to `top` in the service layer but exposed as a separate endpoint.

### v4 Scoring Changes (signal-evidence.ts, signal-scoring.ts)

The v4 evidence model (`SIGNAL_ENGINE_MODEL_VERSION_V4`) is now the active engine. Key differences from v3:

- **Factor family decorrelation (#3):** 11 independent `FactorFamily` groups (TREND, BREAKOUT_LEVEL, MEAN_REVERSION, OVEREXTENSION, VOLUME, MOMENTUM, RELATIVE_STRENGTH, PROFITABILITY, VALUATION, INCOME, OTHER). Distinct families aligned to the dominant direction drive `countComponent = 1 − exp(−familyCount / 4)`, replacing the raw signal-count total.
- **No-data weight redistribution (#2):** A category (technical/momentum/fundamental) with zero evidence has its base weight zeroed and remaining categories renormalized, instead of pinning at a neutral 0.5 that dragged composite toward NEUTRAL.
- **Graded factor strength (#4):** `STRENGTH_BY_CODE` map gives confirmed/extreme factors (e.g. `CONFIRMED_VOLUME_BREAKOUT`=1.0, `DOWN_VOLUME_SELLOFF`=0.8) higher per-factor weight vs. DEFAULT=0.8.
- **Net-margin quality vote (SG-5, v4 only):** `HEALTHY_NET_MARGIN` (≥10%) and `NEGATIVE_NET_MARGIN` (<0%) votes added to fundamentals using `net_income/revenue`.
- **Volatility-normalized momentum thresholds (SG-3):** 63-day trailing daily-return vol scales the 1M/3M momentum thresholds so high-beta stocks need proportionally larger moves to vote bullish.
- **V4Components persisted in scoringInputSummary JSON:** `{ engineVersion, rawLean, displacement, evidenceFactor, alignedFamilies, effectiveWeights, categoryHasEvidence, categoryScores }` — stored alongside the signal result for audit/explainability.
- Composite formula: `score = clamp(round(50 + displacement × 100 × spreadGain × evidenceFactor), 0, 100)` where `evidenceFactor = 0.55 × countComponent + 0.45 × agreement`.

---

## 2. signal-quality-lab

**URL prefix:** `/api/v1` (router mounts directly)
**Auth:** All routes protected by `requireAuth`
**DB tables:** `signal_results`, `signal_outcomes`, `market_context_snapshots`, `instruments`, `price_history`

### Endpoint Table

| # | Method | Path | Purpose | Key Request Fields | Key Response Fields | Auth | Data Origin |
|---|--------|------|---------|-------------------|---------------------|------|-------------|
| 1 | GET | `/api/v1/signals/quality/dashboard` | Full quality dashboard (summary + breakdowns) | `?horizon`, `?region`, `?assetType`, `?modelVersion`, `?from`, `?to`, `?minSampleSize` | `{ summary, byType[], bySector[], byRegime[], byDataQuality[], noisy[] }` | authed | `signal_outcomes` (persisted-read primary path); falls back to `signal_results` + live price fetch |
| 2 | GET | `/api/v1/signals/quality/summary` | Compact quality summary stats | Same as dashboard | `QualitySummary` with win rates, returns, horizon availability, evidence usability | authed | `signal_outcomes` (persisted-read) |
| 3 | GET | `/api/v1/signals/quality/by-type` | Win rate / avg return by signal-type code | Same as dashboard | `{ items: SignalTypePerformance[], ...summary }` | authed | `signal_outcomes` JOIN `signal_results.triggeredSignals` (JSON LATERAL) |
| 4 | GET | `/api/v1/signals/quality/by-sector` | Win rate by sector | Same | `{ items: QualityMetricGroup[], ...summary }` | authed | `signal_outcomes` |
| 5 | GET | `/api/v1/signals/quality/by-score` | Win rate by score bucket (0-39, 40-69, 70-84, 85-100) | Same | `{ items: QualityMetricGroup[], ...summary }` | authed | `signal_outcomes` |
| 6 | GET | `/api/v1/signals/quality/by-regime` | Win rate by market regime | Same | `{ items: QualityMetricGroup[], ...summary }` | authed | `signal_outcomes` LATERAL JOIN `market_context_snapshots` |
| 7 | GET | `/api/v1/signals/quality/by-data-quality` | Win rate grouped by coverage/readiness/liquidity status | Same | `{ items: QualityMetricGroup[], ...summary }` | authed | `signal_outcomes` JOIN `instrument_eligibility` (data quality engine) |
| 8 | GET | `/api/v1/signals/quality/noisy` | Noisy signal detection (bounded 500-signal window) | Same | `{ items: NoisySignalItem[], ...summary }` | authed | `signal_results` + live price computation (bounded 500) |
| 9 | GET | `/api/v1/signals/:instrumentId/history` | Per-instrument signal history | path `instrumentId`; same query filters | `{ items: SignalHistoryItem[] }` | authed | `signal_results` |
| 10 | GET | `/api/v1/signals/:instrumentId/outcomes` | Per-instrument outcome sets + aggregate | path `instrumentId`; same query filters | `{ items: SignalOutcomeSet[], aggregate: { matureCount, winRate, avgForwardReturn } }` | authed | `signal_outcomes` |
| 11 | POST | `/api/v1/signals/quality/recalculate` | Batch-compute signal outcomes; optionally persist | `{ batchSize?, offset?, horizon?, from?, to?, region?, assetType?, modelVersion?, persistOutcomes?, instrumentIds[]? }` | `{ processedCount, totalCount, rowsUpserted?, matureCount?, immatureCount?, evidenceUsability, ... }` | authed | Reads: `signal_results`, `price_history`; Writes: `signal_outcomes` (when `persistOutcomes=true`) |
| 12 | GET | `/api/v1/signals/quality/scorecard` | Aggregated win-rate scorecard grouped by direction/sector/scoreBucket | `?groupBy`, `?horizon`, `?direction`, `?sector`, `?modelVersion`, `?from`, `?to`, `?minSampleSize` | `{ groupBy, horizon, rows: ScorecardRow[], summary: ScorecardSummary[] }` | authed | `signal_outcomes` (pure SQL aggregation) |

### benchmarkReturn / alphaPercent Persistence Answer

**PERSISTED to `signal_outcomes` table.** Computed during `POST /signals/quality/recalculate` when `persistOutcomes=true` (CB-8). The service fetches benchmark prices once per batch (`fetchBenchmarkPrices` — regional index, e.g. `^NSEI` for IN, `^GSPC` for US), computes the same-horizon benchmark return and `alpha = forwardReturnPercent − benchmarkReturnPercent` for each `(signalResultId, horizon)` row, and writes them via raw SQL `UPDATE` (bypassing the Prisma typed schema because the columns were added after the last `prisma generate`). The scorecard SQL reads `avgAlphaPercent` via `AVG("alphaPercent")`. At read time (`/scorecard`, `/dashboard`), the values are read directly from the DB — **no re-computation happens on GET paths**.

---

## 3. signal-calibration-engine

**URL prefix:** `/api/v1` (router mounts directly)
**Auth:** All routes protected by `requireAuth`
**DB tables:** `signal_calibration_results`, `signal_results`, `signal_outcomes`

### Endpoint Table

| # | Method | Path | Purpose | Key Request Fields | Key Response Fields | Auth | Data Origin |
|---|--------|------|---------|-------------------|---------------------|------|-------------|
| 1 | GET | `/api/v1/signals/calibration/health` | Calibration module health | — | `{ status, module, latestCalibration, signalCount, dataStatus }` | authed | `signal_calibration_results` |
| 2 | GET | `/api/v1/signals/calibration/model` | Calibration model description / config | — | `CalibrationModelInfo` (boosts, penalties, thresholds) | authed | In-memory config (no DB) |
| 3 | GET | `/api/v1/signals/calibration/top` | Paginated list of calibrated signals | `?direction`, `?minCalibratedScore`, `?minRawScore`, `?minAbsDelta`, `?sector`, `?region`, `?assetType`, `?limit`, `?offset`, `?sortBy`, `?confidence`, `?calibrationConfidence`, `?evidenceStatus`, `?horizon` | `{ items: SignalCalibrationResultDto[], total, hasMore }` | authed | `signal_calibration_results` |
| 4 | POST | `/api/v1/signals/calibration/run` | Trigger batch calibration run | `{ instrumentId?, symbol?, batchSize?, offset?, direction?, sector?, region?, assetType?, horizon? }` | `CalibrationRunResponse` with `calibrated`, `skipped`, `failed` counts and results | authed | Reads: `signal_results`, `signal_outcomes`; Writes: `signal_calibration_results` |
| 5 | GET | `/api/v1/signals/calibration/compare/:instrumentId` | Raw vs calibrated signal comparison for one instrument | path `instrumentId`; `?region`, `?assetType`, `?horizon` | `CalibrationComparison` (rawScore, calibratedScore, delta, boosts, penalties, evidence) | authed | `signal_calibration_results` JOIN `signal_results` (persisted-read only) |
| 6 | GET | `/api/v1/signals/calibration/:instrumentId` | Latest calibration result for one instrument | path `instrumentId` | `SignalCalibrationResultDto` or 404 | authed | `signal_calibration_results` (persisted-read) |

**Notes:** Route ordering important — `/compare/:instrumentId` registered before `/:instrumentId` to avoid shadowing. The calibration overlay (`calibratedScore`, `calibrationHorizon`, `calibrationStatus`) is also injected at read time by `enrichSignals` in signal-generation-engine (persisted-read, never triggers live recompute).

---

## 4. strategy-decision-engine

**URL prefix:** `/api/v1/strategy` (see `routes.ts` line 64)
**Auth:** Public (no `requireAuth` on this router)
**DB tables:** `strategy_decisions`, `signal_results`, `instruments`, `portfolio_positions`, `watchlist_items`

### Endpoint Table

| # | Method | Path | Purpose | Key Request Fields | Key Response Fields | Auth | Data Origin |
|---|--------|------|---------|-------------------|---------------------|------|-------------|
| 1 | GET | `/api/v1/strategy/market-gate` | Current market regime gate (OPEN/SELECTIVE/CLOSED) | `?region` | `{ gate, regime, posture, breadthAbove50Pct, note }` | public | `market_context_snapshots` (persisted-read via capital-posture service) |
| 2 | POST | `/api/v1/strategy/evaluate` | Evaluate strategy decisions for a universe | `{ strategy?, instrumentId?, instrumentIds[]?, symbol?, portfolioId?, watchlistId?, region?, assetType?, batchSize?, offset?, workerConcurrency? }` | `{ decisions[], processedCount, generatedCount, skippedCount, ... }` | public | `signal_results`, `strategy_definitions`, `market_context_snapshots`, `portfolio_positions` |
| 3 | GET | `/api/v1/strategy/candidates` | Paginated strategy decision candidates | `?strategy`, `?decision`, `?minScore`, `?confidence`, `?frameworkBacked`, `?sector`, `?region`, `?assetType`, `?limit`, `?offset`, `?sortBy` | `{ items: StrategyDecision[], total, hasMore }` | public | `strategy_decisions` |
| 4 | GET | `/api/v1/strategy/exits` | Exit-candidate decisions for a portfolio | `?portfolioId` (required), `?region`, `?assetType` | `{ exits: StrategyDecision[] }` | public | `strategy_decisions` filtered to EXIT decisions for portfolio positions |
| 5 | GET | `/api/v1/strategy/watchlist/:watchlistId` | Strategy decisions for watchlist items | path `watchlistId` | `{ decisions: StrategyDecision[] }` | public | `strategy_decisions` + `watchlist_items` |
| 6 | GET | `/api/v1/strategy/portfolio/:portfolioId` | Strategy decisions for portfolio positions | path `portfolioId` | `{ decisions: StrategyDecision[] }` | public | `strategy_decisions` + `portfolio_positions` |
| 7 | GET | `/api/v1/strategy/model` | Strategy model/config description | — | `{ strategies[], thresholds, config }` | public | In-memory config |
| 8 | GET | `/api/v1/strategy/health` | Module health | — | `{ status, module, latestDecision, dataStatus }` | public | `strategy_decisions` |
| 9 | GET | `/api/v1/strategy/history/:instrumentId` | Decision history for one instrument | path `instrumentId` | `{ history: StrategyDecision[] }` | public | `strategy_decisions` ordered by generated date desc |
| 10 | GET | `/api/v1/strategy/:instrumentId` | Latest strategy decision for one instrument | path `instrumentId` | `StrategyDecision` or null | public | `strategy_decisions` |

---

## 5. strategy-framework

**URL prefix:** `/api/v1` (router mounts directly)
**Auth:** Most routes public; `POST /strategies/seed` and `POST /strategies/:code/backtest` require `requireAuth`
**DB tables:** `strategy_definitions`, `strategy_performance_summaries`, `backtest_runs`

### Endpoint Table

| # | Method | Path | Purpose | Key Request Fields | Key Response Fields | Auth | Data Origin |
|---|--------|------|---------|-------------------|---------------------|------|-------------|
| 1 | GET | `/api/v1/strategies/health` | Module health | — | `{ status, module, strategyCount }` | public | `strategy_definitions` |
| 2 | GET | `/api/v1/strategies/model` | Framework model description | — | `{ version, strategies[], categories[], evaluationCriteria[] }` | public | In-memory config / strategy registry |
| 3 | GET | `/api/v1/strategies/proof-registry` | Strategy proof/evidence registry | `?region`, `?assetType`, `?category` | `{ strategies: ProofEntry[] }` with backtest evidence and win rates | public | `strategy_performance_summaries`, `backtest_runs` |
| 4 | GET | `/api/v1/strategies/rankings` | Strategy rankings by performance | `?region`, `?assetType`, `?horizon`, `?minSampleSize` | `{ strategies: RankedStrategy[] }` sorted by win rate / expectancy | public | `strategy_performance_summaries` |
| 5 | GET | `/api/v1/strategies` | List all strategies | `?region`, `?assetType`, `?status`, `?category` | `StrategyDefinition[]` with metadata and config | public | `strategy_definitions` (registry) |
| 6 | POST | `/api/v1/strategies/evaluate` | Evaluate strategy context for one instrument | `{ instrumentId, symbol, prices[], region?, assetType?, ... }` | `StrategyFrameworkContextEvaluation[]` with match/blocked per strategy | public | Computed in-memory from provided price/signal context |
| 7 | POST | `/api/v1/strategies/seed` | Seed/refresh strategy definitions from code | — | `{ success: true }` | authed | Writes `strategy_definitions` |
| 8 | GET | `/api/v1/strategies/:code/proof` | Proof detail for one strategy | path `code`; `?region`, `?assetType` | `ProofEntry` with backtest evidence, win rates, drawdown | public | `strategy_performance_summaries`, `backtest_runs` |
| 9 | GET | `/api/v1/strategies/:code/performance` | Performance summary for one strategy | path `code`; `?region`, `?assetType` | `StrategyPerformanceSummaryDto` | public | `strategy_performance_summaries` |
| 10 | GET | `/api/v1/strategies/:code` | Detail for one strategy | path `code`; `?region`, `?assetType` | `StrategyDefinition` with full config + performance | public | `strategy_definitions` + `strategy_performance_summaries` |
| 11 | POST | `/api/v1/strategies/:code/backtest` | Trigger a backtest run for a strategy | path `code`; `{ timeframe, region?, assetType? }` | `BacktestRun` with status and results | authed | Reads: `signal_results`, `price_history`; Writes: `backtest_runs`, `strategy_performance_summaries` |

---

## 6. backtesting-strategy-lab

**URL prefix:** `/api/v1` (router mounts directly)
**Auth:** All routes protected by `requireAuth`
**DB tables:** `backtest_strategies`, `backtest_runs`, `signal_results`, `price_history`, `instruments`

### Endpoint Table

| # | Method | Path | Purpose | Key Request Fields | Key Response Fields | Auth | Data Origin |
|---|--------|------|---------|-------------------|---------------------|------|-------------|
| 1 | GET | `/api/v1/backtests/strategies` | List user's saved backtest strategies | — (userId from JWT) | `BacktestStrategyConfig[]` | authed | `backtest_strategies` filtered by userId |
| 2 | POST | `/api/v1/backtests/strategies` | Create a new backtest strategy definition | `{ name, config: { mode, strategyCode?, startDate, endDate, universe, entryRule, exitRule, initialCapital, maxPositions, positionSizeType, transactionCostPercent, ... } }` | Created `BacktestStrategyConfig` | authed | Writes `backtest_strategies` |
| 3 | GET | `/api/v1/backtests/strategies/:id` | Get one backtest strategy by ID | path `id` | `BacktestStrategyConfig` or 404 | authed | `backtest_strategies` |
| 4 | PATCH | `/api/v1/backtests/strategies/:id` | Update a backtest strategy | path `id`; partial `{ name?, config? }` | Updated `BacktestStrategyConfig` | authed | `backtest_strategies` |
| 5 | DELETE | `/api/v1/backtests/strategies/:id` | Delete a backtest strategy | path `id` | `{ success: true }` | authed | `backtest_strategies` |
| 6 | POST | `/api/v1/backtests/strategies/:id/run` | Run a saved strategy's backtest | path `id` | `BacktestRun` with performance metrics | authed | Reads: `signal_results`, `price_history`; Writes: `backtest_runs` |
| 7 | POST | `/api/v1/backtests/run` | Ad-hoc backtest run (inline config) | `{ config: BacktestStrategyConfig }` | `BacktestRun` with performance metrics | authed | Reads: `signal_results`, `price_history`; Writes: `backtest_runs` |
| 8 | GET | `/api/v1/backtests/runs` | List backtest runs for current user | `?region`, `?assetType`, `?limit`, `?offset` | `BacktestRun[]` | authed | `backtest_runs` |
| 9 | GET | `/api/v1/backtests/runs/:id` | Get one backtest run by ID | path `id` | `BacktestRun` or 404 | authed | `backtest_runs` |
| 10 | DELETE | `/api/v1/backtests/runs/:id` | Delete a backtest run | path `id` | `{ success: true }` | authed | `backtest_runs` |

---

## 7. trade-plan-risk-engine

**URL prefix:** `/api/v1/trade-plans` (module `routePrefix`, see `trade-plan-risk-engine.module.ts`)
**Auth:** All routes protected by `requireAuth`
**DB tables:** `trade_plans`, `signal_results`, `strategy_decisions`, `price_history`, `instruments`

### Endpoint Table

| # | Method | Path | Purpose | Key Request Fields | Key Response Fields | Auth | Data Origin |
|---|--------|------|---------|-------------------|---------------------|------|-------------|
| 1 | GET | `/api/v1/trade-plans/health` | Module health stats | — | `{ status, tradePlanCount, latestPlan, dataStatus }` | authed | `trade_plans` |
| 2 | GET | `/api/v1/trade-plans/model` | Trade plan model rules / config | — | Risk rules, position-size formulas, ATR multipliers | authed | In-memory config |
| 3 | GET | `/api/v1/trade-plans/funnel` | Funnel diagnostics (pipeline audit) | `?region`, `?assetType`, `?strategyCode`, `?generatedDate`, `?from`, `?to`, `?backtestTimeframe`, `?includeLegacy` | Funnel breakdown: total signals → strategy candidates → plans generated | authed | `signal_results`, `strategy_decisions`, `trade_plans` |
| 4 | GET | `/api/v1/trade-plans/candidates` | Paginated list of trade plan candidates | `?region`, `?assetType`, `?strategyCode`, `?planStatus`, `?riskGrade`, `?minRewardRisk`, `?paperReadyOnly`, `?limit`, `?offset`, `?sortBy`, `?sortDirection` | `{ items: TradePlan[], total, hasMore }` | authed | `trade_plans` |
| 5 | GET | `/api/v1/trade-plans/:instrumentId` | Latest trade plan for one instrument | path `instrumentId`; `?strategyCode`, `?portfolioId`, `?region`, `?assetType` | `TradePlan` or 404 | authed | `trade_plans` (persisted-read) |
| 6 | POST | `/api/v1/trade-plans/generate` | Generate a trade plan for one instrument | `{ instrumentId (req), symbol (req), strategyDecisionId?, portfolioId?, region?, assetType?, riskPercent?, capitalBase?, targetRewardRisk?, backtestTimeframe? }` | `TradePlan` with entry/stop/target levels, position size, risk grade | authed | Reads: `signal_results`, `strategy_decisions`, `price_history`; Writes: `trade_plans` |
| 7 | POST | `/api/v1/trade-plans/generate/batch` | Batch-generate trade plans | `{ batchSize?, offset?, region?, assetType?, strategyCode?, workerConcurrency?, backtestTimeframe? }` | Batch result with counts and errors | authed | Same as single generate |

**Notes:**
- Route order issue: `/:instrumentId` is registered before `/generate` in the router — but since `/generate` is a POST and `/:instrumentId` is a GET, there is no conflict. However, `/candidates` (GET) is registered before `/:instrumentId` (GET), which is correct.

---

## 8. signal-position-ledger

**URL prefix:** `/api/v1` (router mounts directly)
**Auth:** Public (no `requireAuth` on this router)
**DB tables:** `signal_position_ledger_rows`, `signal_results`, `price_history`

### Endpoint Table

| # | Method | Path | Purpose | Key Request Fields | Key Response Fields | Auth | Data Origin |
|---|--------|------|---------|-------------------|---------------------|------|-------------|
| 1 | GET | `/api/v1/signals/position-ledger/health` | Module health | — | `{ status, activeRowCount, latestEntry }` | public | `signal_position_ledger_rows` |
| 2 | GET | `/api/v1/signals/position-ledger/active` | Persisted active position rows (trader-facing) | `?region`, `?assetType`, `?limit`, `?offset`, `?sortBy`, `?sortDirection` | `{ items: LedgerRow[], total }` | public | `signal_position_ledger_rows` (persisted-read only) |
| 3 | GET | `/api/v1/signals/position-ledger/closed` | Persisted closed position rows | Same filters | `{ items: LedgerRow[], total }` | public | `signal_position_ledger_rows` (persisted-read only) |
| 4 | GET | `/api/v1/signals/position-ledger/persisted/active` | Alias for active (backward-compat) | Same | Same | public | Same as #2 |
| 5 | GET | `/api/v1/signals/position-ledger/persisted/closed` | Alias for closed (backward-compat) | Same | Same | public | Same as #3 |
| 6 | POST | `/api/v1/signals/position-ledger/active/refresh` | Explicit live refresh (re-derives active rows) | Body + query same filters as GET active | Updated `{ items: LedgerRow[], total, refreshedAt }` | public | Reads: `signal_results`, `price_history`; Writes: `signal_position_ledger_rows` |

**Notes:**
- Trader-facing GETs (`/active`, `/closed`) are strictly persisted-read; no live computation on GET.
- The controller has `activeRows` and `closedRows` methods (live paths) but these are **not registered on any route** — they exist only as dead/unregistered methods. Only `persistedActiveRows` and `persistedClosedRows` are wired to the GET paths.

---

## 9. market-intelligence

**URL prefix:** `/api/v1` (router mounts directly)
**Auth:** Public (no `requireAuth` on this router)
**DB tables:** `stock_interest_snapshots`, `sector_snapshots`, `market_context_snapshots`, `index_constituents`, `signal_results`, `instruments`

### Endpoint Table

| # | Method | Path | Purpose | Key Request Fields | Key Response Fields | Auth | Data Origin |
|---|--------|------|---------|-------------------|---------------------|------|-------------|
| 1 | GET | `/api/v1/market-intelligence/stock-interest` | Latest stock-interest snapshot (FII/DII/retail sentiment) | `?region` (default IN), `?assetType` (default STOCK) | `{ availability, scope, snapshot: { stocks[], summary }, snapshotDate, warnings }` | public | `stock_interest_snapshots` (persisted-read) |
| 2 | GET | `/api/v1/market-intelligence/sector-constituents` | Stock list for a given sector | `?sector` (required), `?region`, `?assetType` | `{ availability, sector, region, constituents[], count, message }` | public | `instruments` + `signal_results` for signal overlay |
| 3 | GET | `/api/v1/market-intelligence/sector-rotation` | Sector rotation quadrant map (RRG-style) | `?region`, `?assetType` | `{ availability, sectors: SectorRotationRow[], quadrantCounts, snapshotDate }` where `rotationQuadrant` ∈ LEADING/IMPROVING/WEAKENING/LAGGING | public | `market_context_snapshots.sectors` (persisted sector snapshots) |
| 4 | GET | `/api/v1/market-intelligence/event-feed` | Market event feed (earnings, results, announcements) | `?days` (default 5), `?region` | `{ availability, events[], eventCount, asOf }` | public | Computed from `earnings_events` / announcements tables (via `event-feed.service`) |
| 5 | GET | `/api/v1/market-intelligence/instrument-context/:instrumentId` | Assembled instrument research context | path `instrumentId` | `{ status, context: { signal, calibration, quality, strategy, marketContext, smartMoney } }` | public | Multiple tables: `signal_results`, `signal_calibration_results`, `signal_outcomes`, `market_context_snapshots`, `smart_money_stocks` (via `instrument-context.service`) |
| 6 | GET | `/api/v1/market-intelligence/index-constituents` | Index constituents with signal breadth | `?index` (e.g. NIFTY50) | `{ availability, index, indexLabel, constituents[], count, breadth: { bullishCount, bearishCount, neutralCount, noSignalCount, headline } }` | public | `index_constituents` (curated static list) + `signal_results` for breadth |

**Notes:**
- Sector rotation quadrant is computed at read time from persisted `sectorScore` and `return1M` fields (not stored to DB separately).
- `sector-rotation` calls `marketContextService.latestSectorIntelligenceSnapshot` — depends on the `market-context-intelligence` module.

---

## Summary Notes

### Stubs / Placeholder Responses

- `SignalQualityLabRepository.recalculate()` is marked `@deprecated` and returns a stub `{ persistedOutcomes: false, message: '...' }`. It is not registered as an HTTP endpoint — the live path goes through the controller's `recalculate` method calling the service.
- `strategy-decision-engine` service methods for `portfolio`, `watchlist`, `exits`, and `history` were not individually audited but all have controller wiring.

### Dead / Unregistered Controller Methods

- `SignalPositionLedgerController.activeRows` and `closedRows` (live enrichment paths) are defined but **not wired to any HTTP route**. Only the `persistedActiveRows` and `persistedClosedRows` handlers are registered.
- `SignalGenerationEngineService.signalHistory`, `signalHistoryCount`, `funnelDiagnostics`, `latestSignalUniverse`, `latestSignalUniverseCount`, `generateForInstrument` are service methods used internally or by other modules but have no direct HTTP endpoint in this module's router.

### External Source Hits

- **Yahoo Finance** (via `market-data-foundation`): price data fetched during `POST /signals/run` and signal enrichment (live price overlay for `currentPrice`/`previousClose`).
- **NSE delivery data** (NSE-sourced via bhavcopy pipeline): `delivery_percent` field used in `deliveryEvidence` annotation (v4 only, gated on `scoringConfig.hasDelivery`).
- No direct external API calls in any of these 9 modules at read time (all trader-facing GETs are persisted-read).

### Route Prefix Summary

| Module | Prefix |
|--------|--------|
| signal-generation-engine | `/api/v1` |
| signal-quality-lab | `/api/v1` |
| signal-calibration-engine | `/api/v1` |
| strategy-decision-engine | `/api/v1/strategy` |
| strategy-framework | `/api/v1` |
| backtesting-strategy-lab | `/api/v1` |
| trade-plan-risk-engine | `/api/v1/trade-plans` |
| signal-position-ledger | `/api/v1` |
| market-intelligence | `/api/v1` |
