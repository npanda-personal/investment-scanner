# Historical Context Snapshots

## Ownership

`historical-context-snapshots` owns persistence and retrieval of historical market, sector, country, smart-money, and data-quality context.

It does not calculate the current market regime or smart-money score itself. Those remain owned by `market-context-intelligence` and `smart-money-intelligence`. This module calls their public services, persists point-in-time snapshots, and exposes date lookup APIs for historical evaluation.

## Endpoints

Mounted under `/api/v1`:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/context-snapshots/generate` | Generate snapshots for a date and market scope |
| GET | `/context-snapshots/summary` | Scoped coverage summary alias |
| GET | `/context-snapshots/market` | Scoped market regime snapshots |
| GET | `/context-snapshots/sectors` | Scoped sector rotation snapshots |
| GET | `/context-snapshots/countries` | Scoped country strength snapshots |
| GET | `/context-snapshots/smart-money` | Scoped stock-level smart-money snapshots |
| GET | `/context-snapshots/coverage` | Scoped snapshot counts and latest date |
| GET | `/context-snapshots/lookup` | Scoped nearest context lookup on/before date |

## Snapshot Models

Prisma models:

- `MarketContextSnapshot`
- `SectorContextSnapshot`
- `CountryContextSnapshot`
- `SmartMoneyContextSnapshot`
- `DataQualitySnapshot`

Snapshot dates are normalized to UTC midnight. Unique keys prevent duplicate snapshots for the same date/context pair.

Natural keys:

- `MarketContextSnapshot`: `snapshotDate + region`
- `SectorContextSnapshot`: `snapshotDate + region + sector`
- `CountryContextSnapshot`: `snapshotDate + region + country`
- `SmartMoneyContextSnapshot`: `snapshotDate + instrumentId`
- `DataQualitySnapshot`: `snapshotDate + instrumentId`

Repeated snapshot generation uses upsert behavior and returns inserted/updated/skipped counts. It should not create duplicate logical snapshots for the same UTC day and scope. Smart-money and data-quality snapshots are instrument-keyed; scoped reads filter them through the related `Stock` row.

## Generation Behavior

`POST /context-snapshots/generate`:

- accepts optional `snapshotDate`
- accepts optional `limit` for smart-money/data-quality stock snapshots
- accepts optional `region` and `assetType`, defaulting to `IN` and `STOCK`
- defaults to today
- calls Market Context Intelligence public service for scoped market/sector/country context
- calls Smart Money Intelligence public service per scoped instrument within limit
- calculates lightweight data-quality readiness from Market Data Foundation public services
- persists with upsert behavior
- returns inserted/updated/skipped counts and warnings
- skips sector rows whose sector metadata is `Unknown`, blank, `N/A`, `NA`, or null-equivalent. These rows increment skipped-sector count and return a metadata-gap warning; they are not persisted as ranked leadership/weakness evidence.

Scheduled pipeline automation may call the service with explicit `instrumentIds`. That path uses latest persisted Market Context and latest persisted Smart Money snapshots instead of generating missing upstream context on demand. Missing upstream rows are recorded as skipped/gap evidence, keeping the scheduled chain DB-only and avoiding provider fallback behavior.

Partial failures are captured as warnings instead of failing the full batch.

## Sector Metadata Policy

Sector context snapshots store ranked sector evidence only for real named sectors. Missing metadata buckets such as `Unknown`, blank, `N/A`, `NA`, and null-equivalent values are metadata gaps, not sectors.

- Generation skips these buckets before `upsertSector`.
- `/context-snapshots/sectors` excludes existing persisted metadata-gap rows on read so old rows no longer appear as ranked evidence. The response limit is applied after metadata-gap filtering, so whitespace or null-equivalent rows cannot consume the requested limit and hide valid named sectors.
- `/context-snapshots/coverage` counts only known named sector rows in `sectorSnapshots`; hidden metadata-gap rows are exposed separately as `sectorMetadataGapSnapshots` when present.
- `/context-snapshots/lookup?sector=Unknown` does not look up or return a ranked sector snapshot; it returns `sector = null` with a metadata-gap explanation in `gaps[]`.
- The frontend may show a concise metadata-gap notice, but it must not render `Unknown` as a sector table row with `LEADING`, `WEAK`, `IMPROVING`, or `LAGGING`.

## Lookup Behavior

`GET /context-snapshots/lookup` requires `date` and accepts optional:

- `instrumentId`
- `sector`
- `country`
- `lookbackDays`
- `region`
- `assetType`

The lookup returns nearest snapshots for the requested scope on or before the requested date within the lookback window. Default lookback is 7 days. `region` and `assetType` default to `IN` and `STOCK`.

Response includes:

- market snapshot
- sector snapshot if requested
- country snapshot if requested
- smart-money snapshot if requested
- data-quality snapshot if requested
- `dataStatus`
- `gaps[]`

When `sector` is a metadata-gap value such as `Unknown`, `gaps[]` includes the metadata-gap explanation instead of treating the value as missing sector leadership.

## Signal Quality Lab Integration

Signal Quality Lab now uses this module to group `/signals/quality/by-regime` by the nearest persisted market context snapshot for each signal's `generatedAt` date.

If no snapshots exist, Signal Quality Lab keeps returning the documented `MISSING_REGIME_CONTEXT` grouping.

Signal Calibration Engine also uses lookup results for regime, sector leadership, smart-money, and data-quality adjustments.

## Limitations

- Manual generation only; no cron scheduler.
- Smart-money stock snapshots are limited by request `limit` to keep local runtime safe.
- Data-quality snapshot rows are still keyed by instrument and date; coverage counts are global for data quality until that model gains a stock relation or persisted scope fields.
- Historical regime quality depends on snapshots having been generated before or near signal dates.
- No signal calibration, adaptive weighting, prediction modeling, or portfolio optimization.

## Verification

Run from `backend`:

- `npx.cmd prisma generate`
- `npm.cmd run build`
- `npm.cmd test -- --runInBand --runTestsByPath tests/modules/historical-context-snapshots/historical-context-snapshots.service.test.ts tests/modules/historical-context-snapshots/historical-context-snapshots.validation.test.ts tests/modules/historical-context-snapshots/historical-context-snapshots.repository.test.ts`
- `npm.cmd test -- signal-quality-lab --runInBand`

Run from `frontend`:

- `npm.cmd run build`
- `npm.cmd run test:ui -- historical-context-snapshots.spec.ts --workers=1`
