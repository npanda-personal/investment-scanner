# Market Data Foundation

Market Data Foundation owns the application's baseline market data capabilities. It replaces the older Stock Management-centered organization and keeps instrument management, price data, fundamentals, corporate actions, FX rates, ingestion, provider integration, validation, workers, and queue glue in one detachable module boundary.

The module is implemented as a flat backend module and a dedicated frontend feature. It remains locally runnable and uses free/open-source tooling only.

## Epic 1 Status

Implemented:

- Daily OHLCV price persistence through `PriceTick`.
- Latest price snapshots through `LatestPrice`.
- 15-year first historical sync where the provider allows it.
- Incremental repeated syncs using the stock's last successful load timestamp with a 3-day overlap to ensure updated provider data is captured.
- Coverage-aware backfill: instruments with shallow stored price history are backfilled even if a prior partial sync set `lastSuccessfulDataLoadTimestamp`.
- Duplicate bars inside a fetched batch are identified and moved to the `invalid` array with a `duplicate price bar in batch` error.
- Abnormal price spikes are identified and moved to the `invalid` array using `MARKET_DATA_SPIKE_THRESHOLD`, defaulting to `0.5`.
- Malformed historical price rows (invalid symbol or date) are correctly captured in the `invalid` result instead of being silently skipped.
- Price storage uses Prisma upsert on `symbol + timestamp`.
- Detailed sync summary with true counts: `instrumentsInserted/Updated/Skipped`, `priceRowsInserted/Updated`, `fundamentalsInserted`, `corporateActionsUpdated`, etc.
- Dedicated persisted fundamentals through `Fundamental` using a strict unique constraint `[stockId, periodType, source]` to guarantee idempotent snapshot updates.
- Dedicated persisted corporate actions through `CorporateAction`.
- Reverse split classification when the provider returns a split ratio below `1`.
- Minimal persisted FX rates through `FxRate`.
- Canonical `/api/v1` APIs plus existing compatibility routes.
- Frontend instrument exploration, add instrument, instrument detail, status panel, and manual sync flows.
- **Global Market Scope**: Support for `region` and `assetType` filtering in instrument list and search APIs.

Partially implemented:

- Company master data is stored on `Stock`, but IPO date and delisted status are only populated when a provider exposes them. Yahoo Finance coverage is inconsistent, so unavailable values are stored as `null` or defaulted conservatively.
- Adjusted close is stored when the provider supplies it. If not supplied, API responses fall back to `close` and document the strategy.
- ETFs and indices are supported where Yahoo Finance supports the symbol. The app stores asset type metadata when available or provided by the user.
- Fundamentals are persisted as provider snapshots with period metadata. Full audited statement history depends on provider availability.

Known limitation:

- `Stock.symbol` is still globally unique. Epic 1 identified `symbol + exchange` uniqueness as the better long-term product model, but changing it safely requires a data migration plan for existing foreign references and compatibility routes that still address prices by symbol. This pass documents the risk and keeps the existing uniqueness rule to avoid breaking current data.

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
  - Business workflows for instruments, prices, coverage-aware ingestion, sync summaries, fundamentals, corporate actions, and FX rates.
  - Public batch lookup methods: `getInstrumentsByIds` and `getLatestPricesBySymbols`.
- `market-data-foundation.repository.ts`
  - Prisma access for `Stock`, `PriceTick`, `LatestPrice`, `Fundamental`, `CorporateAction`, and `FxRate`, plus price coverage checks and normalized fundamentals upserts.
- `market-data-foundation.validation.ts`
  - Required-field validation, instrument validation, OHLCV validation, duplicate-bar checks, malformed row partitioning, and abnormal spike checks.
- `market-data-foundation.types.ts`
  - Module-owned DTOs, provider result types, sync request/response types, FX types, status enum, and validation result types.
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

## Prisma Models

Persisted models used by Market Data Foundation:

- `Stock`
  - Instrument/company master data: symbol, name, exchange, country, sector, industry, currency, market cap, asset type, active/delisted status, IPO date, ISIN, source, data status.
- `PriceTick`
  - Daily OHLCV bars, adjusted close when supplied, source, ingestion timestamp, last updated timestamp, data status.
- `LatestPrice`
  - Latest price snapshot per symbol.
- `Fundamental`
  - Historical/provider-period fundamentals: revenue, EPS, net income, PE ratio, dividend yield, shares outstanding, market cap, currency, period type, normalized period end date, source, metadata.
- `CorporateAction`
  - Dividends, splits, reverse splits, effective date, declared date, payment date, amount, split ratio, currency, source, metadata.
- `FxRate`
  - Latest FX rates with pair, base currency, quote currency, rate, source, and metadata.

## Backend API Surface

### Standard Pagination & Filtering

Most list endpoints support standard `PaginationOptions`:
- `page`: Page number (default 1)
- `pageSize`: Items per page (default 25)
- `sortBy`: Field to sort by
- `sortOrder`: 'asc' or 'desc'
- `region`: Global market region (IN, US, EU, GLOBAL). Mapped to exchanges and country metadata.
- `assetType`: Asset class identifier (e.g., STOCK).

### Canonical MVP Endpoints

| Endpoint | Purpose | Status |
| --- | --- | --- |
| `GET /api/v1/market-data/health` | Market data health, instrument count, freshness, trust metadata | Implemented |
| `GET /api/v1/instruments` | List/search instruments with `region` support | Implemented |
| `POST /api/v1/instruments` | Create instrument | Implemented |
| `GET /api/v1/instruments/:id` | Get instrument detail | Implemented |
| `GET /api/v1/prices/:instrumentId` | Get OHLCV prices with date range | Implemented |
| `POST /api/v1/ingestion/sync` | Sync by symbol or ID | Implemented |

Legacy compatibility endpoints are still supported.

## Validation And Reliability

Implemented validations:

- Instrument create requires `symbol`, `company_name`, `exchange`, `currency`, and `asset_type`.
- Price timestamps normalized to UTC midnight for idempotent storage.
- Regional mapping logic ensures `IN` filters for NSE/BSE and `India`.

## Idempotent Persistence Rules

Natural keys for stock-data records owned by this module:

| Model | Natural key | Behavior |
| --- | --- | --- |
| `Stock` | `symbol` | Upsert; long-term risk documented. |
| `PriceTick` | `symbol + normalized daily timestamp` | Idempotent updates. |

## Frontend Structure

- `MarketDataFoundationPage`: Integrated with `useMarketScope()`. Automatically filters by the globally selected region.
- `InstrumentSearchSelect`: Shared component for picking stocks. Defaults to the active region scope with an optional `global` override.

Frontend routes are defined in `routes.tsx` and exported via `index.ts`.

## Tests And Verification

- `backend/src/shared/utils/market-scope.test.ts`: Verifies regional mapping logic.
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`: Verifies service logic.

## Assumptions

- All data integration remains free/open-source.
- Application-wide market context is controlled by the header selector.
