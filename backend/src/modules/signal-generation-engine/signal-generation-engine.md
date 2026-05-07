# Signal Generation Engine

The Signal Generation Engine owns daily/on-demand signal generation, composite scoring, and persistence. It is fully integrated with the **Global Market Scope**, allowing users to filter signals and generation runs by region.

## Global Market Scope Integration

All signal APIs and dashboard views respect the global `region` and `assetType` context:
- `region`: Filter signals by mapped exchanges and country metadata (IN, US, EU, GLOBAL).
- `assetType`: Filter signals by asset class (default: STOCK).

### Backend Support
The following filters are standardized in the `SignalQuery` and `SignalRunRequest` DTOs:
- `region`: Standard region code.
- `assetType`: Asset class code.

Repositories use the shared `resolveRelatedMarketRegionFilter` helper to join results with stock metadata for accurate regional filtering.

## API Reference

| Endpoint | Purpose | Region Support |
| --- | --- | --- |
| `GET /api/v1/signals/top` | Top signals with score thresholds | Supported |
| `GET /api/v1/signals/screener`| Filtered signal screener | Supported |
| `POST /api/v1/signals/run` | Manual generation for a region or list | Supported |

## Batch Generation Behavior

`POST /api/v1/signals/run` processes one bounded batch per request. It accepts `batchSize` or `limit`, `offset`, `region`, `assetType`, data-quality filter flags, and optional Strategy Framework matching flags. Batch size defaults to 25 and is clamped to 100.

The frontend owns user-triggered full-universe orchestration: it starts with `offset=0`, calls the backend once per batch, advances with `nextOffset`, and stops only when `hasMore=false` or a fatal batch error occurs. The run button stays disabled while this loop is active and the dashboard shows a real progress bar based on `processedCount / totalCount`.

The run response remains backward-compatible with `generated`, `skipped`, `errors`, `warnings`, `results`, and `generated_at`, and additively includes `processedCount`, `totalCount`, `batchSize`, `offset`, `nextOffset`, `hasMore`, `generatedCount`, `updatedCount`, `skippedCount`, `failedCount`, `directionCountsGenerated`, `scope`, `latestGeneratedAt`, and `durationMs`. One instrument failure increments `failedCount` and does not stop the rest of the batch when the remaining instruments can continue safely.

Raw signal scoring and direction thresholds are unchanged.

## Table/List Behavior

`GET /api/v1/signals/top` and `GET /api/v1/signals/screener` support `region`, `assetType`, `direction`, `confidence`, `minScore`, strategy filters, `limit`, `offset`, `sortBy`, and `sortDirection`. Direction filters are normalized case-insensitively to stored values: `BULLISH`, `NEUTRAL`, and `BEARISH`. `assetType=STOCK` includes current `STOCK` rows plus existing `EQUITY` and legacy `null` stock asset types so scoped signal lists remain compatible with the current catalog.

List responses still return `signals`, `total`, `limit`, and `offset`, and add `items`, `totalCount`, `hasMore`, `filtersApplied`, `scope`, and `directionCounts`. Direction counts are scoped to the current region/asset type and current non-direction filters so tabs can show `Bullish (X)`, `Bearish (Y)`, and `Neutral (Z)`.

After the final frontend batch completes, the Signal Generation page resets pagination to page 1 and refetches the current table with the same `region` and `assetType` used for the run. The selected direction tab is preserved. If the selected tab has no rows but other directions do, the empty state explains the available direction counts instead of contradicting the run summary.

Known limitations:
- The dashboard does not currently implement cancel/retry for signal generation batches.
- Data quality filtering is applied per bounded batch; progress metadata is based on the selected scoped instrument universe.
- Remaining batch-like workflows should adopt the shared `BatchProgressBar`/`useBatchRunner` pattern during their next safe module-owned pass.

## Scoring and Signals
Composite score (0-100) is calculated from Technical, Momentum, and Fundamental signals.

... (rest of definition remains same) ...

## Strategy Framework Integration

Raw signal generation remains owned here. Strategy Framework is consumed only as an opt-in strategy-aware enrichment path so existing signal behavior is preserved.

Supported request/query flags:
- `strategyCode`
- `includeStrategyMatches`
- `onlyStrategyEligible`
- `excludeNoiseFiltered`
- `hasStrategyMatch`
- `hasBlockedStrategies`
- `frameworkBackedDecisionAvailable`

When enabled, signal results may include `strategyMatches[]` and `blockedStrategies[]` explaining which registered strategies matched or were blocked by noise filters/data gaps. These arrays are derived on demand and are not part of raw `SignalResult` persistence.

`strategyMatches[]` includes `strategyCode`, `strategyName`, `strategyVersion`, `decision`, `score`, `confidence`, `reasons`, `entryRulesPassed`, `readinessLabel`, and `ratingGrade`.

`blockedStrategies[]` includes `strategyCode`, `strategyName`, `strategyVersion`, `blockers`, `warnings`, `dataGaps`, `noiseFiltersTriggered`, and a compact `reason`.

Filtering behavior:
- `onlyStrategyEligible=true`: keeps signals with at least one Strategy Framework match.
- `excludeNoiseFiltered=true`: removes signals where all considered strategies were blocked by noise filters.
- `hasStrategyMatch=true`: keeps signals with at least one match.
- `hasBlockedStrategies=true`: keeps signals with at least one blocked strategy.
- `strategyCode=CODE`: evaluates only that registered strategy for enrichment/filtering.

Performance boundaries:
- Default signal endpoints remain lightweight unless strategy matching flags are present.
- Strategy matching runs only for returned rows.
- Matching fetches bounded price history for those rows and uses Strategy Framework evaluators instead of duplicating strategy rules.
- Individual Strategy Framework matching failures produce a blocked strategy entry instead of failing the whole signal response.

Product language:
- Raw signal score/direction is a confirmation input.
- Strategy Decision remains the candidate review surface.
- Signal UI should not label raw signals as trade decisions.

## Frontend Structure
- `SignalsDashboardPage`: Subscribes to `useMarketScope()`. Automatically refetches signals when the header region changes.
- `Manual Run`: Generation runs default to the active market scope.

## Tests
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`: Verifies scoring and thresholds.
- `backend/src/shared/utils/market-scope.test.ts`: Verifies regional filtering logic.
