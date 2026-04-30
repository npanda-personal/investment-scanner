# Signal Quality Lab

## Ownership

`signal-quality-lab` owns historical measurement of Signal Generation Engine results. It calculates forward returns, quality metrics, signal type performance, sector/regime groupings, and noisy signal diagnostics.

It does not create signals, change signal scoring, calibrate weights, optimize strategies, or provide trading advice.

## Endpoints

Mounted under `/api/v1`:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/signals/quality/summary` | Overall signal quality summary |
| GET | `/signals/quality/by-type` | Performance by triggered/negative signal code |
| GET | `/signals/quality/by-sector` | Performance grouped by sector |
| GET | `/signals/quality/by-score` | Performance grouped by MVP score bucket |
| GET | `/signals/quality/by-regime` | Performance grouped by historical market regime snapshot when available |
| GET | `/signals/quality/by-data-quality` | Performance grouped by coverage, readiness, and liquidity status |
| GET | `/signals/quality/noisy` | Noisy/churning signal diagnostics |
| GET | `/signals/:instrumentId/history` | Historical signal results for one instrument |
| GET | `/signals/:instrumentId/outcomes` | Forward-return outcomes for one instrument |
| POST | `/signals/quality/recalculate` | Batch-safe recalculation/progress response because outcomes are on demand |

Supported query params:

- `horizon`: `1D`, `5D`, `10D`, `20D`, `60D`
- `direction`: `BULLISH`, `NEUTRAL`, `BEARISH`
- `sector`
- `country`
- `from`
- `to`
- `limit`
- `minSampleSize`
- `readinessStatus`
- `coverageStatus`
- `liquidityStatus`
- `minReadinessScore`
- `onlySignalReady`
- `excludePoorQuality`

Limits are clamped to safe bounds.

## Data Quality Filters

Signal Quality Lab can restrict measured outcomes to instruments with matching Data Quality Engine evaluations.

Supported filters include readiness status, coverage status, liquidity status, minimum readiness score, signal-ready-only, and excluding poor/unusable coverage.

The summary response includes `dataQualityFilterSummary` with before/after counts, exclusions, missing evaluation count, and whether a filter was applied. Missing data-quality evaluations are not excluded by default, so older signal history remains measurable unless callers opt into stricter filters elsewhere.

The frontend exposes these filters and adds a Performance by Data Quality section.

## Batch Recalculation

`POST /signals/quality/recalculate` is intentionally batch-safe so the frontend does not ask the backend to process the entire signal universe in one request.

Request body or query params:

- `batchSize`: default `25`, clamped from `1` to `100`
- `offset` or `cursor`: default `0`
- `from` optional signal generated-at lower bound
- `to` optional signal generated-at upper bound

Response fields:

- `processedCount`
- `totalCount`
- `batchSize`
- `offset`
- `nextOffset`
- `hasMore`
- `inserted`
- `updated`
- `skipped`
- `warnings`
- `durationMs`

Outcomes are still calculated on demand in this MVP, so the endpoint pages through signal records, reports progress metadata, and returns `inserted = 0`, `updated = 0`, and `skipped = processedCount`. Malformed or unsupported future cached-outcome work should return warnings without turning completed batches into a full failure.

Frontend behavior:

- The `/signals/quality` Recalculate button runs batches sequentially.
- The button shows a spinner and remains disabled while the loop is active.
- After every successful batch, the dashboard refetches summary, type, sector, regime, and noisy-signal data.
- If one batch fails, the loop stops and leaves already completed batches intact.

## Outcome Methodology

Outcomes are calculated on demand from Market Data Foundation historical adjusted close data.

For each signal:

1. Find the first available price on or after `generatedAt`.
2. Calculate forward returns after 1, 5, 10, 20, and 60 trading rows.
3. Mark a horizon unavailable when there is not enough future price data.
4. Calculate max favorable move, max adverse move, and max drawdown inside the 60-row forward window when available.

No `SignalOutcome` table is persisted in this MVP.

## Win-Rate Definition

- Bullish signal wins when forward return is greater than `0`.
- Bearish signal wins when forward return is less than `0`.
- Neutral signals are excluded from default win-rate calculations.

## Score Buckets

The module documents MVP score buckets:

- `0-39`
- `40-69`
- `70-84`
- `85-100`

The API exposes score bucket grouping at `/signals/quality/by-score`. The first UI focuses on type, sector, and overall metrics.

## Signal Type Parsing

The module parses `triggered_signals` and `negative_signals` JSON from Signal Generation Engine. It expects objects with:

- `code`
- `label`
- `category`

If shapes vary, missing fields fall back to `UNKNOWN` or the available label/code.

## Noisy Signal Rules

MVP rules:

- `DIRECTION_FLIPS`: 3 or more direction changes for the same instrument in 30 days.
- `FAILED_HIGH_SCORE_BULLISH`: score `>= 70` and 10D return `< -3%`.
- `FAILED_BEARISH`: bearish signal and 10D return `> 3%`.
- `LOW_CONFIDENCE_SIGNAL`: low-confidence signals are flagged for caution.
- `STALE_SIGNAL`: latest signal older than 7 days.

## Model Version

`SignalResult.modelVersion` was added with default value `signal-engine-v1`. Existing rows receive this default through the migration.

Signal Generation now also persists a normalized `generatedDate` for new rows. Signal results are daily idempotent by `instrumentId + modelVersion + generatedDate`, so repeated same-day manual generation updates the logical signal instead of inflating historical outcome samples.

## Frontend

Frontend feature:

- `frontend/src/features/signal-quality-lab`

Route:

- `/signals/quality`

The dashboard shows quality summary cards, performance by signal type, performance by sector, regime context state, noisy signals, and instrument-level signal history/outcomes.

The dashboard links to `/signals/calibration`, where Signal Calibration Engine applies explainable score and confidence adjustments using these measured outcomes.

## Performance And UX Behavior

- Dashboard API calls are bounded by a conservative default `limit` so the page can load quickly on local datasets.
- Recalculation is never triggered on page load. The frontend runs manual recalculation in batches and refreshes visible quality data after each batch.
- Instrument history uses a searchable instrument selector rather than raw IDs.
- Empty states distinguish no raw signal data from insufficient future price data or no data after filters.

## Historical Context Integration

Regime grouping uses `historical-context-snapshots` when persisted market snapshots are available. Each signal's `generatedAt` date is mapped to the nearest market context snapshot on or before that date within the default snapshot lookup window.

If snapshots are unavailable, the API returns the documented `MISSING_REGIME_CONTEXT` grouping.

## Known Limitations

- Outcomes need future prices after signal generation; fresh signals may be unevaluated.
- Regime grouping depends on historical context snapshots being generated near signal dates.
- No signal calibration, strategy optimization, or trading recommendations.
- No outcome persistence table yet.

## Verification

Run from `backend`:

- `npx.cmd prisma generate`
- `npm.cmd run build`
- `npm.cmd test -- signal-quality-lab --runInBand`

Run from `frontend`:

- `npm.cmd run build`
