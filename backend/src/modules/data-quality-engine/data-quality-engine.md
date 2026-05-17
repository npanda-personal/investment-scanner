# Data Quality Engine

Data Quality Engine evaluates whether Market Data Foundation instruments have enough clean data for downstream research workflows. It is a gatekeeper for Signal Generation, Signal Quality, Calibration, Strategy Framework, Backtesting, Strategy Decision, and Trade Plan readiness.

The module remains a flat backend module and a dedicated frontend feature. It consumes Market Data Foundation through its public service/API surface and does not import another module's repository directly.

## Ownership

Data Quality Engine owns:

- Coverage scoring.
- Signal readiness scoring.
- Liquidity scoring.
- Data gaps, blockers, warnings, and recommended fixes.
- Batch-safe evaluation workflows.
- Readiness filters for downstream modules.
- Data quality dashboard and diagnostics UI.

It does not own market data ingestion, provider validation, signal scoring, strategy decisions, backtests, or trade planning.

## Backend Files

- `data-quality-engine.router.ts`: Registers `/api/v1/data-quality/*` endpoints.
- `data-quality-engine.controller.ts`: Request handlers.
- `data-quality-engine.service.ts`: Evaluation, scoring, eligibility filtering, and batch orchestration.
- `data-quality-engine.repository.ts`: Prisma access for `DataQualityEvaluation`.
- `data-quality-engine.validation.ts`: Query and evaluate request parsing.
- `data-quality-engine.types.ts`: DTOs and response contracts.

## API

| Endpoint | Purpose |
| --- | --- |
| `GET /api/v1/data-quality/summary` | Region/asset-scoped summary metrics. |
| `GET /api/v1/data-quality/instruments` | Paginated, filtered evaluation list. |
| `GET /api/v1/data-quality/instruments/:instrumentId` | Latest diagnostics for one instrument; evaluates on demand when missing. |
| `GET /api/v1/data-quality/signal-readiness` | Convenience list defaulting to `READY`. |
| `GET /api/v1/data-quality/liquidity` | Convenience liquidity-focused list. |
| `POST /api/v1/data-quality/evaluate` | Bounded batch evaluation. |

List endpoints return:

```json
{
  "items": [],
  "pagination": {
    "total": 0,
    "limit": 25,
    "offset": 0,
    "nextOffset": null,
    "hasMore": false
  }
}
```

## Filters

Supported list filters:

- `search`: Partial symbol/company search.
- `status`: Coverage status: `GOOD`, `PARTIAL`, `POOR`, `UNUSABLE`.
- `readinessStatus`: `READY`, `LIMITED`, `NOT_READY`.
- `liquidityStatus`: `LIQUID`, `THIN`, `ILLIQUID`, `UNKNOWN`.
- `sector`: Case-insensitive partial match.
- `country`: Case-insensitive partial match.
- `eligibleForSignals`: Boolean.
- `eligibleForBacktesting`: Boolean.
- `region`: Global market region.
- `assetType`: Global asset type. `STOCK` includes legacy `EQUITY` rows for compatibility.
- `limit` / `offset`: Bounded pagination.
- `sortBy` / `sortOrder`: Allowlisted sorting. Unknown sort fields fall back safely.

Region and asset scope are applied through the related `Stock` relation so evaluated rows do not leak across markets.

## Scoring

Coverage considers:

- Price history length.
- Latest price availability and freshness.
- Fundamentals availability.
- Corporate action availability.
- Sector, industry, country, and currency metadata.
- Volume availability.
- Adjusted close availability.

Signal readiness considers:

- RSI/SMA50/SMA200 history sufficiency.
- Latest price staleness.
- Volume availability.
- Sector/country context.
- Liquidity score.

Liquidity considers recent volume, median/average volume, zero-volume ratio, and sample sufficiency.

## Eligibility

- `eligibleForSignals`: readiness score is at least 70 and latest price is not stale.
- `eligibleForBacktesting`: at least 252 price rows and latest price is not stale.
- `eligibleForCalibration`: at least one signal history row and at least 60 price rows.

Downstream modules should consume these public outputs or `filterEligibleInstruments` instead of duplicating readiness rules.

## Batch Evaluation

`POST /api/v1/data-quality/evaluate` processes bounded batches and returns:

- `processedCount`
- `totalCount`
- `batchSize`
- `offset`
- `nextOffset`
- `hasMore`
- `evaluatedCount`
- `skippedCount`
- `failedCount`
- `warnings`
- `durationMs`

The frontend owns user-triggered orchestration across batches and shows progress until `hasMore=false`. The page uses the shared batch runner with module-owned defaults:

- `data_quality_engine_batch_size = 100`
- `data_quality_engine_batch_request_workers_count = 4`

The backend remains bounded at a maximum `batchSize` of 100. The frontend overlaps independent offsets after the first batch discovers `totalCount`, then refreshes the visible table and summary after completion.

## Frontend UX

`DataQualityEnginePage` follows the shared UX guidance:

- Page header with primary `Evaluate Scope` action.
- Region/asset scope message.
- Market Data Foundation review-readiness summary display for the same `region / assetType`, including review mode, trust status, trusted/catalog counts, data-through date, and the next bounded Market Data repair action. Data Quality only displays this Market Data-owned contract and does not recalculate provider, price, or Trusted Review Universe state.
- Summary cards for evaluated coverage, signal-ready count, blocked count, and data issues.
- `Quality Views` tab strip for common workflows:
  - All
  - Signal Ready
  - Blocked
  - Poor Coverage
  - Low Liquidity
  - Backtest Ready
- Compact filter bar for search, coverage, readiness, liquidity, sector, and signal eligibility.
- Shared `DataTable` for pagination, sorting, loading, and empty states.
- Row click opens a diagnostics drawer with scores, eligibility, gaps, blockers, warnings, and recommended fixes.
- Evaluate Scope uses shared progress UI with processed / total, batch count, evaluated, skipped, failed, and warnings counts.

## Known Limitations

- Holiday/session-specific staleness is inherited from Market Data Foundation and uses a simple day threshold in this module.
- Liquidity thresholds are simple daily-volume heuristics and can be tuned by market later.
- `POOR` and `ILLIQUID` view presets currently target the strictest diagnostic states. Broader multi-status presets can be added if the API gains multi-value filters.
- Backend evaluation currently processes each bounded batch with per-instrument error isolation; frontend request parallelism is the coordinated acceleration strategy for full-scope runs.
- The implementation follows `AGENTS.md`, `docs/architecture.md`, and `docs/ux-ui-best-practices.md`: module boundaries stay flat, Market Data Foundation is consumed through public exports, batch work remains bounded, and the UI uses shared table/filter/page patterns where practical.

## Verification

- `npm run build`
- `npm test -- data-quality --runInBand`
- `npm run build` in frontend when UI changes are made.
