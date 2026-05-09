# Strategy Decision Engine

The Strategy Decision Engine converts data from research modules into strategy-backed review candidates, watch states, avoid states, and exit-risk review decisions. It is fully integrated with the **Global Market Scope** and remains research support only.

## Global Market Scope Integration

Strategy decisions and market gate status are region-aware:
- `region`: (IN, US, EU, GLOBAL) filters candidates and evaluations.
- `assetType`: (STOCK) filters the target universe.

### Market Gate
The `marketGate` endpoint accepts a `region` parameter. This ensures the "OPEN/CLOSED" verdict is based on the breadth and regime of the specific market the user is currently researching.

### Candidates & Evaluation
- `GET /api/v1/strategy/candidates`: Supports `region` and `assetType` query parameters.
- `POST /api/v1/strategy/evaluate`: Respects the provided `region` for universe resolution and market gate checks.
- Evaluation is batch-oriented. Callers should use `batchSize` plus `offset`; the backend evaluates only the requested page, returns `nextOffset`, and uses bounded worker-style concurrency inside the request.

## API Reference

| Endpoint | Purpose | Region Support |
| --- | --- | --- |
| `GET /api/v1/strategy/market-gate` | Region-aware market tradeability | Supported |
| `GET /api/v1/strategy/candidates` | Review candidates per region | Supported |
| `POST /api/v1/strategy/evaluate` | Batch evaluation for a specific region | Supported |

## Scoring Methodology
... (rest of definitions) ...

## Strategy Framework Migration Note

This module preserves its existing decision API and persisted `StrategyDecisionResult` behavior. The overlapping strategies are now evaluated through Strategy Framework public exports:

- `TREND_MOMENTUM`
- `PULLBACK_IN_UPTREND`
- `DEFENSIVE_EXIT`

Strategy Framework is the source of truth for reusable strategy metadata, versions, rule declarations, deterministic evaluator behavior, backtest integration, ratings, and conservative readiness labels. Strategy Decision Engine adapts framework evaluator output into the existing `/api/v1/strategy/*` response shape.

### Output Adapter

Framework output is mapped to existing Strategy Decision fields:

- `strategyCode` -> `strategy`
- `decision` -> existing `decision` values such as `TRADE_CANDIDATE`, `WATCH`, `AVOID`, `EXIT_CANDIDATE`, `REDUCE_RISK`, and `HOLD`
- `score` -> `decisionScore`
- `confidence`, `reasons`, `blockers`, `warnings`, and `dataGaps` are preserved
- framework rule arrays are exposed additively as `entryRulesPassed`, `exitRulesTriggered`, and `noiseFiltersTriggered`

Additive compatibility fields:

- `frameworkBacked`
- `strategyVersion`
- `frameworkDecision`
- `frameworkAction`
- `strategyRating`
- `readinessLabel`

Research Hub consumes these additive fields to build strategy-proof-driven priority buckets. Framework-backed decisions with missing proof are kept as watch candidates rather than promoted as top review candidates.

Signal Generation links to Strategy Decision using `/strategy?instrumentId=...` so raw signals can be reviewed through the candidate/risk language owned by this module.

### Missing Data Behavior

The context builder treats related module data as optional. Missing market context, sector context, smart-money context, raw signals, calibration, data quality, or price history produces `dataGaps`, warnings, blockers, or conservative decisions. Missing optional context must not produce a 500 response.

Conservative defaults:

- missing market context does not become healthy
- missing smart-money context does not become supportive
- missing data quality does not become ready
- unknown market gate lowers confidence and blocks strong long candidates

### Market Gate Strictness

- `CLOSED`: long-entry strategies return `AVOID` and include the blocker "Market gate is closed; no new long candidates."
- `SELECTIVE`: long-entry strategies include “Market is selective; only high-quality setups should be reviewed.” Strong candidates require a higher framework score.
- `UNKNOWN`: long-entry strategies add a data gap and avoid strong candidate output.

### Persistence

`StrategyDecisionResult` remains daily-idempotent by `instrumentId + strategy + modelVersion + generatedDate`. Framework-backed metadata is stored additively on the same row, so same-day re-evaluation updates rather than duplicates the decision.

Persisted decision rows include the existing API-compatible `scoreBreakdown` JSON payload. `entryZone` is serialized before persistence and parsed back for API responses, matching the current Prisma column shape while preserving the frontend response contract.

### Evaluation Performance

`POST /api/v1/strategy/evaluate` does not run full-universe work. For the default latest-signal universe it reads the requested page through Signal Generation Engine public APIs (`latestSignalUniverse` and count), then processes instruments with bounded concurrency. When `strategy = ALL`, instrument context is built once per instrument and reused across the framework-backed strategies instead of refetching prices, data quality, smart-money, and market context per strategy.

The service also reuses request-local Strategy Framework performance/rating lookups by `strategyCode + region + assetType`. This keeps repeated framework-backed decisions from issuing duplicate rating queries during the same batch.

Evaluation uses persisted-only child context where available: latest raw signals from the latest-signal universe, latest persisted market-context snapshot, latest persisted calibration, latest persisted data-quality evaluation, and latest persisted smart-money snapshot. Missing persisted context is surfaced as `dataGaps`; Strategy Decision Evaluate should not trigger market-context generation, calibration runs, data-quality evaluations, smart-money snapshot calculation, backtests, or signal generation during a batch.

### Temporary Logic

The previous private evaluators remain in the service as fallback only when a framework definition/evaluation cannot be loaded. They are not the primary path for the migrated overlapping strategies.

## Frontend
- `StrategyDecisionDashboard`: Subscribes to `useMarketScope()`. Automatically refetches candidates when the region changes.
- Supports a local `Region Override` for specific comparisons.
- Shows framework-backed strategy version metadata where available without changing the existing dashboard layout.
- Uses review-candidate/risk-level language in the UI while preserving existing API enum values such as `TRADE_CANDIDATE` for backward compatibility.
- The Evaluate tab runs the current latest-signal universe in bounded batches of up to 100 instruments per backend request, updates progress after each batch, and refreshes visible tables once the full run completes.
- Placeholder watchlist/all-eligible/portfolio universe choices are intentionally not shown until real selectors are wired, avoiding dead-end controls.

## Query Hardening

- Candidate reads use an allowlist for `sortBy`; unknown fields fall back to `generatedAt desc` instead of reaching Prisma with arbitrary keys.
- `assetType=STOCK` includes legacy `EQUITY` stock rows for compatibility while newer Market Data Foundation rows normalize to `STOCK`.
- Exit-risk reads accept the same `region` and `assetType` scope as candidate reads.
- Symbol-triggered evaluation sends `region` and `assetType` to Market Data Foundation and matches symbol, display symbol, provider symbol, or source symbol aliases.

## Verification

- `npx prisma generate`
- `npm run build` in `backend`
- `npm test -- strategy-decision-engine --runInBand` in `backend`
- `npm test -- strategy-framework --runInBand` in `backend`
- `npm test -- research-hub --runInBand` in `backend`
- `npm run build` in `frontend`

## Trade Plan Risk Engine Integration

Strategy Decision outputs can now be used to generate Trade Plans via the Trade Plan Risk Engine. Links to "View Trade Plan" have been added to the Strategy Decision Dashboard to easily navigate to the generated plans.
