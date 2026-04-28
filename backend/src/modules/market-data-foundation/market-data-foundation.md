# Market Data Foundation

The Market Data Foundation module owns the application baseline market data capabilities that were previously spread across Stock Management, data ingestion, and Yahoo Finance integration code.

## Backend Structure

Backend module code is intentionally flat. Do not recreate nested `routes/`, `services/`, `types/`, `validation/`, `providers/`, `queue`, or `workers` folders for this module unless the module is intentionally redesigned and this document is updated.

- `market-data-foundation.module.ts`
  - Module manifest exposing router, controller, service, and repository classes.
- `market-data-foundation.router.ts`
  - Canonical router and route factories for `/stocks` and `/data` endpoints. It also exposes scoped routers for legacy `/api/stocks` and `/api/data` mounts.
- `market-data-foundation.controller.ts`
  - HTTP request/response handlers. Controllers call services.
- `market-data-foundation.service.ts`
  - Business workflows for instruments, ingestion, sync, fundamentals, and corporate actions. Services call repositories and providers.
- `market-data-foundation.repository.ts`
  - Prisma access for `Stock`, `PriceTick`, and `LatestPrice`.
- `market-data-foundation.validation.ts`
  - Required-field, type, format, and malformed price-bar validation.
- `market-data-foundation.types.ts`
  - Module-owned DTOs and provider result types.
- `market-data-foundation.provider.ts`
  - External data provider integration. The current provider is Yahoo Finance via the free `yahoo-finance2` package.
- `market-data-foundation.worker.ts`
  - Bulk historical data sync worker owned by this module.
- `market-data-foundation.queue.ts`
  - Local ingestion queue adapter. It currently runs without paid services.
- `index.ts`
  - Public module exports. Code outside the module should import from this public entry point instead of internal module files.

The old backend shim files and folders under `backend/src/api/stocks`, `backend/src/api/data`, `backend/src/data/ingestion`, `backend/src/workers`, and `backend/src/queue` have been removed. Legacy API paths are still mounted directly from the Market Data Foundation module in `backend/src/api/routes.ts`.

## Frontend Structure

- `frontend/src/features/market-data-foundation/components`
  - `MarketDataFoundationPage` replaces the previous Stock Management page.
  - `DataIngestion` contains the historical price ingestion viewer previously used by the dashboard.
- `frontend/src/features/market-data-foundation/api`
  - Client APIs for instruments, price data, search, sync, fundamentals, and corporate action endpoints.
- `frontend/src/features/market-data-foundation/hooks`
  - Reserved for feature-owned React hooks.
- `frontend/src/features/market-data-foundation/types.ts`
  - Feature-owned frontend DTOs.
- `frontend/src/features/market-data-foundation/routes.tsx`
  - Feature route definitions consumed by the app route registry.
- `frontend/src/features/market-data-foundation/index.ts`
  - Public feature exports.

The old frontend compatibility exports in `frontend/src/services/stockService.ts`, `frontend/src/services/dataService.ts`, and `frontend/src/features/stocks/index.ts` have been removed. Frontend callers should import from `frontend/src/features/market-data-foundation`.

## API Boundaries

The canonical module namespace is:

- `/api/market-data-foundation/stocks`
- `/api/market-data-foundation/stocks/search`
- `/api/market-data-foundation/stocks/yahoo-search`
- `/api/market-data-foundation/data`
- `/api/market-data-foundation/data/search`
- `/api/market-data-foundation/data/ingest`
- `/api/market-data-foundation/data/prices/:symbol`
- `/api/market-data-foundation/data/fundamentals/:symbol`
- `/api/market-data-foundation/data/corporate-actions/:symbol`

Existing compatibility routes still work:

- `/api/stocks`
- `/api/data`

## Current Persistence

Persisted data currently includes:

- Instruments via `Stock`
- End-of-day/basic historical price bars via `PriceTick`
- Latest price snapshots via `LatestPrice`

Core fundamentals and corporate actions are exposed through provider calls, but they are not persisted yet because the Prisma schema does not currently define fundamentals, dividends, splits, or corporate action tables.

## Assumptions

- All tooling and data integration remains free/open-source and locally runnable, per `docs/instructions.md`.
- Existing stock and data API behavior is preserved through compatibility route mounts.
- Malformed historical price rows are skipped with a warning so one bad row does not fail an entire ingestion batch.
- Future extraction should use `backend/src/modules/market-data-foundation` and `frontend/src/features/market-data-foundation` as the detachable module roots.
- Legacy compatibility files and empty legacy directories were removed after callers were migrated to the module exports.
