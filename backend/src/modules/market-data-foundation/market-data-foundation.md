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
- **Universe readiness contract**: Scoped instruments are classified into explicit computed states (`CATALOG_ONLY`, `PROVIDER_SUPPORTED`, `PRICE_READY`, `CONTEXT_READY`, `REVIEW_READY`, `UNSUPPORTED`, `STALE_OR_INCOMPLETE`, `DELISTED_OR_INACTIVE`). The health endpoint quantifies provider validation, price readiness, metadata coverage, review-ready counts, blockers, warnings, and trust status so downstream modules do not treat catalog size as the reviewable universe.
- **Universe repair workflow**: First-class bounded repair endpoints expose provider validation, catalog identity repair, provider business metadata repair, manual metadata import, and price backfill queues. Provider validation is staged: fresh `UNKNOWN` rows are validated first, retryable `VALIDATION_FAILED` rows are a separate explicit queue, and unsupported rows stay visible but excluded from downstream metadata/price blockers. Mutating provider/price/provider-business-metadata queues process from `offset=0` until empty so repaired rows cannot shrink the queue and cause skipped rows; catalog/manual CSV repairs page over a stable source list with normal `offset`/`nextOffset` semantics. Provider business metadata attempts are persisted as audit, and the current repair state is persisted separately so no-provider/no-op/partial rows become durable manual-required work instead of blocking later auto-repairable rows or reappearing after a time cutoff. Retryable provider errors carry `nextRetryAt` and are excluded until retry time. The UI shows the required work, one-batch actions, progress counts, warnings/no-ops/partial/manual-required counts, and refreshed health after each batch.
- **Provider proof repair**: A successful OHLCV fetch with usable rows marks the instrument provider status `SUPPORTED`. Existing `UNKNOWN` rows with stored usable price history are repaired on universe-read paths so catalog-only status does not hide proven provider support.

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
- `MarketDataRepairAttempt`
  - Per-stock repair attempt audit for provider validation, catalog identity, price backfill, provider business metadata, and manual metadata import workflows. Provider business metadata attempts persist `SUCCESS`, `PARTIAL_SUCCESS`, `NO_PROVIDER_DATA`, `NO_FIELDS_FILLED`, `MANUAL_REQUIRED`, `FAILED`, and `SKIPPED_RECENT_ATTEMPT` outcomes.
- `MarketDataRepairState`
  - Durable current repair state keyed by `stockId + repairType`. Provider business metadata repair uses `MANUAL_REQUIRED`, `FAILED_RETRYABLE`, `RETRY_COOLDOWN`, and `RESOLVED` states so repair-plan counts are distinct stocks, not attempt rows. `RESOLVED` is allowed only after valid sector, industry, and market cap are present. Missing business metadata with no blocking current state is inferred as auto-repairable, while retryable failures become eligible only after `nextRetryAt`.
- `MarketDataRepairRun`
  - Operational repair-run evidence for bounded universe repair execution. Each row stores scope, status (`RUNNING`, `COMPLETED`, `PARTIAL`, `PARTIAL_BLOCKED`, `PARTIAL_MANUAL_REQUIRED`, `FAILED`), started/completed timestamps, before/after universe-health snapshots, before/after repair-plan snapshots, requested actions, aggregate summary, universe signoff evidence, warnings, and error text when a run stops early.

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

Metadata repair is split by source ownership:

1. `CATALOG_IDENTITY_REPAIR` uses NSE/BSE/security-master catalog sources for deterministic identity fields: source symbol, display symbol, provider symbol, exchange, country, currency, asset type, segment, ISIN, listing date, catalog source, and row source. This is the primary path for missing ISIN/listing-date repair.
2. `PROVIDER_BUSINESS_METADATA_REPAIR` uses Yahoo/company master data for business fields only: company name, confirmed provider exchange/name fields, sector, industry, and market cap. A provider response with `dataStatus=MISSING` is provider-not-found even if country/currency/asset type can be inferred from symbol suffix.
3. `MANUAL_METADATA_IMPORT` accepts curated local CSV fallback for business fields provider/catalog cannot fill, especially sector, industry, and market cap for Indian small/mid-cap names. Null-equivalent sector/industry values (`Unknown`, `N/A`, `NA`, blank, `None`, `Null`) are rejected. The CSV must include `symbol` or `providerSymbol`, valid `sector`, valid `industry`, and positive numeric `marketCap`; rows without valid market cap stay unresolved and are not counted as repaired.
4. Existing non-null database values are preserved unless a workflow explicitly supplies a real replacement.

Null provider fields never erase existing non-null values. Metadata repair is no-op safe: it reports `updated` only when a missing required field actually improves. Responses include `fieldsFilled`, `partialSuccess`, `noOp`, `manualRequired`, `providerNotFound`, catalog-identity repair counts, matched/unmatched catalog rows, provider-business metadata repair counts, and field-provenance entries for rows that changed. For `IN / STOCK`, provider-business metadata is unresolved until sector, industry, and a positive numeric market cap are present; partial provider/manual fills remain `MANUAL_REQUIRED` with the remaining fields named.

### Universe Readiness Contract

`GET /api/v1/market-data/universe/health?region=IN&assetType=STOCK` is the primary health contract for downstream review workflows. It defaults to `IN / STOCK` when a caller does not provide scope and returns:

- `scope`, `generatedAt`, `latestStoredEodDate`, and `expectedLatestTradingDate`.
- Counts by universe state plus active, inactive/delisted, provider-supported, provider-unknown, unsupported, catalog-only, price-ready, context-ready, review-ready, stale/incomplete, missing latest price, stale latest price, inadequate history, missing recent volume, and missing metadata fields.
- `coverage.priceCoveragePercentage`, `coverage.metadataCoveragePercentage`, and `coverage.reviewReadyPercentage`.
- `topBlockers`, `warnings`, `trustStatus`, `trustReasons`, and `universeSignoff`.

`universeSignoff` is the explicit downstream gate. For `IN / STOCK`, `status=PASS` requires provider unknown count `0`, retry-failed provider validations `0`, provider-supported catalog identity repair needed `0`, provider-supported business metadata auto-repairable/retry-eligible/manual-required `0`, provider-supported price backfill needed `0`, latest stored EOD at or after expected EOD, `reviewReady` at least the configured threshold (`MARKET_DATA_SIGNOFF_MIN_REVIEW_READY`, default `300`), review-ready percentage at least `10%` of active catalog unless a smaller configured review universe is introduced, and `trustStatus=OK`. `downstreamAllowed` is `false` unless signoff passes.

State rules:

- `CATALOG_ONLY`: catalog row exists but provider support is `UNKNOWN` or blank. These rows are not reviewable.
- `UNSUPPORTED`: provider validation failed, provider symbol cannot be mapped, or provider data is unusable.
- `STALE_OR_INCOMPLETE`: provider exists but latest price, freshness, history, or volume is incomplete.
- `PRICE_READY`: latest EOD date is greater than or equal to `expectedLatestTradingDate`, at least 252 bars exist, at least 200 bars exist for SMA200 workflows, the rolling 252-row window is sufficiently complete, large date gaps are absent, recent volume coverage is acceptable, and adjusted-close fallback status is explicit. There is no blanket calendar-day tolerance; weekends and holidays must be handled by the market calendar. If the expected trading date cannot be determined, the row is blocked with `MARKET_CALENDAR_UNCERTAIN`.
- `CONTEXT_READY`: `PRICE_READY` plus sector, industry, country, currency, and for `IN / STOCK`, ISIN and listing-date metadata.
- `REVIEW_READY`: `CONTEXT_READY`, active, not delisted, provider-supported, and no critical provider/symbol or price-adjustment blockers.
- `DELISTED_OR_INACTIVE`: excluded from current review workflows and counted separately.

The v1 instrument list/detail DTOs also expose computed read-model fields: `universe_state`, `provider_readiness`, `price_readiness`, `metadata_readiness`, `review_readiness`, `price_history_bars`, `latest_price_date`, `expected_latest_trading_date`, `has_recent_volume`, `rolling_window_bars`, `rolling_window_coverage_percent`, `max_price_gap_days`, `recent_volume_coverage_percent`, `adjusted_close_coverage_percent`, `uses_adjusted_close_fallback`, `readiness_blockers`, and `readiness_warnings`.

### Trusted Review Universe

Full Catalog Health remains the strict data-ops contract. Trusted Review Universe is a separate user-facing price-action subset used by Today Review Lite.

`GET /api/v1/market-data/review-universe?region=IN&assetType=STOCK` returns catalog count, provider-supported count, trusted count, status (`READY`, `LIMITED`, `NOT_READY`), mode (`FULL_REVIEW`, `LIMITED_REVIEW`, `NO_REVIEW`), target session (`targetTradingDate`), required EOD data date (`requiredDataThroughDate`), stored EOD data date (`storedDataThroughDate`), excluded counts, context-gap counts, scan policy, thresholds, and warnings. Defaults are `TRUSTED_REVIEW_MIN_LITE=100` and `TRUSTED_REVIEW_MIN_FULL=300`.

`GET /api/v1/market-data/review-universe/instruments?region=IN&assetType=STOCK&limit=100` returns trusted instruments and recent OHLCV history for Lite setup/evidence evaluation.

Trusted inclusion rules for `IN / STOCK`:

- active and not delisted
- provider support is `SUPPORTED`
- latest EOD is current for the review as-of date
- at least 120 OHLCV bars
- recent volume exists
- adjusted close exists or close fallback is flagged as a warning
- no unresolved critical corporate-action price blocker

Missing sector, industry, market cap, ISIN, or listing date is a context gap, not a hard blocker for this subset. These gaps remain visible in `contextGapCounts` and confidence/scoring context, while strict Full Catalog Health continues to block full-catalog signoff.

Trusted instrument lists are ordered by trading usefulness for review scans: recent volume descending, price-history completeness, latest price freshness, then symbol. Today Review should record whether it scanned the full trusted set or a configured capped subset.

### Universe Repair Workflow

Universe health does not mutate data. The repair workflow is intentionally separate and bounded so provider-facing work is explicit:

- `GET /api/v1/market-data/universe/repair-plan?region=IN&assetType=STOCK`
  - Returns staged provider queue counts (`providerUnknownValidationNeeded`, `providerRetryValidationNeeded`, `providerUnsupportedExcluded`, `providerValidationFailed`), compatibility provider counts (`providerValidationNeeded`, `retryFailedValidations`), supported-only downstream blocker counts (`supportedCatalogIdentityRepairNeeded`, `supportedBusinessMetadataRepairNeeded`, `supportedPriceBackfillNeeded`, `unsupportedExcluded`), catalog-identity-repair-needed, price-backfill-needed, business-metadata-repair-needed, business-metadata-auto-repairable, business-metadata-manual-required, business-metadata-retry-blocked, business-metadata-retry-eligible, business-metadata-recently-attempted/current-state, manual-metadata-required, manual-business-metadata-required, missing-ISIN, missing-listing-date, missing-sector, missing-industry, missing-market-cap, legacy manual-sector-industry-required counts, and `universeSignoff` for the scope. `providerValidationNeeded` maps to unknown validation only, while `retryFailedValidations` maps to retry validation. `manualBusinessMetadataRequired` is the primary manual import count; `manualSectorIndustryRequired` is a narrower compatibility/detail count.
- `GET /api/v1/market-data/universe/repair-runs/latest?region=IN&assetType=STOCK`
  - Returns the latest persisted operational repair run for the scope, including status, before/after snapshots, summary, warnings, `anotherRunNeeded`, `expectedNextAction`, `hardBlockersRemaining`, final trust status, `universeSignoff`, stable-source fingerprints, and error.
- `POST /api/v1/market-data/universe/repair-run`
  - Orchestrates bounded repair batches in dependency order: unknown provider validation, retry-failed provider validation only after unknowns are drained, catalog identity repair, provider business metadata repair, optional manual metadata import when CSV text is supplied/requested, and price backfill. Request fields include `region`, `assetType`, `batchSize`, `maxBatchesPerAction`, `mode`, `actions`, `dryRun`, `csvText`, `catalogSource`, `importMode`, `providerValidationQueue`, `force`, and `fullReload`. `mode=DRAIN_UNTIL_BLOCKED` keeps executing dependency-ordered bounded batches until requested queues drain, a queue stops decreasing, a stable source fails, max-batch bounds are reached, or only manual metadata remains. It must not stop on retry-failed provider rows while fresh unknown provider rows remain; retry no-progress stops with the explicit diagnosis warning. Dry-run mode does not mutate or persist; it returns estimated totals, planned batches, top blockers, and the expected next action. Mutation mode persists a `MarketDataRepairRun`, records before/after health and repair-plan snapshots, stops safely as `PARTIAL`, `PARTIAL_BLOCKED`, or `PARTIAL_MANUAL_REQUIRED` when appropriate, and returns per-action summaries, aggregate counts, remaining hard blockers, final trust status, `universeSignoff`, and whether another bounded run or manual import is needed. `COMPLETED` is reserved for a requested repair scope that has no unfinished requested batches.
- `GET /api/v1/market-data/metadata/manual-template?region=IN&assetType=STOCK`
  - Exports unresolved business-metadata rows for curated repair. Rows include symbol, provider symbol, company name, exchange, current sector, current industry, current market cap, required fields, suggested source, notes, and a CSV template with `sector`, `industry`, and `marketCap` fill-in columns.
- `POST /api/v1/market-data/provider/validate`
  - Validates one bounded batch from the requested provider queue. `providerValidationQueue=UNKNOWN_FIRST` (default) selects only blank/null/`UNKNOWN` provider-support rows. `providerValidationQueue=RETRY_FAILED` selects only `VALIDATION_FAILED` rows. Clean provider failures persist `UNSUPPORTED`; request/provider errors persist `VALIDATION_FAILED`. The service ignores caller offset for this mutating queue and always fetches the first remaining batch.
- `POST /api/v1/market-data/catalog/identity-repair`
  - Parses a configured or manual NSE/BSE catalog source and repairs deterministic identity fields on existing rows. It pages over the stable catalog source list using `offset`/`nextOffset`, matches existing instruments by `providerSymbol + exchange`, `sourceSymbol + exchange`, `symbol + region + assetType`, then exact `name + exchange` fallback, rejects ambiguous collisions, updates only the matched stock id, preserves non-null values unless forced, and reports `fieldsFilled`, `matchedExistingRows`, `unmatchedCatalogRows`, `noOp`, and `manualRequired`.
- `POST /api/v1/market-data/metadata/provider-business/repair`
  - Enriches one bounded batch from Yahoo/company master business metadata for `sector`, `industry`, and `marketCap` only. The selector excludes rows missing only catalog identity fields such as ISIN or listing date. Provider `dataStatus=MISSING`, inferred country/currency/asset-type fallbacks, and company-name-only responses are not counted as business metadata success. No-provider/no-fields-filled attempts persist current state as `MANUAL_REQUIRED` and are skipped on later non-forced batches until explicitly forced or repaired manually, so the queue remains drainable without a time-window loophole.
- `POST /api/v1/market-data/metadata/manual-import`
  - Imports curated CSV metadata for existing rows. The CSV requires `symbol` or `providerSymbol`, valid `sector`, valid `industry`, and positive numeric `marketCap`; optional columns include `exchange`, `isin`, and `listingDate`. Null-equivalent sector/industry values and invalid/zero market cap values are rejected and do not update the database. Successful rows update only existing scoped instruments and resolve provider-business repair state only after sector, industry, and market cap are all valid.
- `POST /api/v1/market-data/prices/backfill`
  - Backfills one bounded batch of provider-supported rows whose price readiness is not `READY`. The repair caps `endDate` to the latest completed trading date for the region; `skipFreshnessGate=true` bypasses cooldown only, not completed-EOD safety. Provider responses with zero usable rows are treated as failed/no data, not as successful syncs.

All repair endpoints accept `region`, `assetType`, `batchSize`/`limit`, and `offset` for API compatibility. Mutating predicate queues intentionally return `nextOffset=0` while `hasMore=true` because callers must rerun against the first remaining queue page. Stable source-list repairs, including manual metadata CSV imports, return the next source offset and the UI must send that offset on the next batch. Responses include `processedCount`, `totalCount`, `nextOffset`, `hasMore`, `updated`, `skipped`, `failed`, `noOp`, `manualRequired`, warnings, and action-specific counts. Provider business repair additionally reports `providerNotFound`, `skippedRecentAttempt`, `remainingAutoRepairable`, and `remainingManualRequired`. No repair endpoint scans or mutates the full universe in one unbounded request.

Operational repair runs persist stable-source `sourceFingerprint` and `sourceIdentity` for catalog identity and manual metadata actions. Catalog fingerprints include the catalog source, import mode, configured URL/source key, raw content hash, normalized row hash, and row count. During an operational run, catalog identity repair loads the catalog source once into an in-memory snapshot and reuses the same rows, fingerprint, and source identity for every bounded batch in that action. The service must not download or parse the catalog again inside each batch; if the source cannot be loaded, the catalog action fails as `PARTIAL` before any persisted offset is reused or any catalog row is processed. Manual metadata fingerprints include the CSV content hash and row count. A later operational run resumes a stable source offset only when the action and fingerprint match; if the source changes, it restarts at offset 0 and warns `Source changed; restart from offset 0`.

Health count contract:

- `counts.readiness.priceReady`, `counts.readiness.contextReady`, and `counts.readiness.reviewReady` are readiness dimensions and are the fields downstream workflows should use for gates.
- `counts.byUniverseState.*` contains exact final universe-state buckets. These can differ from readiness counts because a `REVIEW_READY` row is also price-ready but is counted under `byUniverseState.REVIEW_READY`, not `byUniverseState.PRICE_READY`.
- Legacy flat fields such as `counts.priceReady` and `counts.PRICE_READY` remain for compatibility but new integrations should prefer the explicit nested contract.

### Catalog Source Strategy

Market Data Foundation separates catalog discovery from provider ingestion:

- Catalog sources create or update the instrument master.
- Yahoo Finance validates provider support, enriches metadata when available, and ingests OHLCV history.
- Yahoo Finance is not treated as a complete exchange/security master catalog.

Supported catalog source values:

| Source | Behavior |
| --- | --- |
| `NSE_EQUITY_SECURITIES` | Imports NSE cash-equity style rows as `.NS`, `STOCK / CASH`, `IN`, `NSE`, `India`, `INR`, including ISIN and listing date when available. Default URL: `https://archives.nseindia.com/content/equities/EQUITY_L.csv`. |
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
| `MARKET_DATA_CATALOG_NSE_EQUITY_URL` | Override for NSE cash-equity CSV. Default: `https://archives.nseindia.com/content/equities/EQUITY_L.csv`. |
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

Provider validation is optional and batch-bounded. When enabled, the module runs a lightweight Yahoo chart check for each imported, backfilled, or repair-selected provider symbol in the current batch and records `SUPPORTED`, clean `UNSUPPORTED`, or retryable `VALIDATION_FAILED` with the provider error/message. OHLCV sync selection skips `UNSUPPORTED` rows so unsupported symbols stay visible in the catalog but are not repeatedly ingested.

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
| `GET /api/v1/market-data/universe/health` | Strict scoped universe readiness health and review-ready counts | Implemented |
| `GET /api/v1/market-data/review-universe` | Trusted Review Universe health for Today Review Lite | Implemented |
| `GET /api/v1/market-data/review-universe/instruments` | Trusted Review Universe instruments and recent OHLCV history | Implemented |
| `GET /api/v1/market-data/universe/repair-plan` | Bounded repair queue counts for provider validation, catalog identity, provider business metadata, manual metadata, and price backfill | Implemented |
| `POST /api/v1/market-data/provider/validate` | Bounded provider support validation for explicit `UNKNOWN_FIRST` or `RETRY_FAILED` queues | Implemented |
| `POST /api/v1/market-data/catalog/identity-repair` | Bounded catalog identity repair from configured/manual NSE/BSE catalog sources | Implemented |
| `POST /api/v1/market-data/metadata/provider-business/repair` | Bounded provider business metadata repair with no-op/provider-not-found accounting | Implemented |
| `POST /api/v1/market-data/metadata/manual-import` | Bounded curated CSV metadata import for manual business metadata and identity gaps | Implemented |
| `POST /api/v1/market-data/metadata/enrich` | Backward-compatible provider business metadata repair alias | Implemented |
| `POST /api/v1/market-data/prices/backfill` | Bounded price backfill for provider-supported price gaps | Implemented |
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
  - Shows a scan-focused catalog table with Symbol, Company, Provider Symbol, Exchange, Asset Type, Segment/Class, F&O Eligible, Provider Support, Data Health, strict universe state, Last Updated, and Actions. Lower-frequency metadata such as sector, industry, market cap, source symbols, catalog source, provider errors, price bars, latest price date, expected trading date, volume presence, and readiness blockers is available in a row detail drawer.
  - Provides preset chips for common catalog workflows such as Stocks, F&O Eligible, Needs Validation, Unsupported, Indices, and ETFs. The main filter bar stays intentionally compact with search, exchange, asset type, segment/class, currency, and F&O eligibility; diagnostic filters remain backend-supported and can be applied by presets.
  - Provides a bounded Catalog Import panel for NSE equity securities, F&O underlyings, index seed rows, ETF rows, and fallback broker/public scrip-master CSVs. Index seed import does not require CSV text.
  - Catalog import and metadata backfill run client-orchestrated bounded batches until `hasMore=false`, disable competing actions while running, and show determinate progress from backend `processedCount`/`totalCount`.
  - The filter bar uses a wrapping responsive layout so Refresh and Reset stay inside the page container. Table horizontal scrolling is limited to the table area.
  - Changing any local filter resets to page 1. Reset clears only local filters and preserves the global market scope. Empty states name the active filters so no-result states such as `FUTURE / FUTURES` are explicit.
  - Status cards show scoped instrument health before local filters; the table match chip shows the locally filtered count.
  - Sync Catalog success/no-new-data alerts include daily candle freshness details from `/api/v1/market-data/scheduler/status`, so users can see whether the latest completed candle is already synced.
- `MarketDataStatusPanel`: Shows system health plus Universe Health: catalog vs review-ready counts, staged provider validation status, price coverage, metadata coverage, latest stored versus expected EOD date, stale/incomplete counts, top blockers, `trustStatus`, and a Universe Signoff panel. It also shows Trusted Review Universe as a separate user-facing subset with catalog count, provider-supported count, trusted count, `READY/LIMITED/NOT_READY`, `FULL_REVIEW/LIMITED_REVIEW/NO_REVIEW`, target session, required data-through date, stored data-through date, scan ordering, excluded counts, context-gap counts, and a clear note that missing metadata is a context gap rather than a hard blocker for price-action review. The signoff panel shows PASS/FAIL, downstream allowed yes/no, review-ready actual versus required, provider unknown remaining, retry-failed providers, supported identity gaps, supported business metadata gaps, supported price backfill needed, latest/expected EOD, blockers, and next action. When coverage is poor it explicitly states that catalog size is not the reviewable universe and Today Plan remains blocked until the foundation is trustworthy. The same panel exposes an Operational Repair Run section with dry-run/start/drain actions, latest run status, before/after review-ready, provider-supported, metadata coverage, price-ready, remaining blockers, exact next action, and non-success treatment while another run is needed, final trust is not `OK`, signoff is not `PASS`, or a run is partial/blocked/manual-required. It also exposes the repair workflow with provider unknown, retry-failed providers, unsupported excluded, supported catalog-identity gaps, supported price-backfill-needed, supported business-metadata gaps, business-metadata-auto-repairable, business-metadata-manual-required, business-metadata-retry-blocked, business-metadata-retry-eligible, recently-attempted/skipped, and manual-business-metadata-needed counts plus one-batch Validate unknown providers, Retry failed providers, Repair catalog identity, Enrich provider business metadata, Export Manual Metadata Template, Import manual metadata, Backfill prices, and Refresh health actions. Manual metadata import keeps a separate CSV offset, sends backend `nextOffset` on the next import batch, validates `marketCap`, and exposes restart-from-zero.
- `InstrumentSearchSelect`: Shared component for picking stocks. Defaults to the active region scope with an optional `global` override.

Frontend routes are defined in `routes.tsx` and exported via `index.ts`.

## Tests And Verification

- `backend/src/shared/utils/market-scope.test.ts`: Verifies regional mapping logic.
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`: Verifies service logic, provider validation repair, UNKNOWN-first versus retry-failed provider queue behavior, stable offset-zero mutating repair queues, successful OHLCV support marking, catalog identity repair from NSE catalog rows, stable source-list catalog pagination, no-op catalog repair accounting, provider business metadata repair with durable manual-required state, provider partial/full/error outcomes, manual metadata null-equivalent/invalid-market-cap rejection, manual metadata template export, null-preserving/no-op-safe provider metadata, supported-only repair-plan/signoff breakdown counts, operational repair-run dry-run/no-mutation behavior, dependency-order drain execution, retry-failed blocker handling after UNKNOWN drain, `PARTIAL`/`PARTIAL_BLOCKED`/`PARTIAL_MANUAL_REQUIRED` handling, persisted before/after snapshots, max-batch loop bounds, source-fingerprint resume/restart behavior, single-load catalog source snapshot reuse across run batches, catalog source-load failure before offset reuse, latest-run operator fields, strict review-ready/trust blockers, EOD-capped price backfill, and zero-row provider backfill failure handling.
- `backend/tests/modules/market-data-foundation/market-data.market-session.test.ts`: Verifies IN market-session skip/run decisions.
- `backend/tests/modules/market-data-foundation/market-data.scheduler.test.ts`: Verifies scheduler skip, incremental mode, and overlap protection.
- `backend/tests/modules/market-data-foundation/market-data.repository.test.ts`: Verifies smart daily-candle no-op/update persistence, UNKNOWN-first and retry-failed provider validation selectors, business metadata repair queue filtering, durable repair-state counts, explicit retry behavior, and stock-id catalog identity repair.
- `backend/tests/modules/market-data-foundation/market-data.repository.test.ts`: Verifies corporate-action natural-key deduplication before upsert, read-time dedupe for existing duplicate rows, and idempotent cleanup of older duplicate corporate actions.
- `backend/tests/modules/market-data-foundation/market-data.universe.test.ts`: Verifies universe-state classification, strict latest-EOD freshness, rolling-window/gap checks, market-calendar uncertainty blocking, review-ready gating, all-UNKNOWN provider trust failure, read-time provider support repair from stored price history, scoped health counts, Trusted Review Universe inclusion/exclusion, metadata context gaps, pre-market/post-close target-session data-through policy, and LIMITED/READY thresholds.
- `backend/tests/modules/market-data-foundation/market-data.provider.test.ts`: Verifies provider mapping, malformed row handling, corporate actions, and Indian metadata fallbacks.
- `frontend/tests/ui/market-data-foundation.spec.ts`: Verifies Universe Health, Trusted Review Universe, Universe Signoff FAIL/downstream-blocked display, repair-plan counts, operational repair-run dry-run/start/drain request payloads, before/after run evidence, non-green completed-but-untrusted latest-run states, partial-run warning treatment, exact next-action wording, separate provider/catalog/business/manual/price repair action payloads, manual template export, manual CSV validation including `marketCap`, manual CSV next-offset batching, progress/final batch counts, and poor-coverage trust language.

Verification commands:

- `npx prisma generate` after Prisma schema changes.
- `npm run build`
- `npm test -- market-data --runInBand`

## Assumptions

- All data integration remains free/open-source.
- Application-wide market context is controlled by the header selector.
