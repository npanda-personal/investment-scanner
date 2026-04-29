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
| GET | `/signals/quality/by-regime` | Regime grouping placeholder |
| GET | `/signals/quality/noisy` | Noisy/churning signal diagnostics |
| GET | `/signals/:instrumentId/history` | Historical signal results for one instrument |
| GET | `/signals/:instrumentId/outcomes` | Forward-return outcomes for one instrument |
| POST | `/signals/quality/recalculate` | No-op recalculation response because outcomes are on demand |

Supported query params:

- `horizon`: `1D`, `5D`, `10D`, `20D`, `60D`
- `direction`: `BULLISH`, `NEUTRAL`, `BEARISH`
- `sector`
- `country`
- `from`
- `to`
- `limit`
- `minSampleSize`

Limits are clamped to safe bounds.

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

## Frontend

Frontend feature:

- `frontend/src/features/signal-quality-lab`

Route:

- `/signals/quality`

The dashboard shows quality summary cards, performance by signal type, performance by sector, regime placeholder state, noisy signals, and instrument-level signal history/outcomes.

## Known Limitations

- Outcomes need future prices after signal generation; fresh signals may be unevaluated.
- Regime grouping returns a documented missing-context placeholder until regime snapshots are persisted or mapped to historical dates.
- No signal calibration, strategy optimization, or trading recommendations.
- No outcome persistence table yet.

## Verification

Run from `backend`:

- `npx.cmd prisma generate`
- `npm.cmd run build`
- `npm.cmd test -- signal-quality-lab --runInBand`

Run from `frontend`:

- `npm.cmd run build`
