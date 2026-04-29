# Historical Context Snapshots

## Ownership

`historical-context-snapshots` owns persistence and retrieval of historical market, sector, country, smart-money, and data-quality context.

It does not calculate the current market regime or smart-money score itself. Those remain owned by `market-context-intelligence` and `smart-money-intelligence`. This module calls their public services, persists point-in-time snapshots, and exposes date lookup APIs for historical evaluation.

## Endpoints

Mounted under `/api/v1`:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/context-snapshots/generate` | Generate snapshots for a date |
| GET | `/context-snapshots/summary` | Coverage summary alias |
| GET | `/context-snapshots/market` | Market regime snapshots |
| GET | `/context-snapshots/sectors` | Sector rotation snapshots |
| GET | `/context-snapshots/countries` | Country strength snapshots |
| GET | `/context-snapshots/smart-money` | Stock-level smart-money snapshots |
| GET | `/context-snapshots/coverage` | Snapshot counts and latest date |
| GET | `/context-snapshots/lookup` | Nearest context lookup on/before date |

## Snapshot Models

Prisma models:

- `MarketContextSnapshot`
- `SectorContextSnapshot`
- `CountryContextSnapshot`
- `SmartMoneyContextSnapshot`
- `DataQualitySnapshot`

Snapshot dates are normalized to UTC midnight. Unique keys prevent duplicate snapshots for the same date/context pair.

## Generation Behavior

`POST /context-snapshots/generate`:

- accepts optional `snapshotDate`
- accepts optional `limit` for smart-money/data-quality stock snapshots
- defaults to today
- calls Market Context Intelligence public service for market/sector/country context
- calls Smart Money Intelligence public service per instrument within limit
- calculates lightweight data-quality readiness from Market Data Foundation public services
- persists with upsert behavior
- returns inserted/updated/skipped counts and warnings

Partial failures are captured as warnings instead of failing the full batch.

## Lookup Behavior

`GET /context-snapshots/lookup` requires `date` and accepts optional:

- `instrumentId`
- `sector`
- `country`
- `lookbackDays`

The lookup returns nearest snapshots on or before the requested date within the lookback window. Default lookback is 7 days.

Response includes:

- market snapshot
- sector snapshot if requested
- country snapshot if requested
- smart-money snapshot if requested
- data-quality snapshot if requested
- `dataStatus`
- `gaps[]`

## Signal Quality Lab Integration

Signal Quality Lab now uses this module to group `/signals/quality/by-regime` by the nearest persisted market context snapshot for each signal's `generatedAt` date.

If no snapshots exist, Signal Quality Lab keeps returning the documented `MISSING_REGIME_CONTEXT` grouping.

## Limitations

- Manual generation only; no cron scheduler.
- Smart-money stock snapshots are limited by request `limit` to keep local runtime safe.
- Historical regime quality depends on snapshots having been generated before or near signal dates.
- No signal calibration, adaptive weighting, prediction modeling, or portfolio optimization.

## Verification

Run from `backend`:

- `npx.cmd prisma generate`
- `npm.cmd run build`
- `npm.cmd test -- historical-context-snapshots --runInBand`
- `npm.cmd test -- signal-quality-lab --runInBand`

Run from `frontend`:

- `npm.cmd run build`
