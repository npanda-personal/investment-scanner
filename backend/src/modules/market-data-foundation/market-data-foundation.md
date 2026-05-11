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
- Corporate action ingestion deduplicates same-batch provider duplicates by normalized stock/date/type/source and relevant amount/split-ratio fields before upsert. Corporate-action reads also collapse and clean up existing persisted duplicates so old provider duplicates do not remain visible on instrument detail pages.
- Reverse split classification when the provider returns a split ratio below `1`.
- Minimal persisted FX rates through `FxRate`.
- Canonical `/api/v1` APIs plus existing compatibility routes.
- Frontend instrument exploration, add instrument, instrument detail, status panel, and manual sync flows.
- **Global Market Scope**: Support for `region` and `assetType` filtering in instrument list and search APIs.
- **Metadata hardening**: Provider/company metadata updates preserve existing non-null values when a later provider response omits fields. Indian NSE/BSE symbols default to `India`, `IN`, and `INR` when the provider omits country/currency.
- **Instrument classification**: API DTOs expose normalized `asset_type` plus `instrument_segment`. New catalog imports persist segment/source/provider-support metadata; older rows still get safe DTO-level derivation.
- **Catalog-source ingestion**: Bounded imports can create/update instrument master rows from NSE security-master style CSVs, F&O underlying lists, ETF rows, and a small Indian index seed list. Yahoo Finance remains validation/enrichment/history only, not the master catalog.

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
- `market-data-foundation.market-session.ts`
  - Market-hours/session decision helper for scheduler-safe 1D ingestion.
- `market-data-foundation.scheduler.ts`
  - Disabled-by-default scheduled ingestion coordinator with overlap protection and status reporting.
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
  - Instrument/company master data: symbol, name, display symbol, provider symbol, source symbol, exchange, country, sector, industry, currency, market cap, asset type, instrument segment, catalog source, provider support status/error, derivatives eligibility, optional futures contract metadata, active/delisted status, IPO date, ISIN, source, data status.
  - `assetType` may contain legacy `EQUITY` rows. API responses normalize `EQUITY` to `STOCK`; repository filters treat `STOCK` and `EQUITY` as backward-compatible cash equity values.
  - Catalog updates are additive and null-preserving. Existing sector, industry, country, currency, market cap, and classification values are not overwritten by null source/provider values.
- `PriceTick`
  - Daily OHLCV bars, adjusted close when supplied, source, ingestion timestamp, last updated timestamp, data status.
- `LatestPrice`
  - Latest price snapshot per symbol.
- `Fundamental`
  - Historical/provider-period fundamentals: revenue, EPS, net income, PE ratio, dividend yield, shares outstanding, market cap, currency, period type, normalized period end date, source, metadata.
- `CorporateAction`
  - Dividends, splits, reverse splits, effective date, declared date, payment date, amount, split ratio, currency, source, and `naturalKey`.
  - `naturalKey` is a normalized logical identity: `stockId + type/actionType + UTC effective date + source + amount/split ratio`. It prevents same-date provider duplicates while preserving distinct same-day actions when the amount or split ratio differs.
- `FxRate`
  - Latest FX rates with pair, base currency, quote currency, rate, source, and metadata.
- `MarketDataSyncState`
  - Per-region/per-asset/per-trading-day scheduler state. The scheduler records `PENDING`, `SYNCED`, `FINAL_CONFIRMED`, or `FAILED` so server restarts do not cause repeated post-close API calls after the final daily candle is confirmed.

## Backend API Surface

### Standard Pagination & Filtering

Most list endpoints support standard `PaginationOptions`:
- `page`: Page number (default 1)
- `pageSize`: Items per page (default 25)
- `sortBy`: Field to sort by
- `sortOrder`: 'asc' or 'desc'
- `region`: Global market region (IN, US, EU, GLOBAL). Mapped to exchanges and country metadata.
- `assetType`: Optional asset class identifier. The Market Data Foundation catalog page does not send a default asset type; selecting only `region=IN` returns all Indian instrument classes.
- `instrumentSegment`: Derived class/segment filter. `CASH` maps to cash-like `STOCK`, legacy `EQUITY`, and null asset-type rows while excluding future-like symbols. `FUTURES` maps to persisted `FUTURE`/`FUTURES` and symbol/name patterns containing `FUT`/`future`; `CURRENCY` maps to `FOREX`.
- `sector` and `industry`: Case-insensitive partial text filters.
- `search`: Case-insensitive partial text across symbol and company name.
- `exchange`, `currency`, `assetType`, `instrumentSegment`, and `dataStatus`: Exact normalized filters. `currency=INR` also includes Indian NSE/BSE rows with missing persisted currency because local catalog rules deterministically infer `INR` for those instruments.
- `catalogSource`: Exact normalized source filter such as `NSE_EQUITY_SECURITIES`, `NSE_EQUITY_DERIVATIVES_UNDERLYINGS`, `NSE_INDEX_SECURITIES`, `BSE_INDEX_SECURITIES`, `NSE_INDEX_SEED`, `NSE_ETF_SECURITIES`, `BROKER_SCRIP_MASTER`, or `UNKNOWN`.
- `providerSupportStatus`: Exact normalized provider validation filter: `SUPPORTED`, `UNSUPPORTED`, `UNKNOWN`, or `VALIDATION_FAILED`.
- `derivativesEligible`: Boolean filter for instruments found in an F&O underlying source. This does not mean an actual futures contract exists.

Unknown `sortBy` values fall back to `symbol` to prevent invalid Prisma order fields from breaking list requests.

The list query and count query share the same Prisma `where` object, so pagination totals reflect active filters. Pagination is applied after filtering and sorting.

### Metadata Mapping Rules

Yahoo Finance remains the only provider. Market Data Foundation maps free provider profile/price fields as follows:

| DTO field | Source/fallback |
| --- | --- |
| `company_name` | Yahoo `price.longName`, then `price.shortName`, then existing stock name. |
| `exchange` | Yahoo `price.exchangeName`, then symbol suffix inference. |
| `country` | Yahoo `summaryProfile.country`; `.NS`/NSE and `.BO`/BSE fallback to `India`. |
| `region` | Existing stock region or suffix/exchange inference. |
| `currency` | Yahoo `price.currency`; `.NS`/NSE and `.BO`/BSE fallback to `INR`. |
| `sector` / `industry` | Yahoo `summaryProfile`; not faked when unavailable. |
| `market_cap` | Yahoo `price.marketCap`; not faked when unavailable. |
| `asset_type` | Yahoo `quoteType`, normalized. `EQUITY` is returned as `STOCK`. |

Repository updates are null-preserving: an omitted/null provider field does not erase an existing non-null country, sector, industry, currency, market cap, asset type, ISIN, IPO date, or exchange. Missing metadata is surfaced through `missing_metadata_fields` and `metadata_completeness_score` in the v1 instrument DTO so the UI can show diagnostics instead of hiding gaps behind generic `N/A` values.

### Catalog Source Strategy

Market Data Foundation separates catalog discovery from provider ingestion:

- Catalog sources create or update the instrument master.
- Yahoo Finance validates provider support, enriches metadata when available, and ingests OHLCV history.
- Yahoo Finance is not treated as a complete exchange/security master catalog.

Supported catalog source values:

| Source | Behavior |
| --- | --- |
| `NSE_EQUITY_SECURITIES` | Imports NSE cash-equity style rows as `.NS`, `STOCK / CASH`, `IN`, `NSE`, `India`, `INR`. Default URL: `https://nsearchives.nseindia.com/content/equities/sec_list.csv`. |
| `NSE_EQUITY_DERIVATIVES_UNDERLYINGS` | Marks stock/index underlyings as `derivativesEligible=true`. It does not create futures contracts. No stable default URL is bundled; configure `MARKET_DATA_CATALOG_NSE_FO_UNDERLYINGS_URL` or use Manual CSV. |
| `NSE_INDEX_SECURITIES` | Imports NSE index catalog rows from the public NSE all-indices JSON endpoint as `INDEX / INDEX`. Default URL: `https://www.nseindia.com/api/allIndices`. Known Yahoo symbols such as `^NSEI`, `^NSEBANK`, and common sector index symbols are attached when mapped; other rows remain catalog-visible with `providerSupportStatus=UNKNOWN` until validation. |
| `BSE_INDEX_SECURITIES` | Imports BSE index catalog rows from the public BSE mobile index-watch page as `INDEX / INDEX`. Default URL: `https://m.bseindia.com/IndicesView_New.aspx`. Known Yahoo symbols such as `^BSESN` are attached when mapped; other rows remain catalog-visible until provider validation. |
| `NSE_INDEX_SEED` | Imports a small built-in fallback Indian index seed list: `^NSEI`, `^NSEBANK`, and `^BSESN` as `INDEX / INDEX`. No URL is required. Use `NSE_INDEX_SECURITIES` and `BSE_INDEX_SECURITIES` for broader index catalogs. |
| `NSE_ETF_SECURITIES` | Imports ETF security rows as `ETF / ETF` when the source row is clearly ETF-like. Default URL: `https://nsearchives.nseindia.com/content/equities/eq_etfseclist.csv`. |
| `BSE_EQUITY_SECURITIES` | Reserved for BSE security-master style imports. |
| `BROKER_SCRIP_MASTER` | Optional fallback discovery source only, not primary truth. |
| `LEGACY_NIFTY500` | Backfilled provenance for older NIFTY 500 rows when the original source is known or source metadata hints at it. |
| `LEGACY_DATABASE` | Backfilled provenance for older database rows with no source-master lineage. |
| `MANUAL` / `UNKNOWN` | Manual or unclassified catalog provenance. |

The import endpoint is `POST /api/v1/market-data/catalog/import`. It supports two import modes:

- `MANUAL_CSV`: existing fallback mode. The request supplies `csvText`.
- `CONFIGURED_URL`: the backend resolves the default or env-configured source URL, downloads the configured CSV/JSON/HTML text to a controlled temp folder, imports the bounded batch, and deletes the temp file.
- `INTERNAL_SEED`: used by `NSE_INDEX_SEED`; no CSV or URL is required.

Requests accept `catalogSource`, `importMode`, optional `csvText`, optional `validateProvider`, and bounded `batchSize`/`offset`. Responses include `sourceRows`, `processedCount`, `totalCount`, `nextOffset`, `hasMore`, inserted/updated/no-op/invalid counts, provider validation counts, warnings, duration, and URL-download metadata when applicable. Imports are idempotent on current `Stock.symbol`, preserve non-null metadata, and only update changed fields.

`GET /api/v1/market-data/catalog/sources` returns configured source metadata for the UI: source display name, enabled flag, region, asset type, segment/class, import modes, parser type, `urlConfigured`, `urlSource`, setup hint, and support flags for manual CSV, configured URL, and internal seed. Full configured URLs are not exposed in the response.

### Configured URL Imports

Configured source URLs are controlled by environment variables. No arbitrary runtime URL is fetched by default.

| Variable | Purpose |
| --- | --- |
| `MARKET_DATA_CATALOG_NSE_EQUITY_URL` | Override for NSE cash-equity CSV. Default: `https://nsearchives.nseindia.com/content/equities/sec_list.csv`. |
| `MARKET_DATA_CATALOG_NSE_ETF_URL` | Override for NSE ETF CSV. Default: `https://nsearchives.nseindia.com/content/equities/eq_etfseclist.csv`. |
| `MARKET_DATA_CATALOG_NSE_INDICES_URL` | Override for NSE all-indices JSON. Default: `https://www.nseindia.com/api/allIndices`. |
| `MARKET_DATA_CATALOG_BSE_INDICES_URL` | Override for BSE index-watch HTML. Default: `https://m.bseindia.com/IndicesView_New.aspx`. |
| `MARKET_DATA_CATALOG_NSE_FO_UNDERLYINGS_URL` | NSE F&O underlyings CSV. No default is bundled; Manual CSV remains available. |
| `MARKET_DATA_CATALOG_BSE_EQUITY_URL` | Future BSE equity/security-master CSV. |
| `MARKET_DATA_CATALOG_BROKER_SCRIP_MASTER_URL` | Optional fallback discovery source. Disabled in config by default. |
| `MARKET_DATA_CATALOG_DOWNLOAD_TIMEOUT_MS` | Download timeout, default `15000`. |
| `MARKET_DATA_CATALOG_MAX_DOWNLOAD_MB` | Max CSV download size, default `10`. |
| `MARKET_DATA_CATALOG_TEMP_DIR` | Controlled temp directory, default `backend/tmp/catalog-imports`. |
| `MARKET_DATA_CATALOG_KEEP_TEMP_FILES` | Debug-only retention flag, default `false`. |

Security controls:

- Only built-in configured source URLs are used.
- URL protocol must be `https`.
- `localhost`, loopback, link-local, private IPv4 ranges, and common local IPv6 ranges are rejected.
- Downloads are timeout-limited and size-limited.
- Files are written only to the configured temp directory with generated safe filenames.
- Downloaded content is parsed as source-specific CSV, JSON, or HTML text only and is never executed.
- Temp files are deleted after import or parser failure unless `MARKET_DATA_CATALOG_KEEP_TEMP_FILES=true`.
- Logs include source, mode, file size, row counts, counts, and cleanup status, not full CSV contents.

The first implementation downloads/parses the configured source per import request. Responses still return `hasMore` and `nextOffset`; callers can use bounded batches, but repeated offset requests may re-download the source file. A short-lived import-session cache can be added later if large source files make that necessary.

### Symbol Conventions And Backfill

Current stored `Stock.symbol` is treated as the canonical application key and is not rewritten by catalog backfill. Most existing NSE rows already use the Yahoo-compatible provider convention, for example `ABB.NS`. New fields clarify the different symbol roles:

- `symbol`: existing application/storage key. Price ticks remain keyed by this value.
- `sourceSymbol`: exchange/security-master base symbol, for example `ABB`.
- `providerSymbol`: Yahoo-compatible symbol used for provider fetches, for example `ABB.NS` or `ABC.BO`.
- `displaySymbol`: user-facing short symbol, currently the base symbol for NSE/BSE equities.

Normalization helpers follow these rules:

- NSE base `ABB` becomes `sourceSymbol=ABB`, `providerSymbol=ABB.NS`.
- Existing `ABB.NS` becomes `sourceSymbol=ABB`, `providerSymbol=ABB.NS`.
- BSE base `ABC` becomes `sourceSymbol=ABC`, `providerSymbol=ABC.BO`.
- Index provider symbols such as `^NSEI` are preserved.
- Invalid legacy provider suffixes on obvious NSE/BSE rows are corrected during DTO mapping and backfill; for example `RELIANCE.NL` on an NSE row becomes `providerSymbol=RELIANCE.NS`, while the UI displays the base symbol `RELIANCE`.

`POST /api/v1/market-data/catalog/backfill-metadata` safely backfills existing rows in bounded batches. It accepts `region`, optional `assetType`, `batchSize`/`limit`, `offset`, and `validateProvider`. Without validation it infers only deterministic fields for obvious NSE/BSE rows: `IN`, `India`, `INR`, exchange, `STOCK / CASH`, `sourceSymbol`, `displaySymbol`, `providerSymbol`, and legacy catalog provenance. It preserves existing non-null sector, industry, and market cap. Provider support remains `UNKNOWN` unless `validateProvider=true`.

F&O underlyings are deliberately not actual futures contracts. Underlying import can set:

- Stock underlying: `assetType=STOCK`, `instrumentSegment=CASH`, `derivativesEligible=true`.
- Index underlying: `assetType=INDEX`, `instrumentSegment=INDEX`, `derivativesEligible=true`.

Actual futures are expiry-specific. They must come from a real contracts source containing contract rows and expiry metadata, then validate provider support before becoming sync-ready. This module does not fake or synthesize futures contracts from underlyings.

F&O underlying matching compares base and provider symbols, so `ABB` from an underlying source can update a stored `ABB.NS` row, and `ABB.NS` can also match a base `ABB` row. Matched stock/index underlyings set `derivativesEligible=true`; they do not become `FUTURE / FUTURES`.

The service also includes a conservative built-in NSE F&O stock-underlying seed so obvious current F&O stocks such as `RELIANCE` render as F&O eligible during catalog import/backfill even before a separate F&O underlying file is imported. A source import remains the preferred way to keep the full list current.

Provider validation is optional and batch-bounded. When enabled, the module runs a lightweight Yahoo chart check for each imported or backfilled provider symbol in the current batch and records `SUPPORTED` or `UNSUPPORTED` with the provider error/message. OHLCV sync selection skips `UNSUPPORTED` rows so unsupported symbols stay visible in the catalog but are not repeatedly ingested.

OHLCV ingestion fetches from `providerSymbol` when present and falls back to `symbol` only when provider metadata is missing. Returned provider rows are remapped to the stored `symbol` before persistence, so existing `PriceTick` uniqueness and downstream reads remain backward-compatible.

### Instrument Classification

Current rules:

| Normalized `asset_type` | `instrument_segment` |
| --- | --- |
| `STOCK` | `CASH` |
| `ETF` | `ETF` |
| `INDEX` | `INDEX` |
| `FUTURE` | `FUTURES` |
| `FOREX` | `CURRENCY` |
| `COMMODITY` | `COMMODITY` |
| `CRYPTO` | `CRYPTO` |
| `FUND` | `FUND` |
| `OTHER` | `OTHER` |
| `UNKNOWN` | `UNKNOWN` |

For the current India catalog scope, `.NS`, `.BO`, NSE, and BSE cash equity rows should render as `STOCK / CASH`. Future-like symbols such as `...FUT` render as `FUTURE / FUTURES` even when old catalog data stored them as `EQUITY`; this is retained as a DTO/query compatibility rule for old rows.

`STOCK` sync remains stock/cash scoped. `INDEX`, `ETF`, and `FUTURE` rows are only included when that asset type or segment is explicitly selected. Unsupported provider symbols are excluded from OHLCV sync task selection.

### Canonical MVP Endpoints

| Endpoint | Purpose | Status |
| --- | --- | --- |
| `GET /api/v1/market-data/health` | Market data health, instrument count, freshness, trust metadata | Implemented |
| `GET /api/v1/market-data/scheduler/status` | Scheduler config, active run state, region session decisions, and latest sync summaries | Implemented |
| `GET /api/v1/market-data/catalog/sources` | Lists configured catalog sources and URL availability without exposing full URLs | Implemented |
| `POST /api/v1/market-data/catalog/import` | Bounded source-based catalog import and optional provider validation | Implemented |
| `POST /api/v1/market-data/catalog/backfill-metadata` | Bounded metadata/provider-symbol backfill for existing catalog rows | Implemented |
| `GET /api/v1/instruments` | List/search instruments with `region` support | Implemented |
| `POST /api/v1/instruments` | Create instrument | Implemented |
| `GET /api/v1/instruments/:id` | Get instrument detail | Implemented |
| `GET /api/v1/prices/:instrumentId` | Get OHLCV prices with date range | Implemented |
| `POST /api/v1/ingestion/sync` | Sync by symbol or ID | Implemented |

Legacy compatibility endpoints are still supported.

## Market-Aware 1D Scheduler

The scheduler is intentionally disabled by default and is designed for daily candles, not live trading. Manual full sync remains available through existing ingestion routes.

Environment defaults:

| Variable | Default | Purpose |
| --- | --- | --- |
| `MARKET_DATA_SCHEDULER_ENABLED` | `false` | Enables background scheduled ingestion. |
| `MARKET_DATA_SCHEDULER_INTERVAL_MINUTES` | `15` | Scheduler wake-up interval. |
| `MARKET_DATA_SCHEDULER_REGIONS` | `IN` | Explicit comma-separated regions. `GLOBAL` is not expanded automatically. |
| `MARKET_DATA_SCHEDULER_ASSET_TYPE` | `STOCK` | Current scheduled asset scope. |
| `MARKET_DATA_SCHEDULER_BATCH_SIZE` | `25` | Max instruments processed per scheduled run. |
| `MARKET_DATA_SCHEDULER_SYNC_DURING_MARKET_HOURS` | `false` | Default is post-close only for 1D strategy workflows. |
| `MARKET_DATA_SCHEDULER_POST_CLOSE_WINDOW_MINUTES` | `120` | Window after close where final candle capture is useful. |
| `MARKET_DATA_SCHEDULER_FINALIZATION_GRACE_MINUTES` | `15` | Grace period after close before final confirmation can be trusted. |
| `MARKET_DATA_SCHEDULER_SKIP_WEEKENDS` | `true` | Skips non-trading weekends by default. |
| `MARKET_DATA_MANUAL_SYNC_COOLDOWN_MINUTES` | `15` | Cooldown for manual catalog/instrument freshness checks before another provider fetch is eligible. |

### Session Model

`IN` is configured with `Asia/Kolkata`, regular hours `09:15-15:30`, Monday-Friday, a 120-minute post-close sync window, and a 15-minute finalization grace period. `US` and `EU` have documented approximate weekday sessions for future readiness. Holiday arrays are empty in MVP; no paid calendar API is used.

Scheduler decision states:

- `BEFORE_MARKET_OPEN`: skip.
- `MARKET_OPEN`: skip by default for 1D data; run only if explicitly enabled.
- `POST_CLOSE_FINALIZATION_WINDOW`: run incremental sync.
- `FINAL_CANDLE_CONFIRMED`: skip until next trading day.
- `MARKET_CLOSED_NO_SYNC`: skip after the useful window.
- `WEEKEND_OR_HOLIDAY`: skip.
- `MISSING_FINAL_CANDLE_RETRY`: allow a retry if the trading-day candle is missing after the window.

### Scheduled Sync Behavior

Scheduled sync is incremental only. It processes a bounded batch of active instruments for the configured region and asset type, using a recent lookback rather than the 15-year manual backfill path.

The scheduler avoids overlapping runs with an in-process lock. Each region is evaluated independently, so `IN,US` will only run the region whose market window is useful at that moment.

### Sync Freshness Gate

The module distinguishes two different outcomes:

- **No-op storage**: the provider was fetched, the returned candle matched the stored OHLCV/adjusted-close/volume values, and the `PriceTick` row was not rewritten.
- **No-new-data skip**: the provider was not called because a catalog or instrument was checked recently, the market session cannot produce a useful new 1D candle, or the final daily candle is already confirmed.

Manual catalog and instrument syncs use a freshness cooldown before provider fetch. The default is `MARKET_DATA_MANUAL_SYNC_COOLDOWN_MINUTES=15`. If Sync Catalog is clicked again inside this window, the service short-circuits before worker/provider execution and returns:

- `noNewData: true`
- `skippedBeforeFetchCount`
- `providerFetchSkippedCount`
- `skippedReasonCounts`
- `skippedReasons`
- `lastCheckedAt`
- `nextEligibleSyncAt`

Current skip reasons:

- `RECENTLY_SYNCED`
- `BEFORE_MARKET_OPEN`
- `WEEKEND_OR_HOLIDAY`
- `FINAL_CANDLE_CONFIRMED`
- `MARKET_CLOSED_NO_NEW_DAILY_DATA`

`force: true` or `fullReload: true` bypasses the freshness cooldown and still uses idempotent no-op storage, so corrected or explicitly requested candles can be checked without creating duplicate rows.

The scheduler status endpoint also exposes candle freshness fields so the UI can separate "today is not useful before market open" from "the latest completed daily candle is synced":

- `todayTradingDate`: market-local trading date being evaluated.
- `latestCompletedTradingDate`: the most recent trading date whose final 1D candle should reasonably exist.
- `latestStoredTradingDate`: newest `PriceTick` daily date stored for the region.
- `todayCandleStored`: whether today's trading-date candle is already stored.
- `latestCompletedCandleStored`: whether the latest completed trading date is stored.
- `latestStoredCandleIsCurrent`: whether stored data is at least as recent as the latest completed trading date.
- `candleSyncStatus`: `CURRENT`, `MISSING_LATEST_COMPLETED`, `NO_STORED_CANDLES`, `TODAY_STORED_PENDING_FINAL_CONFIRMATION`, or `UNKNOWN_SESSION`.

### Final Candle Confirmation

`MarketDataSyncState` persists one row per `region + assetType + tradingDate`. After post-close sync stores today's candle, a later no-op run confirms the provider candle is unchanged. When `rowsInserted = 0`, `rowsUpdated = 0`, `rowsNoOp > 0`, and today's candle exists, the state becomes `FINAL_CONFIRMED`; later scheduled runs skip that market until the next trading day.

### Smart Candle No-Op Rules

Daily candles are compared before writing:

- `open`
- `high`
- `low`
- `close`
- `adjustedClose`
- `volume`

Decimal fields use a small numeric tolerance. Identical existing rows are counted as `rowsNoOp` and not rewritten. Changed rows are updated; missing rows are inserted.

Known limitations:

- Holiday handling is static/empty in MVP.
- `US` and `EU` sessions are approximate defaults until exchange-specific calendars are introduced.
- Scheduled batches are bounded by `MARKET_DATA_SCHEDULER_BATCH_SIZE`; broad universe rotation/cursoring can be added later.
- The scheduler does not perform live trading, broker execution, order placement, or portfolio automation.

## Validation And Reliability

Implemented validations:

- Instrument create requires `symbol`, `company_name`, `exchange`, `currency`, and `asset_type`.
- Price timestamps normalized to UTC midnight for idempotent storage.
- Regional mapping logic ensures `IN` filters for NSE/BSE and `India`.
- Local search and catalog sync task selection respect the same region/asset scope filters used by list endpoints.
- Scheduled batch selection prioritizes instruments with `null` or oldest `lastSuccessfulDataLoadTimestamp` before symbol order, so bounded scheduled runs do not repeatedly process only the first symbols alphabetically.

## Idempotent Persistence Rules

Natural keys for stock-data records owned by this module:

| Model | Natural key | Behavior |
| --- | --- | --- |
| `Stock` | `symbol` | Upsert; long-term risk documented. |
| `PriceTick` | `symbol + normalized daily timestamp` | Idempotent updates. |
| `MarketDataSyncState` | `region + assetType + tradingDate` | Idempotent upsert of scheduler state and final-candle confirmation. |
| `CorporateAction` | persisted `naturalKey = stockId + type/actionType + normalized effective date + source + amount/split ratio` | Same-batch provider duplicates with the same natural key are collapsed before upsert. Existing persisted duplicates are deduplicated on read/cleanup, preferring normalized effective dates and latest metadata, and later non-null provider fields update the retained logical action. |

## Frontend Structure

- `MarketDataFoundationPage`: Integrated with `useMarketScope()`. Automatically filters by the globally selected region.
  - Splits the operational surface into Catalog, Import & Backfill, and Data Health tabs so import controls, diagnostics, and table exploration do not compete in one crowded view.
  - Shows a scan-focused catalog table with Symbol, Company, Provider Symbol, Exchange, Asset Type, Segment/Class, F&O Eligible, Provider Support, Data Health, Last Updated, and Actions. Lower-frequency metadata such as sector, industry, market cap, source symbols, catalog source, and provider errors is available in a row detail drawer.
  - Provides preset chips for common catalog workflows such as Stocks, F&O Eligible, Needs Validation, Unsupported, Indices, and ETFs. The main filter bar stays intentionally compact with search, exchange, asset type, segment/class, currency, and F&O eligibility; diagnostic filters remain backend-supported and can be applied by presets.
  - Provides a bounded Catalog Import panel for NSE equity securities, F&O underlyings, index seed rows, ETF rows, and fallback broker/public scrip-master CSVs. Index seed import does not require CSV text.
  - Catalog import and metadata backfill run client-orchestrated bounded batches until `hasMore=false`, disable competing actions while running, and show determinate progress from backend `processedCount`/`totalCount`.
  - The filter bar uses a wrapping responsive layout so Refresh and Reset stay inside the page container. Table horizontal scrolling is limited to the table area.
  - Changing any local filter resets to page 1. Reset clears only local filters and preserves the global market scope. Empty states name the active filters so no-result states such as `FUTURE / FUTURES` are explicit.
  - Status cards show scoped instrument health before local filters; the table match chip shows the locally filtered count.
  - Sync Catalog success/no-new-data alerts include daily candle freshness details from `/api/v1/market-data/scheduler/status`, so users can see whether the latest completed candle is already synced.
- `MarketDataStatusPanel`: Shows health, instrument count, last data timestamp, and a Daily Candle card with the latest completed/stored candle status.
- `InstrumentSearchSelect`: Shared component for picking stocks. Defaults to the active region scope with an optional `global` override.

Frontend routes are defined in `routes.tsx` and exported via `index.ts`.

## Tests And Verification

- `backend/src/shared/utils/market-scope.test.ts`: Verifies regional mapping logic.
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`: Verifies service logic.
- `backend/tests/modules/market-data-foundation/market-data.market-session.test.ts`: Verifies IN market-session skip/run decisions.
- `backend/tests/modules/market-data-foundation/market-data.scheduler.test.ts`: Verifies scheduler skip, incremental mode, and overlap protection.
- `backend/tests/modules/market-data-foundation/market-data.repository.test.ts`: Verifies smart daily-candle no-op/update persistence.
- `backend/tests/modules/market-data-foundation/market-data.repository.test.ts`: Verifies corporate-action natural-key deduplication before upsert, read-time dedupe for existing duplicate rows, and idempotent cleanup of older duplicate corporate actions.
- `backend/tests/modules/market-data-foundation/market-data.provider.test.ts`: Verifies provider mapping, malformed row handling, corporate actions, and Indian metadata fallbacks.

Verification commands:

- `npx prisma generate` after Prisma schema changes.
- `npm run build`
- `npm test -- market-data --runInBand`

## Assumptions

- All data integration remains free/open-source.
- Application-wide market context is controlled by the header selector.
