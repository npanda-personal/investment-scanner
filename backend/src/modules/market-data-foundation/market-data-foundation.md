# Market Data Foundation

Market Data Foundation owns the application's baseline market data capabilities. It replaces the older Stock Management-centered organization and keeps instrument management, price data, fundamentals access, corporate actions access, ingestion, provider integration, validation, workers, and queue glue in one detachable module boundary.

The module is MVP-ready for instrument exploration and price ingestion. Fundamentals and corporate actions are exposed through the free Yahoo Finance provider, but they are not persisted historically yet because the current Prisma schema does not define dedicated tables for those datasets.

## Ownership Boundary

Backend code owned by this module lives in:

- `backend/src/modules/market-data-foundation`

Frontend code owned by this feature lives in:

- `frontend/src/features/market-data-foundation`

Code outside these roots should import through the public `index.ts` files only. Do not import another module's repository directly. Cross-module consumers should use the public service/provider exports.

## Backend Structure

Backend module files are intentionally flat. Do not recreate nested `routes/`, `services/`, `repositories/`, `types/`, `validation/`, `providers/`, `queue`, or `workers` folders unless the module is intentionally redesigned and this document is updated.

- `market-data-foundation.module.ts`
  - Module manifest exposing router, controller, service, and repository classes.
- `market-data-foundation.router.ts`
  - Route factories for canonical `/api/v1` endpoints and legacy compatibility mounts.
- `market-data-foundation.controller.ts`
  - Express request/response handlers. Controllers call services.
- `market-data-foundation.service.ts`
  - Business workflows for instruments, prices, ingestion, sync, fundamentals, and corporate actions.
- `market-data-foundation.repository.ts`
  - Prisma access for `Stock`, `PriceTick`, and `LatestPrice`.
- `market-data-foundation.validation.ts`
  - Required-field validation, instrument validation, historical price validation, and malformed price partitioning.
- `market-data-foundation.types.ts`
  - Module-owned DTOs, provider result types, sync request/response types, and validation result types.
- `market-data-foundation.provider.ts`
  - Free Yahoo Finance provider integration through the open-source `yahoo-finance2` package.
- `market-data-foundation.worker.ts`
  - Bulk historical data sync worker owned by this module.
- `market-data-foundation.queue.ts`
  - Local ingestion queue adapter owned by this module.
- `index.ts`
  - Public backend module exports.

Removed legacy backend folders/files:

- `backend/src/api/stocks`
- `backend/src/api/data`
- `backend/src/data/ingestion`
- `backend/src/workers`
- `backend/src/queue`

Legacy API URLs are preserved by mounting routers from this module in `backend/src/api/routes.ts`.

## Backend API Surface

Canonical MVP endpoints:

| Endpoint | Purpose | Status |
| --- | --- | --- |
| `GET /health` | Application health check | Existing app-level route |
| `GET /api/v1/market-data/health` | Market data health, instrument count, latest data timestamp | Implemented |
| `GET /api/v1/instruments` | List/search instruments | Implemented |
| `POST /api/v1/instruments` | Create instrument | Implemented |
| `GET /api/v1/instruments/:id` | Get instrument detail | Implemented |
| `GET /api/v1/prices/:instrumentId` | Get historical OHLCV prices | Implemented |
| `GET /api/v1/prices/:instrumentId/latest` | Get latest price | Implemented |
| `GET /api/v1/fundamentals/:instrumentId` | Get provider-backed fundamentals records | Implemented, not persisted |
| `GET /api/v1/corporate-actions/:instrumentId` | Get provider-backed dividends and splits | Implemented, not persisted |
| `POST /api/v1/ingestion/sync` | Sync by `symbol` or `instrumentId` | Implemented |

Legacy compatibility endpoints still mounted from this module:

- `/api/market-data-foundation/stocks`
- `/api/market-data-foundation/stocks/search`
- `/api/market-data-foundation/stocks/yahoo-search`
- `/api/market-data-foundation/data`
- `/api/market-data-foundation/data/search`
- `/api/market-data-foundation/data/ingest`
- `/api/market-data-foundation/data/prices/:symbol`
- `/api/market-data-foundation/data/fundamentals/:symbol`
- `/api/market-data-foundation/data/corporate-actions/:symbol`
- `/api/stocks`
- `/api/data`

## Validation And Reliability

Implemented validations:

- Instrument create requires `symbol`, `company_name`, `exchange`, `currency`, and `asset_type`.
- Duplicate create is blocked for the available persistence model. The current database has a unique `Stock.symbol`; the service additionally checks `symbol + exchange`.
- Historical prices require valid date, open, high, low, close, and optional numeric volume.
- Malformed historical price rows are skipped before storage so one bad row does not fail an entire batch.
- Price storage uses Prisma upsert on `symbol + timestamp`, preventing duplicate price records for the same instrument/date.
- Manual `/api/v1/ingestion/sync` accepts either `symbol` or `instrumentId`, throttles provider calls, catches provider failures, and can return partial success.

Known validation/persistence caveat:

- True duplicate prevention by `symbol + exchange` will require changing the Prisma `Stock` uniqueness model. Today `symbol` is globally unique.

## Data Sources

Current provider:

- Yahoo Finance via the free/open-source `yahoo-finance2` package.

Allowed future providers:

- Alpha Vantage free tier.
- Twelve Data free tier.

Do not add paid providers, paid UI libraries, paid charts, or tools requiring mandatory credit card setup.

## Current Persistence

Persisted datasets:

- Instruments via `Stock`.
- End-of-day/basic historical OHLCV bars via `PriceTick`.
- Latest price snapshots via `LatestPrice`.

Provider-backed, not yet persisted:

- Core fundamentals: revenue, earnings/net income, PE ratio or equivalent key ratio.
- Corporate actions: dividends, splits, and other basic events if the provider returns them.

The `/api/v1` responses include MVP metadata where the current model can support it:

- `source`
- `ingestion_timestamp`
- `last_updated_timestamp`
- `data_status`: `COMPLETE`, `PARTIAL`, or `DELAYED`

For persisted price data, `adjusted_close` is not stored separately. The MVP response returns `close` as `adjusted_close` and documents that strategy in the price response.

## Frontend Structure

- `frontend/src/features/market-data-foundation/components`
  - `MarketDataFoundationPage`: instrument explorer with search, status chips, sync action, and row navigation.
  - `AddInstrumentPage`: create-instrument form using `/api/v1/instruments`.
  - `InstrumentDetailPage`: latest price, historical Recharts chart, price table, fundamentals table, and corporate actions table.
  - `DataIngestion`: manual symbol sync using `/api/v1/ingestion/sync`.
  - `MarketDataStatusPanel`: health, instrument count, and latest market data timestamp.
- `frontend/src/features/market-data-foundation/api`
  - Client APIs for canonical `/api/v1` endpoints plus retained legacy data/search helpers.
- `frontend/src/features/market-data-foundation/hooks`
  - Reserved for feature-owned hooks.
- `frontend/src/features/market-data-foundation/types.ts`
  - Feature-owned frontend DTOs.
- `frontend/src/features/market-data-foundation/routes.tsx`
  - Feature route definitions consumed by the app route registry.
- `frontend/src/features/market-data-foundation/index.ts`
  - Public frontend feature exports.

Frontend routes:

| Route | Purpose |
| --- | --- |
| `/market-data-foundation` | Instrument explorer |
| `/market-data-foundation/add` | Add instrument |
| `/market-data-foundation/ingestion` | Manual market data sync |
| `/market-data-foundation/:id` | Instrument detail |
| `/stocks` | Redirects to `/market-data-foundation` |

The dashboard also uses `MarketDataStatusPanel` and `DataIngestion` from this feature.

Removed legacy frontend compatibility exports:

- `frontend/src/services/stockService.ts`
- `frontend/src/services/dataService.ts`
- `frontend/src/features/stocks/index.ts`

Frontend callers should import from `frontend/src/features/market-data-foundation`.

## Tests And Verification

Current module-focused tests:

- `backend/tests/modules/market-data-foundation/market-data.validation.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
- `backend/tests/data/ingestion/yahoo.service.test.ts`

Recent verification commands:

- `backend`: `npm.cmd run build`
- `frontend`: `npm.cmd run build`
- `backend`: `npm.cmd test -- market-data.validation.test.ts market-data.service.test.ts --runInBand`

## Assumptions

- All tooling and data integration remains free/open-source and locally runnable, per `docs/instructions.md`.
- Existing stock and data API behavior is preserved through compatibility route mounts.
- The existing Prisma schema is reused for MVP readiness to avoid a broad migration during this refactor.
- Future extraction should use `backend/src/modules/market-data-foundation` and `frontend/src/features/market-data-foundation` as the detachable module roots.
- Legacy compatibility files and empty legacy directories were removed after callers were migrated to the module exports.

## Recommended Next Steps

- Add dedicated Prisma tables for historical fundamentals and corporate actions.
- Change instrument uniqueness from global `symbol` to `symbol + exchange` if the product needs the same symbol on multiple exchanges.
- Add frontend component tests once a frontend test runner is configured.
- Consider frontend code splitting for the larger Vite bundle warning.
