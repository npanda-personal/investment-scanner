# Market Data Price Backfill Drain QA Evidence - 2026-05-13

## Work Item

MD-A5 hotfix: price backfill no-progress drain fix.

## Scope Verified

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.repository.test.ts`

## QA Result

Status: `Signed off`

QA verified that:

- Yahoo zero-row price backfill outcomes are persisted as `PRICE_BACKFILL` repair attempts/states with `YAHOO_ZERO_ROWS` and `MANUAL_REQUIRED`.
- Yahoo provider-error price backfill outcomes are persisted as `PRICE_BACKFILL` repair attempts/states with `YAHOO_PROVIDER_ERROR` and `FAILED_RETRYABLE`.
- Blocked price-backfill states are skipped by automatic candidate selection so repair drains can advance to other supported stocks.
- `repairPlan` and `universeHealth` keep fallback-required rows visible through `historyCoverageFallbackRequired` / `PRICE_BACKFILL_FALLBACK_REQUIRED`.
- Blocked fallback-required rows are excluded from automatic `BACKFILL_PRICES` counts.
- No Playwright run was required because this was a backend repair-loop/state fix.

## Validation Commands

- `npm.cmd test -- market-data.service.test.ts market-data.repository.test.ts --runInBand`
  - Result: passed, 2 suites / 149 tests.
- `npm.cmd run build`
  - Result: passed.
- `git diff --check`
  - Result: passed with existing line-ending warnings only.

## Residual Risk

This fix prevents automatic drain starvation. It does not populate every missing historical OHLCV row by itself. Stocks blocked by Yahoo zero-row/provider-error outcomes remain not ready until approved free official/public fallback data is loaded.
