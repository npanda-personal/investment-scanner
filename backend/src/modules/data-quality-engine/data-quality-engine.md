# Data Quality Engine

## Ownership

`data-quality-engine` owns instrument data coverage, signal readiness, liquidity/tradability diagnostics, and downstream eligibility flags.

It does not ingest market data, add providers, create signals, calibrate signals, or make investment recommendations. Market Data Foundation remains the source of truth for instruments, prices, fundamentals, and corporate actions.

## Endpoints

Mounted under `/api/v1`:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/data-quality/summary` | Platform-level evaluation summary |
| GET | `/data-quality/instruments` | Latest evaluations with filters |
| GET | `/data-quality/instruments/:instrumentId` | Detailed diagnostics for one instrument; evaluates on demand if missing |
| POST | `/data-quality/evaluate` | Batch-safe manual evaluation runner |
| GET | `/data-quality/signal-readiness` | Signal-ready evaluation list |
| GET | `/data-quality/liquidity` | Liquidity/tradability evaluation list |

Query filters:

- `status`: `GOOD`, `PARTIAL`, `POOR`, `UNUSABLE`
- `readinessStatus`: `READY`, `LIMITED`, `NOT_READY`
- `liquidityStatus`: `LIQUID`, `THIN`, `ILLIQUID`, `UNKNOWN`
- `sector`
- `country`
- `minCoverageScore`
- `minReadinessScore`
- `limit`
- `offset` or `cursor`

Limits are clamped to safe values.

## Persistence

Prisma model:

- `DataQualityEvaluation`

The MVP uses one latest row per instrument via upsert on `instrumentId`. This keeps the dashboard fast and simple. Historical evaluation history is out of scope for this epic.

Stored fields include coverage score/status, signal readiness score/status, liquidity score/status, eligibility flags, gaps, warnings, readiness reasons/blockers, and evaluation timestamp.

## Coverage Methodology

Coverage score is `0-100` and considers:

- price history rows
- latest price freshness
- fundamentals availability
- corporate actions availability
- sector, industry, country, and currency metadata
- volume availability
- adjusted-close fallback detection

Coverage status:

- `GOOD`: `80-100`
- `PARTIAL`: `60-79`
- `POOR`: `30-59`
- `UNUSABLE`: `0-29`

## Signal Readiness

Signal readiness checks whether the instrument has enough usable data for downstream engines.

MVP minimums:

- RSI: at least 14 price rows
- SMA50: at least 50 price rows
- SMA200: at least 200 price rows
- backtesting: at least 252 price rows
- latest price should not be stale
- volume, sector, and country improve readiness

Readiness status:

- `READY`: score `>= 75`
- `LIMITED`: score `50-74`
- `NOT_READY`: score `< 50`

Eligibility flags:

- `eligibleForSignals`: readiness score `>= 70` and latest price is not stale
- `eligibleForBacktesting`: at least 252 price rows and latest price is not stale
- `eligibleForCalibration`: at least one raw signal exists and at least 60 price rows exist

## Liquidity Methodology

Liquidity is a free/local approximation using recent historical volume:

- 20-day average volume
- 20-day median volume
- 60-day zero-volume ratio
- recent volume availability

Statuses:

- `LIQUID`
- `THIN`
- `ILLIQUID`
- `UNKNOWN`

The thresholds are intentionally conservative and not US-only; missing volume returns `UNKNOWN`.

## Batch Evaluation

`POST /data-quality/evaluate` supports single instrument, symbol, or universe batch mode.

Request:

- `instrumentId` optional
- `symbol` optional
- `batchSize`: default `25`, clamped `1-100`
- `offset` or `cursor`: default `0`

Response:

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

The frontend runs sequential batches, refreshes summary and table data after each batch, and keeps the action button disabled with a spinner until the run completes. Individual instrument failures are counted and returned as warnings without failing the entire batch.

## Frontend

Frontend feature:

- `frontend/src/features/data-quality-engine`

Route:

- `/data-quality`

The dashboard shows summary cards, a batch evaluation runner, filterable instrument quality table, and a diagnostics panel with gaps, blockers, warnings, recommended fixes, and research links.

## Downstream Integration

Public service methods:

- `getLatestEvaluationForInstrument(instrumentId)`
- `getEvaluationsForInstruments(instrumentIds)`
- `filterEligibleInstruments(instrumentIds, options)`

Downstream modules consume these methods through the module index and never import the repository directly.

Current consumers:

- Signal Generation can optionally filter batch runs by readiness/coverage/liquidity.
- Signal Quality Lab can filter measured outcomes by readiness, coverage, liquidity, and signal-ready eligibility.
- Signal Calibration applies bounded data-quality penalties and includes the latest evaluation in comparison responses.
- Backtesting can optionally filter the universe before simulation and returns before/after metadata in metrics.

Missing evaluations do not block existing workflows by default. Callers may opt into skip behavior.

## Known Limitations

- Evaluation history is not retained; latest row per instrument is upserted.
- Missing-price-row detection is approximate and based on available row counts.
- Liquidity is a local volume approximation, not a venue-specific tradability model.
- No new data providers or paid data sources are added.

## Verification

Run from `backend`:

- `npx.cmd prisma generate`
- `npm.cmd run build`
- `npm.cmd test -- data-quality-engine --runInBand`

Run from `frontend`:

- `npm.cmd run build`
