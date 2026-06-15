# Track B Backend API Inventory — Signals, Strategy & Intelligence Modules

> Read-only reconnaissance as of 2026-06-15. All paths are under the `/api/v1` prefix
> unless noted in the module header. Auth = `requireAuth` middleware = JWT-gated user
> session; "public" = no auth middleware on that router.

---

## Route prefix resolution

All modules mount via `registerApiModules()` in `backend/src/api/routes.ts`.

| Module | Mount prefix |
|---|---|
| signal-generation-engine | `/api/v1` |
| signal-quality-lab | `/api/v1` |
| signal-calibration-engine | `/api/v1` |
| strategy-decision-engine | `/api/v1/strategy` |
| strategy-framework | `/api/v1` |
| backtesting-strategy-lab | `/api/v1` |
| trade-plan-risk-engine | `/api/v1/trade-plans` |
| signal-position-ledger | `/api/v1` |
| market-intelligence | `/api/v1` |

---

## 1. signal-generation-engine

Router: `signal-generation-engine.router.ts` — **no `requireAuth`** (public endpoints)

| # | METHOD | Full Path | Purpose | Request Params/Body | Response Shape | Auth | Data Origin |
|---|---|---|---|---|---|---|---|
| 1 | GET | `/api/v1/signals/health` | Module health + signal count | `?region, ?assetType` | `{ status, module, signalCount, latest_generated_at, data_status }` | public | `SignalResult` table (Prisma `signalResult`) OR `crypto_signal_results` table |
| 2 | GET | `/api/v1/signals/runs/latest` | Latest signal generation run audit | `?region, ?assetType, ?modelVersion` | `{ scope, latestRun: SignalGenerationRunAudit \| null, notApplicable? }` | public | `SignalGenerationRun` table (Prisma `signalGenerationRun`) |
| 3 | GET | `/api/v1/signals/top` | Paginated top signals by score | `?direction, minScore, limit, offset, sortBy, sortDirection, sector, country, region, assetType, modelVersion, signalType, confidence, search, strategyCode, includeStrategyMatches, onlyStrategyEligible, excludeNoiseFiltered, hasStrategyMatch, hasBlockedStrategies, frameworkBackedDecisionAvailable, excludeSme, reliabilityTier, lifecycleState` | `{ signals[], items[], total, totalCount, limit, offset, hasMore, filtersApplied, scope, directionCounts }` | public | `signal_results` (Prisma `signalResult`) + `stock` (join for region/assetType); crypto → `crypto_signal_results` + `crypto_price_ticks` |
| 4 | GET | `/api/v1/signals/screener` | Signal screener (same as top, different surface) | Same as /signals/top | Same as /signals/top | public | Same as /signals/top |
| 5 | GET | `/api/v1/signals/exit-candidates` | Signals with lifecycleState=EXIT | Same query params as /top; lifecycleState locked to EXIT | `{ signals[], items[], total }` (crypto → `{ notApplicable: true }`) | public | `signal_results` filtered on `lifecycleState = 'EXIT'` |
| 6 | GET | `/api/v1/signals/lifecycle` | Signals filtered by lifecycle state | Same query params as /top + `lifecycleState` | `{ signals[], items[], total }` | public | `signal_results` WHERE `lifecycleState` = param |
| 7 | GET | `/api/v1/signals/:instrumentId` | Latest persisted signal for one instrument | Path: `instrumentId`; `?region, ?assetType` (for crypto routing) | `SignalResultDto` | public | `signal_results` WHERE `instrumentId` (latest by `generatedAt`); crypto → `crypto_signal_results` |
| 8 | POST | `/api/v1/signals/run` | Trigger signal generation batch | Body: `{ instrumentId?, symbol?, limit?, batchSize?, offset?, maxConcurrency?, direction?, sector?, country?, region?, assetType?, modelVersion?, rulesetVersion?, requestedByUserId?, useDataQualityFilter?, minSignalReadinessScore?, allowedReadinessStatuses?, includeLimited?, skipUnusable?, missingQualityBehavior?, strategyCode?, includeStrategyMatches?, onlyStrategyEligible?, excludeNoiseFiltered?, force? }` | `SignalRunResponse` | public | Reads from `stock`, `price_ticks`, `data_quality_verdicts`, `market_context_snapshots`, `smart_money_context_snapshots`; writes to `signal_results`, `signal_generation_runs` |

**Key tables:** `signal_results` (most important: `score`, `direction`, `lifecycleState`, `instrumentId`, `generatedDate`), `signal_generation_runs`, `stocks`, `price_ticks`, `market_context_snapshots`, `sector_context_snapshots`, `smart_money_context_snapshots`. Crypto plane: `crypto_signal_results`, `crypto_price_ticks`.

**Notes:**
- Endpoints 3–7 are persisted-read (no live generation on GET).
- POST /signals/run is the write/generation trigger; returns 409 for crypto scope.
- Signal query supports strategy-match enrichment (`includeStrategyMatches`, `onlyStrategyEligible`) which joins `strategy_decision_results` in-service.

---

## 2. signal-quality-lab

Router: `signal-quality-lab.router.ts` — **`requireAuth` applied at router level (all endpoints authed)**

| # | METHOD | Full Path | Purpose | Request Params/Body | Response Shape | Auth | Data Origin |
|---|---|---|---|---|---|---|---|
| 1 | GET | `/api/v1/signals/quality/dashboard` | Full quality dashboard (all slices) | `?horizon (1D/5D/10D/20D/60D), direction, sector, country, region, assetType, modelVersion, from, to, limit, minSampleSize, readinessStatus, coverageStatus, liquidityStatus, minReadinessScore, onlySignalReady, excludePoorQuality` | Dashboard aggregate shape | authed | `signal_outcomes` (raw SQL aggregates), `signal_results` (joins for signal types) |
| 2 | GET | `/api/v1/signals/quality/summary` | Quality evidence summary for a scope | Same as dashboard | `{ selectedHorizon, evidenceUsability, evaluationDiagnostics, horizonAvailability, dataStatus, recommendedAction }` | authed | `signal_outcomes` WHERE `dataComplete = true` |
| 3 | GET | `/api/v1/signals/quality/by-type` | Win-rate by signal-type code | Same as summary | `{ items: PersistedSignalTypeRow[], ...summaryFields }` | authed | `signal_outcomes` JOIN `signal_results` (JSONB expand `triggeredSignals`) |
| 4 | GET | `/api/v1/signals/quality/by-sector` | Win-rate grouped by sector | Same as summary | `{ items[], ...summaryFields }` | authed | `signal_outcomes` grouped by `sector` |
| 5 | GET | `/api/v1/signals/quality/by-score` | Win-rate by score bucket (0-39/40-69/70-84/85-100) | Same as summary | `{ items[], ...summaryFields }` | authed | `signal_outcomes` grouped by score bucket (raw SQL CASE) |
| 6 | GET | `/api/v1/signals/quality/by-regime` | Win-rate by market regime | Same as summary | `{ items[], ...summaryFields }` | authed | `signal_outcomes` LATERAL JOIN `market_context_snapshots` (regime lookup by date) |
| 7 | GET | `/api/v1/signals/quality/by-data-quality` | Win-rate sliced by data quality status | Same as summary | `{ items[], ...summaryFields }` | authed | `signal_outcomes` |
| 8 | GET | `/api/v1/signals/quality/noisy` | Signals with high volatility / poor accuracy | Same as summary | `{ items[], ...summaryFields }` | authed | `signal_outcomes` |
| 9 | GET | `/api/v1/signals/:instrumentId/history` | Signal history for one instrument | Path: `instrumentId`; same quality query params | `{ items: SignalResultDto[] }` | authed | `signal_results` WHERE `instrumentId`, ordered by `generatedAt DESC` |
| 10 | GET | `/api/v1/signals/:instrumentId/outcomes` | Signal outcomes for one instrument | Path: `instrumentId`; quality query params | `{ items: SignalOutcome[], aggregate: { matureCount, winRate, avgForwardReturn } }` | authed | `signal_outcomes` WHERE `instrumentId`, `dataComplete = true` |
| 11 | POST | `/api/v1/signals/quality/recalculate` | Recalculate/populate signal outcome rows | Query or Body: `{ batchSize?, offset?, horizon?, region?, assetType?, modelVersion?, from?, to? }` | Batch result summary | authed | Reads `signal_results`; writes/upserts `signal_outcomes` |
| 12 | GET | `/api/v1/signals/quality/scorecard` | Scorecard aggregates (win-rate, expectancy, profit factor) | `?horizon, groupBy (direction/sector/scoreBucket), direction, sector, modelVersion, from, to, minSampleSize` | `{ rows: ScorecardRow[], summary: ScorecardSummary[] }` | authed | `signal_outcomes` WHERE `dataComplete = true` (raw SQL, complex aggregation with PERCENTILE_CONT) |

**Key tables:** `signal_outcomes` (most important: `forwardReturnPercent`, `dataComplete`, `horizon`, `direction`, `signalResultId`), `signal_results` (join for signal type codes).

**Notes:**
- All reads are over the `signal_outcomes` persisted table — no live price fetches.
- The `recalculate` endpoint populates `signal_outcomes` from `signal_results` by looking up future prices in `price_ticks`/`daily_ohlc`.
- Raw SQL with `$queryRawUnsafe` used for scorecard and by-regime aggregation (complex CTE/LATERAL JOINs).

---

## 3. signal-calibration-engine

Router: `signal-calibration-engine.router.ts` — **`requireAuth` applied at router level (all endpoints authed)**

| # | METHOD | Full Path | Purpose | Request Params/Body | Response Shape | Auth | Data Origin |
|---|---|---|---|---|---|---|---|
| 1 | GET | `/api/v1/signals/calibration/health` | Calibration module health | none | `{ status, count, latestGeneratedAt, ... }` | authed | `signal_calibration_results` |
| 2 | GET | `/api/v1/signals/calibration/model` | Calibration model config (in-process, no DB) | none | Model metadata object | authed | **Computed in-process** — no DB query; returns static config |
| 3 | GET | `/api/v1/signals/calibration/top` | Paginated top calibrated signals | `?direction, minScore, minRawScore, minCalibratedScore, minAbsDelta, limit, offset, sector, country, region, assetType, sortBy, sortDirection, confidence, calibrationConfidence, evidenceStatus, search, horizon, hasDataGaps` | `{ items: SignalCalibrationResultDto[], total, limit, offset, hasMore }` | authed | `signal_calibration_results` JOIN `stock` (region/assetType filter) |
| 4 | POST | `/api/v1/signals/calibration/run` | Run calibration batch | Body: `{ instrumentId?, symbol?, limit?, batchSize?, offset?, direction?, sector?, country?, region?, assetType?, horizon? }` | Calibration run summary | authed | Reads `signal_results`, `signal_outcomes`; writes `signal_calibration_results` |
| 5 | GET | `/api/v1/signals/calibration/compare/:instrumentId` | Compare raw vs calibrated signal for one instrument | Path: `instrumentId`; `?region, ?assetType, ?horizon` | Comparison object `{ raw, calibrated, delta, ... }` | authed | `signal_results` + `signal_calibration_results` WHERE `instrumentId` |
| 6 | GET | `/api/v1/signals/calibration/:instrumentId` | Latest calibrated signal for one instrument | Path: `instrumentId` | `SignalCalibrationResultDto` | authed | `signal_calibration_results` WHERE `instrumentId` (latest by `generatedAt`) |

**Key tables:** `signal_calibration_results` (most important: `calibratedScore`, `scoreDelta`, `calibratedDirection`, `instrumentId`), `signal_results` (source signals), `signal_outcomes` (calibration evidence).

**Notes:**
- GET `/signals/calibration/model` is entirely in-process — returns static calibration config with no DB call.
- The `compare` endpoint synthesises raw + calibrated views on demand from two persisted tables; it does not hit any external API.

---

## 4. strategy-decision-engine

Router: `strategy-decision-engine.router.ts` — **no `requireAuth`** (public endpoints)

Mount prefix: `/api/v1/strategy` (note: unique prefix, not `/api/v1`)

| # | METHOD | Full Path | Purpose | Request Params/Body | Response Shape | Auth | Data Origin |
|---|---|---|---|---|---|---|---|
| 1 | GET | `/api/v1/strategy/market-gate` | Current market gate (regime-based go/no-go) | `?region` | `{ gate: 'OPEN' \| 'CAUTION' \| 'CLOSED', regime, score, breadth, message, ... }` | public | `market_context_snapshots` (latest by `snapshotDate` for region) + in-process gate logic |
| 2 | POST | `/api/v1/strategy/evaluate` | Run strategy evaluation batch | Body: `{ strategy, instrumentId?, instrumentIds?, symbol?, portfolioId?, watchlistId?, region?, assetType?, batchSize?, offset?, workerConcurrency? }` | `{ evaluated, results: StrategyDecisionDto[] }` | public | Reads `signal_results`, `strategy_definitions`, `data_quality_verdicts`, `market_context_snapshots`; writes `strategy_decision_results` |
| 3 | GET | `/api/v1/strategy/candidates` | Paginated strategy candidates (TRADE_CANDIDATE decisions) | `?strategy, decision, minScore, confidence, frameworkBacked, includeLegacy, includeHistory, strategyRatingGrades, readinessLabels, sector, country, region, assetType, limit, offset, sortBy, sortDirection` | `{ items: StrategyDecisionDto[], total, ... }` | public | `strategy_decision_results` (Prisma `strategyDecisionResult`) |
| 4 | GET | `/api/v1/strategy/exits` | Exit candidates for a portfolio | `?portfolioId, ?region, ?assetType` | `{ items: StrategyDecisionDto[] }` | public | `strategy_decision_results` WHERE `portfolioId` + `decision IN ['EXIT_CANDIDATE', 'REDUCE_RISK']` |
| 5 | GET | `/api/v1/strategy/watchlist/:watchlistId` | Strategy decisions for a watchlist | Path: `watchlistId` | `{ items: StrategyDecisionDto[] }` | public | `strategy_decision_results` JOIN `watchlist_items` WHERE `watchlistId` |
| 6 | GET | `/api/v1/strategy/portfolio/:portfolioId` | Strategy decisions for a portfolio | Path: `portfolioId` | `{ items: StrategyDecisionDto[] }` | public | `strategy_decision_results` WHERE `portfolioId` |
| 7 | GET | `/api/v1/strategy/model` | Strategy model metadata | none | Model version + description object | public | **Computed in-process** — no DB |
| 8 | GET | `/api/v1/strategy/health` | Module health stats | none | `{ status, count, latestGeneratedAt, ... }` | public | `strategy_decision_results` |
| 9 | GET | `/api/v1/strategy/history/:instrumentId` | Decision history for one instrument | Path: `instrumentId` | `{ items: StrategyDecisionDto[] }` | public | `strategy_decision_results` WHERE `instrumentId` ordered by `generatedAt DESC` |
| 10 | GET | `/api/v1/strategy/:instrumentId` | Latest strategy decision for one instrument | Path: `instrumentId` | `StrategyDecisionDto \| null` | public | `strategy_decision_results` WHERE `instrumentId` (latest) |

**Key tables:** `strategy_decision_results` (most important: `decision`, `decisionScore`, `frameworkBacked`, `instrumentId`, `strategy`, `generatedDate`), `market_context_snapshots` (for market-gate), `signal_results` (for evaluate).

**Notes:**
- POST `/strategy/evaluate` is the generation trigger; reads signals + strategy definitions + DQE verdicts; writes to `strategy_decision_results`.
- GET `/strategy/model` is in-process only — no DB.

---

## 5. strategy-framework

Router: `strategy-framework.router.ts` — mixed auth (most endpoints public; `POST /strategies/seed` and `POST /strategies/:code/backtest` require auth)

| # | METHOD | Full Path | Purpose | Request Params/Body | Response Shape | Auth | Data Origin |
|---|---|---|---|---|---|---|---|
| 1 | GET | `/api/v1/strategies/health` | Framework module health | none | `{ status, count }` | public | `strategy_definitions` |
| 2 | GET | `/api/v1/strategies/model` | Framework model metadata | none | Model version + capabilities | public | **Computed in-process** |
| 3 | GET | `/api/v1/strategies/proof-registry` | Registry of all strategy proof summaries | `?timeframe (1Y/3Y/5Y/10Y/15Y), region, assetType, universeKey` | `{ strategies: [{ code, name, performance }] }` | public | `strategy_definitions` + `strategy_performance_summaries` |
| 4 | GET | `/api/v1/strategies/rankings` | Strategy rankings by rating/performance | `?timeframe, region, assetType, minRating` | `{ rankings: StrategyRankingDto[] }` | public | `strategy_performance_summaries` + `strategy_definitions` |
| 5 | GET | `/api/v1/strategies` | List all strategy definitions | `?status, category, style, region, assetType` | `StrategyDefinition[]` | public | `strategy_definitions` (Prisma `strategyDefinition`) |
| 6 | POST | `/api/v1/strategies/evaluate` | Evaluate strategy against a single instrument | Body: `{ strategyCode?, instrumentId?, symbol?, region?, assetType? }` | `StrategySignalOutput` | public | Reads `signal_results`, `market_context_snapshots`, `data_quality_verdicts`, `strategy_definitions` — in-process evaluation, no write |
| 7 | POST | `/api/v1/strategies/seed` | Seed/upsert strategy definitions | none | `{ success: true }` | **authed** | Writes to `strategy_definitions` |
| 8 | GET | `/api/v1/strategies/:code/proof` | Proof details for one strategy | Path: `code`; same performance query params | `StrategyProofDetail` | public | `strategy_definitions` + `strategy_performance_summaries` |
| 9 | GET | `/api/v1/strategies/:code/performance` | Performance summary for one strategy | Path: `code`; `?timeframe, region, assetType, universeKey` | `StrategyPerformanceSummaryDto` | public | `strategy_performance_summaries` (Prisma `strategyPerformanceSummary`) WHERE `strategyCode` |
| 10 | GET | `/api/v1/strategies/:code` | Full strategy definition detail | Path: `code`; performance query params | `StrategyDefinition + StrategyPerformanceSummaryDto` | public | `strategy_definitions` + `strategy_performance_summaries` |
| 11 | POST | `/api/v1/strategies/:code/backtest` | Run a registered strategy backtest | Path: `code`; Body: `{ timeframe?, region?, assetType?, universe?, initialCapital?, maxPositions?, transactionCostPercent?, positionSizeType?, fixedAmountPerTrade? }` | `BacktestRunDto` | **authed** | Reads `signal_results`, `price_ticks`; writes to `backtest_runs` |

**Key tables:** `strategy_definitions` (most important: `strategyCode`, `status`, `category`, `rules`), `strategy_performance_summaries`, `backtest_runs`.

**Notes:**
- POST `/strategies/evaluate` is an in-process evaluation (does NOT write results) — returns the evaluation without persisting. This is distinct from `strategy-decision-engine POST /evaluate`, which persists to `strategy_decision_results`.
- GET `/strategies/model` is computed in-process.
- `strategy_performance_summaries` is populated by the pipeline (backtest-based proofs), not on-demand.

---

## 6. backtesting-strategy-lab

Router: `backtesting-strategy-lab.router.ts` — **`requireAuth` applied at router level (all endpoints authed)**

| # | METHOD | Full Path | Purpose | Request Params/Body | Response Shape | Auth | Data Origin |
|---|---|---|---|---|---|---|---|
| 1 | GET | `/api/v1/backtests/strategies` | List user's saved backtest strategy configs | none (user from JWT) | `BacktestStrategyDto[]` | authed | `backtest_strategies` (Prisma `backtestStrategy`) WHERE `userId` |
| 2 | POST | `/api/v1/backtests/strategies` | Create a new saved backtest strategy | Body: `{ name, config: { mode?, strategyCode?, timeframe?, startDate, endDate, universe, entryRule, exitRule, initialCapital, maxPositions, transactionCostPercent, slippagePercent?, maxHoldingDays?, stopLossPercent?, trailingStopPercent?, takeProfitPercent?, minSignalReadinessScore?, positionSizeType, fixedAmountPerTrade? }, description? }` | `BacktestStrategyDto` | authed | Writes to `backtest_strategies` |
| 3 | GET | `/api/v1/backtests/strategies/:id` | Get one saved backtest strategy | Path: `id` | `BacktestStrategyDto \| 404` | authed | `backtest_strategies` WHERE `id + userId` |
| 4 | PATCH | `/api/v1/backtests/strategies/:id` | Update a saved backtest strategy | Path: `id`; Body: partial strategy fields | `BacktestStrategyDto` | authed | Updates `backtest_strategies` |
| 5 | DELETE | `/api/v1/backtests/strategies/:id` | Delete a saved backtest strategy | Path: `id` | `{ success: true }` | authed | Deletes from `backtest_strategies` |
| 6 | POST | `/api/v1/backtests/strategies/:id/run` | Run a saved strategy config | Path: `id` | `BacktestRunDto` | authed | Reads `signal_results`, `price_ticks`; writes to `backtest_runs` |
| 7 | POST | `/api/v1/backtests/run` | Ad-hoc backtest run (inline config) | Body: full backtest config inline | `BacktestRunDto` | authed | Reads `signal_results`, `price_ticks`; writes to `backtest_runs` |
| 8 | GET | `/api/v1/backtests/runs` | List user's backtest runs | `?region, assetType, limit, offset` | `BacktestRunDto[]` | authed | `backtest_runs` WHERE `userId` |
| 9 | GET | `/api/v1/backtests/runs/:id` | Get one backtest run result | Path: `id` | `BacktestRunDto \| 404` | authed | `backtest_runs` WHERE `id + userId` |
| 10 | DELETE | `/api/v1/backtests/runs/:id` | Delete a backtest run | Path: `id` | `{ success: true }` | authed | Deletes from `backtest_runs` |

**Key tables:** `backtest_strategies` (Prisma `backtestStrategy`: `config` JSON, `userId`), `backtest_runs` (Prisma `backtestRun`: `metrics`, `equityCurve`, `trades` — all JSON columns).

**Notes:**
- No external API calls — backtest simulation uses only persisted `signal_results` and `price_ticks`.
- userId defaults to `'default-user'` when JWT does not include a user id (pre-auth compatibility shim).

---

## 7. trade-plan-risk-engine

Router: `trade-plan-risk-engine.router.ts` — **`requireAuth` applied at router level (all endpoints authed)**

Mount prefix: `/api/v1/trade-plans` (set in `trade-plan-risk-engine.module.ts`)

| # | METHOD | Full Path | Purpose | Request Params/Body | Response Shape | Auth | Data Origin |
|---|---|---|---|---|---|---|---|
| 1 | GET | `/api/v1/trade-plans/health` | Module health stats | none | `{ status, totalPlans, byRiskGrade, byPlanStatus, latestGeneratedAt }` | authed | `trade_plan_results` (Prisma `tradePlanResult`) |
| 2 | GET | `/api/v1/trade-plans/model` | Trade plan model rules | none | Model rules object | authed | **Computed in-process** — no DB |
| 3 | GET | `/api/v1/trade-plans/funnel` | Funnel diagnostics (plan pipeline stats) | `?region, assetType, strategyCode, generatedDate, from, to, backtestTimeframe, includeLegacy` | `{ total, byRiskGrade, byPlanStatus, byPaperReadiness, ... }` | authed | `trade_plan_results` aggregations |
| 4 | GET | `/api/v1/trade-plans/candidates` | Paginated list of trade plan candidates | `?region, assetType, strategyCode, planStatus, riskGrade, minRewardRisk, paperReadyOnly, paperReadinessStatus, backtestTimeframe, strategyRating, readinessLabel, portfolioId, includeLegacy, limit, offset, sortBy, sortDirection` | `{ items: TradePlanResultDto[], total, limit, offset }` | authed | `trade_plan_results` |
| 5 | GET | `/api/v1/trade-plans/:instrumentId` | Latest trade plan for one instrument | Path: `instrumentId`; `?strategyCode, portfolioId, region, assetType` | `TradePlanResultDto \| 404` | authed | `trade_plan_results` WHERE `instrumentId` (latest by `generatedDate`) |
| 6 | POST | `/api/v1/trade-plans/generate` | Generate a single trade plan | Body: `{ instrumentId, symbol, strategyDecisionId?, portfolioId?, region?, assetType?, backtestTimeframe?, riskPercent?, capitalBase?, targetRewardRisk? }` | `TradePlanResultDto` | authed | Reads `strategy_decision_results`, `signal_results`, `strategy_performance_summaries`, `price_ticks`, `data_quality_verdicts`; writes to `trade_plan_results` |
| 7 | POST | `/api/v1/trade-plans/generate/batch` | Batch generate trade plans | Body: `{ batchSize?, offset?, region?, assetType?, strategyCode?, backtestTimeframe?, workerConcurrency? }` | `{ generated, errors, warnings }` | authed | Same as /generate but bulk; reads signal candidates, generates plans |

**Key tables:** `trade_plan_results` (most important: `entryZone`, `stopLoss`, `target`, `rewardRiskRatio`, `riskGrade`, `planStatus`, `paperReadinessStatus`, `instrumentId`, `strategy`, `generatedDate`).

**Notes:**
- GET `/:instrumentId` returns 404 if no persisted plan; the controller comment says "UI should call /generate instead" — effectively forcing the client to trigger generation separately.
- GET `/model` is entirely in-process.
- Batch generation reads candidates from strategy decisions and processes them concurrently (configurable `workerConcurrency`).

---

## 8. signal-position-ledger

Router: `signal-position-ledger.router.ts` — **no `requireAuth`** (public endpoints)

| # | METHOD | Full Path | Purpose | Request Params/Body | Response Shape | Auth | Data Origin |
|---|---|---|---|---|---|---|---|
| 1 | GET | `/api/v1/signals/position-ledger/health` | Module health | none | `{ status, count, latestRefreshAt, ... }` | public | `signal_position_ledger_entries` (or Prisma `signalPositionLedgerEntry`) |
| 2 | GET | `/api/v1/signals/position-ledger/active` | Persisted active position rows (trader-facing) | `?region, assetType, limit, offset, sortBy, sortDirection` | `{ items: SignalPositionLedgerActiveRow[], totalCount, hasMore }` | public | `signal_position_ledger_entries` WHERE `status = 'ACTIVE'` (materialized snapshot) |
| 3 | GET | `/api/v1/signals/position-ledger/closed` | Persisted closed position rows | Same query params | `{ items[], totalCount, hasMore }` | public | `signal_position_ledger_entries` WHERE `status = 'CLOSED'` (materialized snapshot) |
| 4 | GET | `/api/v1/signals/position-ledger/persisted/active` | Legacy alias for /active | Same | Same as /active | public | Same as /active |
| 5 | GET | `/api/v1/signals/position-ledger/persisted/closed` | Legacy alias for /closed | Same | Same as /closed | public | Same as /closed |
| 6 | POST | `/api/v1/signals/position-ledger/active/refresh` | Explicit live refresh of active positions | Query or Body: `{ region, assetType, limit?, offset? }` | `{ runId, status, succeededCount, failedCount, rows[] }` | public | Reads `signal_results` + live price enrichment from `price_ticks`; writes to `signal_position_ledger_entries` + `pipeline_runs` |

**Key tables:** `signal_position_ledger_entries` (Prisma `signalPositionLedgerEntry`: `status`, `scopeRegion`, `scopeAssetType`, materialized row data as JSON columns).

**Notes:**
- Endpoints 2–5 are persisted-read; they serve the last materialized snapshot. Empty/pending if no materialization has been run.
- POST `/active/refresh` is the only write path; it triggers live enrichment and stores the result.
- Legacy aliases (endpoints 4–5) map to the identical controller methods as endpoints 2–3.

**Potential stub/dead concern:** The `activeRows` and `closedRows` controller methods exist in the controller (live-enrichment path) but are NOT registered in the router — only the `persistedActiveRows`/`persistedClosedRows` methods are wired. The live-path methods appear to be unused/dead-code in the current router configuration.

---

## 9. market-intelligence

Router: `market-intelligence.router.ts` — **no `requireAuth`** (public endpoints)

| # | METHOD | Full Path | Purpose | Request Params/Body | Response Shape | Auth | Data Origin |
|---|---|---|---|---|---|---|---|
| 1 | GET | `/api/v1/market-intelligence/stock-interest` | Latest stock interest snapshot | `?region, assetType` | `{ availability, scope, snapshot: StockInterestSnapshotDto, ... }` | public | `stock_interest_snapshots` (Prisma); JOIN `stocks` for catalog data |
| 2 | GET | `/api/v1/market-intelligence/sector-constituents` | Instruments in a sector | `?sector, region, assetType` | `{ availability, sector, region, assetType, constituents[], count, ... }` | public | `stocks` WHERE `sector` + region scope |
| 3 | GET | `/api/v1/market-intelligence/sector-rotation` | Sector rotation map (RRG quadrants) | `?region, assetType` | `{ availability, scope, snapshotDate, sectors: SectorRotationRow[], quadrantCounts, ... }` | public | `sector_context_snapshots` (via `MarketContextIntelligenceService.latestSectorIntelligenceSnapshot`) — persisted read |
| 4 | GET | `/api/v1/market-intelligence/event-feed` | Market event feed (bulk/block deals, FnO bans, breakouts, FII/DII) | `?days (default 5), region` | `{ availability, generatedAt, asOf, days, events: MarketEvent[], eventCount, ... }` | public | `bulk_block_deals`, `fno_ban_list`, `price_ticks` (52W H/L breakouts), `fii_dii_snapshots` — all persisted reads, raw SQL |
| 5 | GET | `/api/v1/market-intelligence/instrument-context/:instrumentId` | Assembled context snapshot for one instrument | Path: `instrumentId` | `{ status, context: InstrumentContextSnapshotDto }` — includes `marketRegime`, `sectorStrength`, `relativeStrength`, `smartMoneyStatus`, `fnoBan`, `latestSignal` | public | `market_context_snapshots`, `sector_context_snapshots`, `stocks`, `price_ticks`, `smart_money_context_snapshots`, `fno_ban_list`, `signal_results` — all persisted reads |
| 6 | GET | `/api/v1/market-intelligence/index-constituents` | Instruments in an index (Nifty50/Bank/etc.) | `?index` | `{ availability, index, indexLabel, membershipSource, constituents[], breadth: { bullishCount, bearishCount } }` | public | Curated static symbol lists (`index-constituents.symbols.ts`) + JOIN `signal_results` for breadth; **no external API** |

**Key tables:** `stock_interest_snapshots`, `sector_context_snapshots`, `market_context_snapshots`, `bulk_block_deals`, `fno_ban_list`, `price_ticks`, `fii_dii_snapshots`, `smart_money_context_snapshots`, `signal_results`, `stocks`.

**Notes:**
- ALL endpoints are persisted-read — no external API calls at request time.
- `instrument-context` is the richest endpoint — assembles 6+ data sources in-process with no writes.
- `index-constituents` uses a **curated static list** (`index-constituents.symbols.ts`) for membership, then enriches with live signal data from the DB. Not dynamic — adding new index members requires code change.
- `event-feed` uses raw SQL against 4 persisted tables to synthesize the feed; entirely in-DB.

---

## Summary

| Module | Endpoint Count | Auth Gate | Notable |
|---|---|---|---|
| signal-generation-engine | 8 | public | Dual equity/crypto planes; POST /run triggers generation |
| signal-quality-lab | 12 | requireAuth (all) | Heavy raw SQL aggregation over `signal_outcomes` |
| signal-calibration-engine | 6 | requireAuth (all) | GET /model = in-process only |
| strategy-decision-engine | 10 | public | POST /evaluate = write trigger; GET /model = in-process |
| strategy-framework | 11 | mixed (2 authed) | POST /evaluate = in-process only (no write); POST /seed + /backtest = authed |
| backtesting-strategy-lab | 10 | requireAuth (all) | `userId` falls back to `'default-user'` when JWT absent |
| trade-plan-risk-engine | 7 | requireAuth (all) | GET /model = in-process; GET /:id returns 404 if no plan |
| signal-position-ledger | 6 | public | 2 legacy alias endpoints; `activeRows`/`closedRows` controller methods dead (not wired in router) |
| market-intelligence | 6 | public | All persisted-read; index-constituents uses static curated lists |
| **TOTAL** | **76** | | |

### External API hits
**None at request time.** All endpoints are backed by Prisma/raw SQL against the local Postgres DB. External data (Yahoo prices, NSE data) is pulled by the pipeline/scheduler layer and stored; the API layer only reads persisted snapshots.

### Stubbed / dead / concerns
1. **`SignalPositionLedgerController.activeRows` and `.closedRows`** — defined in the controller but NOT registered in the router. The router wires only `persistedActiveRows` and `persistedClosedRows`. These two live-enrichment methods are effectively dead code.
2. **`POST /api/v1/signals/run` returns 409 for crypto scope** — intentional by design ("not supported here"), but the error response is not an error per se; it is a routing signal to use the scheduler lane instead.
3. **`GET /api/v1/strategy/model` and `GET /api/v1/strategies/model`** — return in-process static metadata with no DB query. Not stubs — they serve real config — but callers expecting DB-backed data should note these are code-side static objects.
4. **`GET /api/v1/trade-plans/:instrumentId`** — deliberately returns 404 when no plan is persisted and the controller comment explicitly says "UI should call /generate instead". Effectively an opt-in write gate rather than a graceful absent-state pattern. May cause confusion in polling clients.
5. **`backtestStrategy.userId` defaulting to `'default-user'`** — pre-auth compatibility shim that silently bins all backtest data under a sentinel user when JWT does not carry a user ID. This could mix data across users in non-auth environments.
6. **`signal_position_ledger_entries`** — the Prisma delegate access uses `(this.db as any).signalPositionLedgerEntry` with a runtime guard (`if (!delegate || typeof delegate.findMany !== 'function')`). This suggests the table/model may not be in the generated Prisma client and is accessed via a workaround; the guard silently returns empty arrays if the table is absent.
