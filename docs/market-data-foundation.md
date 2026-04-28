# Market Data Foundation

The Market Data Foundation module owns the application baseline market data capabilities that were previously spread across Stock Management, data ingestion, and Yahoo Finance integration code.

## Backend Structure

- `backend/src/modules/market-data-foundation/routes`
  - HTTP routers for instrument management, price data, fundamentals, and corporate actions.
- `backend/src/modules/market-data-foundation/services`
  - Application services for stock/instrument lifecycle and sync orchestration.
- `backend/src/modules/market-data-foundation/providers`
  - External data providers. The current provider is Yahoo Finance via the free `yahoo-finance2` package.
- `backend/src/modules/market-data-foundation/validation`
  - Required-field, type, format, and malformed price-bar validation.
- `backend/src/modules/market-data-foundation/workers`
  - Bulk historical data sync workers.
- `backend/src/modules/market-data-foundation/queue`
  - Ingestion queue compatibility layer. It currently runs locally without paid services.
- `backend/src/modules/market-data-foundation/types`
  - Module-owned DTOs and provider result types.

Compatibility shims remain under `backend/src/api/stocks`, `backend/src/api/data`, `backend/src/data/ingestion`, `backend/src/workers`, and `backend/src/queue` so unrelated modules can continue importing old paths during migration.

## Frontend Structure

- `frontend/src/features/market-data-foundation/components`
  - `MarketDataFoundationPage` replaces the previous Stock Management page.
  - `DataIngestion` contains the historical price ingestion viewer previously used by the dashboard.
- `frontend/src/features/market-data-foundation/api`
  - Client APIs for instruments, price data, search, sync, fundamentals, and corporate action endpoints.
- `frontend/src/features/market-data-foundation/index.ts`
  - Public feature exports.

Compatibility exports remain in `frontend/src/services/stockService.ts`, `frontend/src/services/dataService.ts`, and `frontend/src/features/stocks/index.ts`.

## API Boundaries

The canonical module namespace is:

- `/api/market-data-foundation/stocks`
- `/api/market-data-foundation/data`
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
- Existing stock behavior is preserved through compatibility routes and exports.
- Malformed historical price rows are skipped with a warning so one bad row does not fail an entire ingestion batch.
- Future extraction should use `backend/src/modules/market-data-foundation` and `frontend/src/features/market-data-foundation` as the detachable module roots.
