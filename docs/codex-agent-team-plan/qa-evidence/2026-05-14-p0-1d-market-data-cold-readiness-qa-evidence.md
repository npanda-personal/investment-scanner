# P0.1D Market Data Cold Readiness QA Evidence

Date: 2026-05-14
Scope: `IN / STOCK`, Market Data Foundation readiness cold path
Owner: QA Engineer
Status: Passed

## Code Under Test

- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/202605140001_market_data_readiness_cold_start_indexes/migration.sql`
- `backend/tests/modules/market-data-foundation/market-data.repository.test.ts`

## Validation Summary

The cold `review-readiness-summary` path improved from the P0.1C baseline of about `8333ms` to fresh-process samples between `801ms` and `888ms`. The final query plan uses the capped, index-assisted readiness path and executes in `623.079ms`.

## Automated Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Focused Market Data tests | Passed | `npm.cmd test -- tests/modules/market-data-foundation/market-data.repository.test.ts tests/modules/market-data-foundation/market-data.service.test.ts --runInBand`; `2 passed`, `160 passed`, `9.061s` |
| Backend build | Passed | `npm.cmd run build`; `tsc` passed |
| Migration applied locally | Passed | Indexes present in Postgres: `price_ticks_symbol_timestamp_desc_cover_idx`, `stocks_region_assetType_symbol_idx`, `stocks_region_assetType_providerSupport_active_delisted_idx` |
| Docker memory | Passed | Postgres remained below cap: `595.4MiB / 1GiB`; host memory after validation `UsedPct=63`, `FreeGB=5.68` |

## Runtime Timing

Fresh backend process for each cold sample; Docker/Postgres stayed running.

| Run | Endpoint | Time |
| --- | --- | --- |
| 1 | `/api/v1/market-data/review-readiness-summary?region=IN&assetType=STOCK` | `868ms` |
| 2 | `/api/v1/market-data/review-readiness-summary?region=IN&assetType=STOCK` | `827ms` |
| 3 | `/api/v1/market-data/review-readiness-summary?region=IN&assetType=STOCK` | `803ms` |
| 4 | `/api/v1/market-data/review-readiness-summary?region=IN&assetType=STOCK` | `888ms` |
| 5 | `/api/v1/market-data/review-readiness-summary?region=IN&assetType=STOCK` | `801ms` |

Warm endpoint check after cache reuse:

| Endpoint | Time | Key Fields |
| --- | --- | --- |
| `/market-data/review-readiness-summary` | `195ms` | `reviewMode=NO_REVIEW`, `trustStatus=NOT_TRUSTWORTHY`, `blockerCount=6` |
| `/market-data/review-universe` | `5ms` | `status=NOT_READY`, `trustedCount=0`, `storedDataThroughDate=2026-05-13`, `requiredDataThroughDate=2026-05-14` |
| `/market-data/universe/health` | `18ms` | `blockerCount=1` |
| `/market-data/universe/repair-plan` | `15ms` | `blockerCount=1` |

## EXPLAIN Evidence

Final capped readiness query:

- Execution time: `623.079ms`
- Uses `price_ticks_symbol_timestamp_desc_cover_idx`
- Avoids full-history `COUNT/MIN/MAX` aggregate over all price rows for daily-review readiness.
- Reads capped latest window per symbol with `LIMIT 252`.

## Trust Result

The performance fix does not relax trust gates. The current runtime still reports:

- `reviewMode=NO_REVIEW`
- `trustStatus=NOT_TRUSTWORTHY`
- `trustedCount=0`
- `storedDataThroughDate=2026-05-13`
- `requiredDataThroughDate=2026-05-14`

This is acceptable for P0.1D because the item is a cold-readiness performance fix. Market data trust remains fail-closed and continues to require separate data-availability repair before downstream signal, strategy, or trade-plan work can be trusted.

## QA Decision

Passed for P0.1D performance and non-relaxed trust behavior. Remaining market-data trust blockers stay open for the broader trusted data roadmap.
