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

Repositories compose the shared `resolveMarketRegionFilter` helper through the `stock` relation for accurate regional filtering.

## API Reference

| Endpoint | Purpose | Region Support |
| --- | --- | --- |
| `GET /api/v1/signals/top` | Top signals with score thresholds | Supported |
| `GET /api/v1/signals/screener`| Filtered signal screener | Supported |
| `POST /api/v1/signals/run` | Manual generation for a region or list | Supported |

## Batch Generation Behavior

`POST /api/v1/signals/run` processes one bounded batch per request. It accepts `batchSize` or `limit`, `offset`, `region`, `assetType`, data-quality filter flags, and optional Strategy Framework matching flags. Batch size defaults to 25 and is clamped to 100. `batchSize`/`limit` is a per-request batch size, not a total "run all" cap; full-universe execution is frontend orchestration over repeated bounded requests.

The frontend owns user-triggered full-universe orchestration: it starts with `offset=0`, calls the backend once per batch, advances with `nextOffset`, and stops only when `hasMore=false` or a fatal batch error occurs. The run button stays disabled while this loop is active and the dashboard shows a real progress bar based on `processedCount / totalCount`.

The run response remains backward-compatible with `generated`, `skipped`, `errors`, `warnings`, `results`, and `generated_at`, and additively includes `processedCount`, `totalCount`, `batchSize`, `offset`, `nextOffset`, `hasMore`, `generatedCount`, `updatedCount`, `noOpCount`, `skippedCount`, `failedCount`, `directionCountsGenerated`, `scope`, `latestGeneratedAt`, `eligibleInstrumentCount`, `attemptedGenerationCount`, and `durationMs`. One instrument failure increments `failedCount` and does not stop the rest of the batch when the remaining instruments can continue safely.

`SignalResult` persistence is idempotent by `instrumentId + modelVersion + generatedDate`. Same-day reruns update the logical row instead of creating duplicates. The repository also exposes additive write status metadata (`CREATED`, `UPDATED`, `NO_OP`) so run summaries can distinguish new rows from same-day updates and unchanged reruns.

When `useDataQualityFilter=true`, the response includes data-quality counts: `beforeFilter`, `afterFilter`, `eligibleInstrumentCount`, `attemptedGenerationCount`, `excludedByDataQuality`, and `missingQualityEvaluationCount`. These counts are separate from generation failures so skipped rows are easier to diagnose.

Raw signal scoring and direction thresholds are unchanged.

## Table/List Behavior

`GET /api/v1/signals/top` and `GET /api/v1/signals/screener` support `region`, `assetType`, `direction`, `confidence`, `minScore`, `signalType`, strategy filters, `limit`, `offset`, `sortBy`, and `sortDirection`. Direction filters are normalized case-insensitively to stored values: `BULLISH`, `NEUTRAL`, and `BEARISH`. Region inputs are normalized to canonical scope codes, and `assetType=STOCK` includes current `STOCK` rows plus existing `EQUITY` and legacy `null` stock asset types so scoped signal lists remain compatible with the current catalog.

Latest means the actual latest persisted signal per instrument. List endpoints first reduce to the latest row per instrument within scope/date/search filters, then apply `direction`, `confidence`, `minScore`, and `signalType`. This prevents an older bullish row from appearing when the current latest row is neutral or bearish.

List responses still return `signals`, `total`, `limit`, and `offset`, and add `items`, `totalCount`, `hasMore`, `filtersApplied`, `scope`, and `directionCounts`. Direction counts are scoped to the current region/asset type and current non-direction filters so tabs can show `Bullish (X)`, `Bearish (Y)`, and `Neutral (Z)`. Counts are based on latest rows, not historical rows.

Supported `sortBy` values are allowlisted: `score`, `symbol`, `companyName`, `generatedAt`, `direction`, `confidence`, and `dailyChangePercent`. Unknown sort fields safely fall back to `score`. `sortDirection` accepts `asc` or `desc`.

After the final frontend batch completes, the Signal Generation page resets pagination to page 1 and refetches the current table with the same `region` and `assetType` used for the run. The selected direction tab is preserved. If the selected tab has no rows but other directions do, the empty state explains the available direction counts instead of contradicting the run summary.

Known limitations:
- The dashboard does not currently implement cancel/retry for signal generation batches.
- Data quality filtering is applied per bounded batch; progress metadata is based on the selected scoped instrument universe.
- List retrieval currently reduces latest rows in application code after a scoped Prisma fetch. This is acceptable for local-sized universes but should become a window-function/raw-query or dedicated latest table if the persisted signal history grows substantially.
- Enrichment still performs per-row previous-close lookups and per-row strategy price-history lookups when strategy matching is requested because no public batch previous-close/history API exists yet.
- Backend batch offsets are expected to use the `nextOffset` returned by the previous response. Arbitrary non-batch-aligned offsets are not a supported user workflow.

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
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.repository.test.ts`: Verifies idempotent upsert, write status, latest-row filtering, direction counts, asset scope compatibility, and sort allowlisting.
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`: Verifies scoring, thresholds, batch metadata, data-quality counts, stale data warnings, confidence behavior, and Strategy Framework canonical region context.
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.validation.test.ts`: Verifies query/run parsing, direction normalization, scope normalization, offset parsing, and sort allowlisting.

Verification commands:

```bash
npm run build
npm test -- signal-generation-engine --runInBand
```
