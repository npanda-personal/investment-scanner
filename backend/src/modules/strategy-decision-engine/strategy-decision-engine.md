# Strategy Decision Engine

The Strategy Decision Engine converts data from all research modules into actionable trade and exit decisions. It is fully integrated with the **Global Market Scope**.

## Global Market Scope Integration

Strategy decisions and market gate status are region-aware:
- `region`: (IN, US, EU, GLOBAL) filters candidates and evaluations.
- `assetType`: (STOCK) filters the target universe.

### Market Gate
The `marketGate` endpoint accepts a `region` parameter. This ensures the "OPEN/CLOSED" verdict is based on the breadth and regime of the specific market the user is currently researching.

### Candidates & Evaluation
- `GET /api/v1/strategy/candidates`: Supports `region` and `assetType` query parameters.
- `POST /api/v1/strategy/evaluate`: Respects the provided `region` for universe resolution and market gate checks.

## API Reference

| Endpoint | Purpose | Region Support |
| --- | --- | --- |
| `GET /api/v1/strategy/market-gate` | Region-aware market tradeability | Supported |
| `GET /api/v1/strategy/candidates` | Trade candidates per region | Supported |
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

Research Hub consumes these additive fields to build strategy-proof-driven priority buckets. Framework-backed decisions with missing proof are kept as watch candidates rather than promoted as top trade candidates.

### Missing Data Behavior

The context builder treats related module data as optional. Missing market context, sector context, smart-money context, raw signals, calibration, data quality, or price history produces `dataGaps`, warnings, blockers, or conservative decisions. Missing optional context must not produce a 500 response.

Conservative defaults:

- missing market context does not become healthy
- missing smart-money context does not become supportive
- missing data quality does not become ready
- unknown market gate lowers confidence and blocks strong long candidates

### Market Gate Strictness

- `CLOSED`: long-entry strategies return `AVOID` and include the blocker “Market gate is closed; no new long trades.”
- `SELECTIVE`: long-entry strategies include “Market is selective; only high-quality setups should be reviewed.” Strong candidates require a higher framework score.
- `UNKNOWN`: long-entry strategies add a data gap and avoid strong candidate output.

### Persistence

`StrategyDecisionResult` remains daily-idempotent by `instrumentId + strategy + modelVersion + generatedDate`. Framework-backed metadata is stored additively on the same row, so same-day re-evaluation updates rather than duplicates the decision.

### Temporary Logic

The previous private evaluators remain in the service as fallback only when a framework definition/evaluation cannot be loaded. They are not the primary path for the migrated overlapping strategies.

## Frontend
- `StrategyDecisionDashboard`: Subscribes to `useMarketScope()`. Automatically refetches candidates when the region changes.
- Supports a local `Region Override` for specific comparisons.
- Shows framework-backed strategy version metadata where available without changing the existing dashboard layout.

## Verification

- `npx prisma generate`
- `npm run build` in `backend`
- `npm test -- strategy-decision-engine --runInBand` in `backend`
- `npm test -- strategy-framework --runInBand` in `backend`
- `npm test -- research-hub --runInBand` in `backend`
- `npm run build` in `frontend`
