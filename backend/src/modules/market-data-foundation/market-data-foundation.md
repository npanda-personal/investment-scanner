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

Canonical MVP endpoints:

| Endpoint | Purpose | Status |
| --- | --- | --- |
| `GET /health` | Application health check | Existing app-level route |
| `GET /api/v1/market-data/health` | Market data health, instrument count, freshness, trust metadata | Implemented |
| `GET /api/v1/instruments` | List/search instruments | Implemented |
| `POST /api/v1/instruments` | Create instrument | Implemented |
| `GET /api/v1/instruments/:id` | Get instrument detail | Implemented |
| `GET /api/v1/prices/:instrumentId` | Get historical OHLCV prices with optional date range | Implemented |
| `GET /api/v1/prices/:instrumentId/latest` | Get latest price | Implemented |
| `GET /api/v1/fundamentals/:instrumentId` | Get persisted fundamentals with provider fallback | Implemented |
| `GET /api/v1/corporate-actions/:instrumentId` | Get persisted corporate actions with provider fallback | Implemented |
| `GET /api/v1/fx-rates` | Get latest persisted FX rates, syncing defaults if empty | Implemented |
| `GET /api/v1/fx-rates/:pair` | Get latest FX rate for a pair such as `USD/EUR` | Implemented |
| `POST /api/v1/fx-rates/sync` | Refresh default FX pairs from provider | Implemented |
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
- Historical prices require valid date, open, high, low, close, and optional numeric volume.
- Negative prices are rejected.
- Negative volume is rejected.
- `low > high` is rejected.
- `open` outside the low/high range is rejected.
- `close` outside the low/high range is rejected.
- Duplicate bars inside a fetched batch are identified and moved to the `invalid` array with a `duplicate price bar in batch` error.
- Abnormal price spikes are identified and moved to the `invalid` array using `MARKET_DATA_SPIKE_THRESHOLD`, defaulting to `0.5`.
- Malformed historical price rows (invalid symbol or date) are correctly captured in the `invalid` result instead of being silently skipped.
- Price storage uses Prisma upsert on `symbol + timestamp`.
- Historical daily price timestamps are normalized to UTC midnight before duplicate checks and upsert, so repeated syncs for the same trading day update one `PriceTick`.
- Historical ingestion checks stored price coverage. If the oldest stored price is not near the 15-year backfill start, the sync backfills history instead of trusting a prior `lastSuccessfulDataLoadTimestamp`.
- Fundamentals storage relies on strict uniqueness `[stockId, periodType, source]`. Repeated provider snapshots for the same period strictly update one logical row instead of creating false duplicate snapshot histories.
- Corporate action effective dates are normalized to UTC midnight before upsert.
- Manual `/api/v1/ingestion/sync` accepts either `symbol` or `instrumentId`, throttles provider calls, catches provider failures, persists available data, and correctly calculates detailed `SyncResult` counts.

Sync responses include:

- `rowsReceived`, `rowsInserted`, `rowsUpdated`, `rowsSkipped` (price ticks)
- Detailed breakdown fields (e.g. `instrumentsUpdated`, `corporateActionsUpdated`)
- `warningCount`
- `warnings`

Data status values are normalized as:

- `COMPLETE`
- `PARTIAL`
- `DELAYED`
- `MISSING`
- `ERROR`

## Idempotent Persistence Rules

Natural keys for stock-data records owned by this module:

| Model | Natural key | Behavior |
| --- | --- | --- |
| `Stock` | `symbol` for current MVP | Upsert/update through instrument workflows; long-term risk is documented because `symbol + exchange` is preferred. |
| `PriceTick` | `symbol + normalized daily timestamp` | Upsert; repeated historical sync updates existing bars. |
| `LatestPrice` | `symbol` | Latest-only upsert. |
| `Fundamental` | `stockId + periodType + source` | Upsert; guaranteed idempotent. Eliminates prior bug where daily advancing `periodEndDate` caused daily row duplication. |
| `CorporateAction` | `stockId + actionType + normalized effectiveDate + source` | Upsert; amount/split ratio are updated on the logical action row. |
| `FxRate` | `pair` | Latest-only upsert. |

Project-level duplicate diagnostics are available in:

- `backend/scripts/audit-market-data-ingestion.ts`

The script runs in dry-run mode by default and reports duplicate logical groups. Use `--cleanup` only after reviewing samples.

## Data Sources

Current provider:

- Yahoo Finance via the free/open-source `yahoo-finance2` package.

Historical price provider behavior:

- Daily OHLCV history uses `yahoo-finance2` `chart()` directly with `interval: '1d'`.
- The older `historical()` helper is not used, which avoids the Yahoo Finance deprecated historical API warning.
- Chart quotes are mapped to the module's internal `HistoricalPrice` DTO: `date`, `open`, `high`, `low`, `close`, `adjustedClose`, and `volume`.
- When Yahoo chart data does not include adjusted close, `adjustedClose` falls back to `close`, preserving the existing adjusted-close fallback behavior.
- Malformed chart rows are partitioned by the existing historical price validation and skipped with warnings.

Corporate action provider behavior:

- Yahoo Finance corporate actions use `chart()` with `events: 'div|split'`.
- Dividend events map `amount` to dividend `value`/`amount`.
- Split events map `splitRatio` or numerator/denominator into persisted split ratios.
- Declared date and payment date remain nullable because Yahoo chart events do not reliably provide them.

FX support:

- Yahoo Finance FX symbols are used with the `=X` suffix, for example `USDEUR=X`.
- Default persisted FX pairs are `USD/EUR`, `USD/GBP`, `USD/INR`, and `EUR/GBP`.

Allowed future providers:

- Alpha Vantage free tier.
- Twelve Data free tier.

Do not add paid providers, paid UI libraries, paid charts, or tools requiring mandatory credit card setup.

## Frontend Structure

- `frontend/src/features/market-data-foundation/components`
  - `MarketDataFoundationPage`: instrument explorer with search, status chips, sync action, and row navigation.
  - `AddInstrumentPage`: create-instrument form using `/api/v1/instruments`.
  - `InstrumentDetailPage`: latest price, historical Recharts chart, price table, persisted fundamentals table, and persisted corporate actions table.
  - `DataIngestion`: manual symbol sync using `/api/v1/ingestion/sync`, including sync summary display.
  - `MarketDataStatusPanel`: health, instrument count, latest market data timestamp, and trust status.
- `frontend/src/features/market-data-foundation/api`
  - Client APIs for canonical `/api/v1` endpoints plus retained legacy data/search helpers.
- `frontend/src/features/market-data-foundation/hooks`
  - Reserved for feature-owned hooks.
- `frontend/src/features/market-data-foundation/types.ts`
  - Feature-owned frontend DTOs matching backend metadata.
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
| `/market-data-foundation/:id` | Compatibility stock workspace with tabs |
| `/stocks/:id` | Canonical unified stock workspace with tabs |
| `/stocks` | Redirects to `/market-data-foundation` |

The instrument explorer is table-first and server-paginated. It supports market tabs plus filters for search, exchange, asset type, currency, and sector. Column sorting is wired through the `/api/v1/instruments` query parameters.

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
- `backend/tests/modules/market-data-foundation/market-data.repository.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.routes.test.ts`
- `backend/tests/data/ingestion/yahoo.service.test.ts`

Recent verification commands:

- `backend`: `npx.cmd prisma generate`
- `backend`: `npm.cmd run build`
- `frontend`: `npm.cmd run build`
- `backend`: `npm.cmd test -- market-data.validation.test.ts market-data.service.test.ts market-data.repository.test.ts market-data.routes.test.ts --runInBand --forceExit`
- `backend`: `npm.cmd test -- yahoo.service.test.ts --runInBand --forceExit`

Recent data cleanup:

- Duplicate fundamentals rows created by timestamp-level provider snapshot dates were prevented via schema restriction (`@@unique([stockId, periodType, source])`).
- Repeated sync loops correctly return `inserted: 0`, validating true idempotency.

## Assumptions

- All tooling and data integration remains free/open-source and locally runnable, per `docs/instructions.md`.
- Existing stock and data API behavior is preserved through compatibility route mounts.
- Existing symbol-only uniqueness is retained for this pass to avoid breaking current symbol-based price storage and compatibility routes.
- Future extraction should use `backend/src/modules/market-data-foundation` and `frontend/src/features/market-data-foundation` as the detachable module roots.
- Legacy compatibility files and empty legacy directories were removed after callers were migrated to the module exports.

## Recommended Next Steps

- Plan a dedicated migration from global `Stock.symbol` uniqueness to `symbol + exchange`, including how `PriceTick` and compatibility routes should map symbol-only lookups.
- Add richer provider mapping for declared/payment dates if a free provider exposes them reliably.
- Add frontend component tests once a frontend test runner is configured.
- Consider frontend code splitting for the larger Vite bundle warning.