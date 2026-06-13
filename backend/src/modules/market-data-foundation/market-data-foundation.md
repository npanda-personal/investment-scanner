# Market Data Foundation

Market Data Foundation owns the application's baseline market data capabilities. It replaces the older Stock Management-centered organization and keeps instrument management, exchange-file price data, manual verified fundamentals, corporate actions, FX-rate reads, source-file evidence, workers, and queue glue in one detachable module boundary.

The module is implemented as a flat backend module and a dedicated frontend feature. It remains locally runnable and uses free/open-source tooling only.

## NSE/BSE-Only Data Foundation Direction

Current Product Owner direction is NSE/BSE-only for active market-data foundation work.

Approved active sources for this phase:

- NSE CM UDiFF Bhavcopy.
- BSE BhavCopy as ISIN/security-matched fill-only backup.
- NSE all-index EOD close files.
- NSE delivery data.
- NSE F&O UDiFF as enrichment.
- NSE/BSE official filings or manual verified fundamentals.

Yahoo/yfinance, Angel One, broker APIs, and Screener scraping are disabled for active runtime paths. The provider implementation files and package dependency have been removed from Market Data Foundation. Approved scheduler, startup, repair, provider-validation, backfill, manual daily pipeline, fundamentals, and corporate-action reads must not call external providers.

The first NSE/BSE-only foundation slice adds:

- `SourceFileImport`, the durable file-import ledger for exchange files.
- `InstrumentExchangeIdentity`, the explicit exchange identity mapping for NSE/BSE instruments.
- nullable `PriceTick.sourceFileImportId`, so exchange candles can point to the exact file import.
- provider cleanup dry-run and execute methods/routes.
- `LatestPrice` rebuild from approved NSE/BSE candle sources only.
- startup provider price backfill disabled even when legacy provider env flags are present.

The second slice adds the first source-file-backed import path:

- `POST /api/v1/market-data/exchange-files/nse-cm-udiff/import` imports a specific NSE CM UDiFF daily file.
- `POST /api/v1/market-data/exchange-files/bse-cm-backup/import` imports BSE CM rows as fill-only backup.
- `POST /api/v1/market-data/exchange-files/nse-index-eod/import` imports NSE index or sector-index daily rows from submitted CSV text or from the official NSE all-index close file for a supplied trading date.
- `POST /api/v1/market-data/exchange-files/nse-fo-udiff/import` imports NSE F&O enrichment evidence into existing derivatives-eligibility catalog fields.
- `POST /api/v1/market-data/exchange-files/nse-delivery/import` imports NSE delivery evidence into persisted per-instrument delivery snapshots.
- `POST /api/v1/market-data/exchange-files/nse-delivery/refresh` imports delivery evidence for the latest completed trading date, or an explicit completed date when supplied.
- `POST /api/v1/market-data/exchange-files/nse-delivery/backfill` runs bounded historical delivery recovery. Without an explicit date range it targets 90 completed NSE sessions, never less than the 30-session recovery target, and returns `offset`, `nextOffset`, and `hasMore` for incremental reruns.
- `POST /api/v1/market-data/exchange-files/historical-backfill` starts a persisted NSE/BSE-only historical candle backfill run by trading date.
- `POST /api/v1/market-data/exchange-files/historical-backfill/runs` starts a worker-backed historical run with configurable `workerCount` (default 3, max 5), retry bounds, BSE fill-only mode, and date/chunk job persistence.
- `GET /api/v1/market-data/exchange-files/historical-backfill/runs/:runId` reads run progress, counts, active workers, row totals, and per-date job evidence.
- `POST /api/v1/market-data/exchange-files/historical-backfill/runs/:runId/resume` resumes pending, failed, and stale date jobs without re-importing completed dates.
- `POST /api/v1/market-data/exchange-files/historical-backfill/runs/:runId/retry-failed` retries only failed, not-available, or stale date jobs.
- `POST /api/v1/market-data/exchange-files/historical-backfill/runs/:runId/cancel` stops starting new jobs and marks pending dates cancelled.
- `POST /api/v1/market-data/fundamentals/manual-verified-import` imports operator-verified fundamentals without scraping.
- `POST /api/v1/market-data/fundamentals/manual-verified-bulk-import` imports a manually verified CSV of quarterly and annual fundamentals for a scoped review universe and writes `SourceFileImport(source=MANUAL_VERIFIED, segment=FUNDAMENTALS)` evidence.
- Imported NSE CM candles are stored under canonical exchange symbols without `.NS` / `.BO` suffixes.
- Each imported candle receives `PriceTick.sourceFileImportId` provenance.
- `GET /api/v1/market-data/source-file-imports` defaults to latest imported evidence by `importedAt desc`; operators can request server-side sorting by `importedAt` or `tradingDate` before the latest-10 UI limit is applied.
- Duplicate completed source-file imports are skipped by `source`, `segment`, `tradingDate`, and `fileHash`.
- Scheduled IN/STOCK market-data sync now uses the same NSE CM UDiFF source-file import path when the repository supports the source-file ledger.
- Scheduled IN/INDEX market-data sync uses NSE `ind_close_all_DDMMYYYY.csv` all-index EOD files, maps official index names to existing index catalog rows, and stores broad index rows as `NSE_INDEX_EOD` and major sector index rows as `NIFTY_SECTOR_INDEX`.
- Scheduled downstream eligibility is derived from imported or duplicate-current official exchange-file symbols mapped back to active, non-delisted, supported instruments, not from a provider fetch loop.
- Full daily downstream catch-up can also request DB-only persisted eligibility for a `dataThroughDate`; the service returns active eligible instruments from matching `LatestPrice` rows first, then matching `PriceTick` rows, and never calls providers for this lookup.
- BSE backup rows are stored only when an explicit BSE `InstrumentExchangeIdentity` maps the row to a stock and no NSE primary candle exists for that stock/date.
- Index/sector-index rows map official index names to existing index catalog instruments and persist daily index candles without provider calls. Completed official all-index files are tracked with `SourceFileImport(source=NSE, segment=INDEX, tradingDate, fileHash)`.
- F&O enrichment uses the source-file ledger and the existing F&O-underlying catalog path. It marks stock/index underlyings as `derivativesEligible=true` and does not create fake futures instruments or call providers.
- Delivery enrichment uses `MarketDeliverySnapshot` with `SourceFileImport` provenance. Rows are matched by scoped exchange symbols only, store traded quantity, deliverable quantity, and delivery percent, and do not call provider or broker APIs.
- Delivery history recovery uses NSE `sec_bhavdata_full_DDMMYYYY.csv` files from the official archive. Completed delivery files are skipped through `SourceFileImport(source=NSE, segment=DELIVERY, tradingDate, fileHash)`, and persisted snapshots are duplicate-safe through `MarketDeliverySnapshot(stockId, exchange, tradingDate, source)`.
- Delivery backfill is date-first and bounded. It skips weekends and official NSE trading holidays, skips already completed delivery imports before download unless `force=true`, reports symbols covered, oldest/newest processed dates, row counts, source-import ids, duplicate skips, failed dates, and `notAvailable` dates, and does not trigger Market Pulse, Earnings, Stock Interest scoring, Smart Money scoring, frontend changes, or downstream pipeline work.
- Manual fundamentals store explicit validation evidence (`sourceNote`, `sourceUrl`, `validatedBy`, `validatedAt`) and use `MANUAL_VERIFIED` source only.
- Bulk manual fundamentals import is CSV-only. Required columns are `symbol`, `period_type`, `period_end_date`, `revenue`, `net_income`, `eps`, `source`, `validated_by`, and `validated_at`. CamelCase and space-separated variants are accepted for period, net-income, and validation columns. `source` must be `MANUAL_VERIFIED`.
- Optional bulk manual fundamentals columns are `pe_ratio`, `market_cap`, `currency`, `source_note`, and `source_url`.
- Bulk manual fundamentals import rejects invalid rows independently and continues importing valid rows. It does not create instruments, scrape providers, call Yahoo/yfinance, call Screener, infer missing values, or modify Earnings, Market Pulse, Stock Interest, frontend, or downstream scoring workflows.
- Bulk manual fundamentals import returns `rowsImported`, `symbolsCovered`, `quarterlyCoverage`, `annualCoverage`, `sampleRecords`, `rejectedRows`, and `sourceFileImport` evidence. Coverage counts are based on persisted valid rows in the submitted file.
- `backend/scripts/export-nse-xbrl-fundamentals-csv.ts` is the first bounded NSE official-filings exporter. It fetches NSE Integrated Filing - Financials metadata as the current discovery source and keeps legacy Corporate Filings financial-result metadata as a historical fallback for explicit symbol lists, including the legacy insurance tab. It downloads linked NSE XBRL files, extracts the standard revenue/net-income/EPS XBRL facts plus approved banking aliases (`Income`, `TurnoverOrTotalIncome`, `InterestEarned`, `ProfitLossForThePeriod`, `ProfitLossFromOrdinaryActivitiesAfterTax`, `NetProfitAfterTax`, `BasicEarningsPerShareAfterExtraordinaryItems`, `BasicEarningsPerShareBeforeExtraordinaryItems`, `EarningPerShare`) and approved insurance/AMC aliases (`TotalIncome`, `NetPremiumIncome`, `PremiumEarnedNet`, `ProfitAfterTax`, `BasicEPSAfterExtraordinaryItems`, `BasicEPSBeforeExtraordinaryItems`, `TotalRevenueFromOperations`, `FeesAndCommissionIncome`, `TotalProfitLossForPeriod`, `BasicEPS`, `BasicEPSContinuingOperations`), prefers consolidated filings for the same symbol/period, and writes a review CSV compatible with `POST /api/v1/market-data/fundamentals/manual-verified-bulk-import`.
- The NSE XBRL exporter does not import directly into `Fundamental`, does not create instruments, does not scrape providers, and enforces a default maximum of 50 requested symbols. Rows with missing XBRL facts keep the field blank and emit warnings in the JSON export report for manual review before import.
- Historical candle backfill is date-first, not stock-first. It persists one `PipelineRun` for the requested range and one `PipelineStageRun` per date job, skips dates with completed source-file imports for the requested segment, leases each date to one worker at a time, pauses at the AGENTS.md memory stop threshold, retries failed/not-available/stale jobs only, and imports candles through official NSE EOD sources. `IN/STOCK` runs use date-appropriate CM sources: UDiFF CM bhavcopy when active, NSE security bhavdata for older dates, then legacy CM bhavcopy archive. `IN/INDEX` runs use official NSE all-index close files and defer `LatestPrice` rebuild until the run finalization step.
- Historical backfill status, worker lease, stale-job, and evidence reads treat transient Prisma/database recovery errors (`P1017`, recovery mode, closed connection, connection timeout) as temporary infrastructure outages: backend operations retry briefly, workers pause without crashing the process, and read APIs return `503 DATABASE_UNAVAILABLE` instead of misclassifying the run as missing.
- Historical backfill is laptop-safe at the database layer: the same active range reuses the existing `PipelineRun`, status polling does not recycle jobs while this process is actively working the run, date-job completion is guarded by the current lease owner, exchange candle bulk writes are serialized through one database writer, candle inserts/updates commit in bounded chunks, and final `LatestPrice` rebuild uses a set-based SQL upsert instead of per-symbol Prisma upsert loops.
- Historical backfill is bounded by `maxDates`, returns `nextStartDate` when more work remains, and reports attempted, skipped, failed, accepted, rejected, inserted, updated, and no-op counts. It does not write fundamentals, corporate actions, FX, provider metadata, portfolios, watchlists, alerts, or notes.
- BSE historical fill remains explicit per-date backup import work until a durable BSE file-discovery source is configured; BSE rows still require explicit exchange identity matching and cannot override existing NSE primary candles.

Provider-sourced cleanup is explicit operator work. Dry-run must be reviewed before execution. Cleanup must not delete `Stock`, portfolios, watchlists, alerts, notes, or other user-owned data.

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
- **Market movers read model**: `GET /api/v1/market-data/movers` returns stock gainers and losers for `1D`, `1W`, `1M`, `3M`, `6M`, and `1Y` from persisted `PriceTick` rows only. It is designed for Daily Overview page reads and does not fetch providers or start processing work during render. The latest candle is anchored to the latest scoped candle date available in the database, so weekend or holiday reads use the last stored trading date instead of today's calendar date, and stale individual instruments are excluded from current movers. Return calculations require the base and latest candle to use the same normalized price-source family so mixed Yahoo/NSE/Angel histories do not create false movers.
- **Market Map read model**: `GET /api/v1/market-data/market-map` returns a read-only stock-map envelope for Market Intelligence pages. It uses stored daily price movement evidence and stock catalog metadata already selected by the Market Data Foundation mover query, returns `materialized=false`, and does not start sync, repair, provider, generation, or refresh work. The first slice is sector-grouped and performance-only; personal overlays, trigger density, Smart Money overlays, official institutional flow, derivatives context, market-cap modes, and industry modes remain separate future read-model work.

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
  - Business workflows for instruments, exchange-file prices, coverage-aware NSE/BSE import, sync summaries, manual verified fundamentals, corporate actions, and persisted FX-rate reads.
  - Public batch lookup methods: `getInstrumentsByIds` and `getLatestPricesBySymbols`.
- `market-data-foundation.repository.ts`
  - Prisma access for `Stock`, `PriceTick`, `LatestPrice`, `Fundamental`, `CorporateAction`, and `FxRate`, plus price coverage checks and normalized fundamentals upserts.
  - Now a thin **composition facade**: `MarketDataFoundationRepository` keeps its exact public surface (class name, `constructor(prisma)`, and every public method signature) but delegates each call one-for-one to a per-concern sub-repository. External consumers are unaffected — keep importing `MarketDataFoundationRepository` from `index.ts`.
  - Per-concern sub-repositories (Prisma access only, same one-responsibility-per-file rule):
    - `market-data-foundation.repository.source-imports.ts` (`SourceImportsRepository`) — source-file import ledger.
    - `market-data-foundation.repository.catalog.ts` (`CatalogRepository`) — stock CRUD, catalog upsert/identity, company master data, load timestamps.
    - `market-data-foundation.repository.catalog-queries.ts` (`CatalogQueriesRepository`) — listing/search, sync-task and exchange-identity queries.
    - `market-data-foundation.repository.price.ts` (`PriceRepository`) — historical write pipeline (serialized via a static write chain) and write helpers.
    - `market-data-foundation.repository.price-reads.ts` (`PriceReadsRepository`) — price reads, latest-price, delivery snapshots, canonical-symbol reassignment.
    - `market-data-foundation.repository.price-readiness.ts` (`PriceReadinessRepository`) — universe readiness stats and price-history projections.
    - `market-data-foundation.repository.corporate-actions.ts` (`CorporateActionsRepository`) — corporate-action upsert/dedupe and adjusted-close recompute.
    - `market-data-foundation.repository.fundamentals.ts` (`FundamentalsRepository`) — fundamentals upserts and ingestion queues.
    - `market-data-foundation.repository.fx.ts` (`FxRepository`) — FX-rate persistence and reads.
    - `market-data-foundation.repository.scans.ts` / `.scans-screener.ts` / `.scans-movers.ts` (`ScanQueryRepository`, `ScreenerRepository`, `MarketMoverRepository`) — persisted-read market scans.
    - `market-data-foundation.repository.repair-state.ts` / `.repair-queries.ts` (`RepairStateRepository`, `RepairQueriesRepository`) — repair-run/sync-state persistence and repair-candidate selectors.
    - `market-data-foundation.repository.provider-cleanup.ts` (`ProviderCleanupRepository`) — provider-data cleanup and latest-price rebuild.
  - Shared, instance-free building blocks used across sub-repositories:
    - `market-data-foundation.repository.query-scope.ts` — pure scope/where/sort builders (`scopedStockSqlWhere`, `stockWhere`, `assetTypeWhere`, etc.).
    - `market-data-foundation.repository.helpers.ts` — pure numeric/date/compare/assign leaf helpers (`normalizeUtcDay`, `toNumber`, `sameDecimal`, `assignIfChanged`, etc.).
    - `market-data-foundation.repository.constants.ts` — shared provider/exchange source lists and market-mover thresholds.
- `market-data-foundation.validation.ts`
  - Required-field validation, instrument validation, OHLCV validation, duplicate-bar checks, malformed row partitioning, and abnormal spike checks.
- `market-data-foundation.types.ts`
  - Module-owned DTOs, exchange-file import result types, sync request/response types, FX types, status enum, and validation result types.
- Provider implementation files have been removed for the NSE/BSE-only reset. Legacy provider routes return explicit disabled responses until compatibility routes are fully retired.
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

Trusted Review Universe does not require Yahoo or legacy provider validation. For the approved `IN / STOCK` NSE/BSE architecture, active exchange instruments can enter review when local evidence proves exchange identity plus current usable prices from `SourceFileImport`-backed `PriceTick` rows and `LatestPrice` snapshots. Legacy `providerSupportStatus` remains an operations/signoff diagnostic for full-catalog repair, but `UNKNOWN` provider status is not a hard blocker when NSE/BSE evidence is present.

`GET /api/v1/market-data/review-readiness-summary?region=IN&assetType=STOCK` is the canonical Today Review readiness contract. It composes strict universe health, Trusted Review Universe health, and the bounded repair plan into one additive DTO with `reviewMode`, `trustStatus`, `userDecision`, trusted/catalog/provider-supported counts, required/stored data-through dates, readiness counts, blocker categories, warnings, and one top `nextAction`. The `nextAction` includes a bounded request with `batchSize=50`, `region`, and `assetType` when a repair action is available; it never starts provider or full-universe work by itself.

`GET /api/v1/market-data/review-universe/instruments?region=IN&assetType=STOCK&limit=100` returns trusted instruments and recent OHLCV history for Lite setup/evidence evaluation.

Trusted inclusion rules for `IN / STOCK`:

- active and not delisted
- exchange identity is supported by NSE/BSE stock metadata and local exchange-file price evidence, or the legacy provider support status is `SUPPORTED`
- latest EOD is current for the review as-of date
- at least 120 OHLCV bars
- recent volume exists
- adjusted close exists or close fallback is flagged as a warning
- no unresolved critical corporate-action price blocker

Missing sector, industry, market cap, ISIN, or listing date is a context gap, not a hard blocker for this subset. A 15-year/listing-date history target remains a strict signoff diagnostic, while the Lite review subset admits instruments with 120+ usable OHLCV bars. These gaps remain visible in `contextGapCounts` and confidence/scoring context, while strict Full Catalog Health continues to block full-catalog signoff.

Trusted instrument lists are ordered by trading usefulness for review scans: recent volume descending, price-history completeness, latest price freshness, then symbol. Today Review should record whether it scanned the full trusted set or a configured capped subset.

### Universe Repair Workflow

Universe health does not mutate data. The repair workflow is intentionally separate and bounded so provider-facing work is explicit:

- `GET /api/v1/market-data/universe/repair-plan?region=IN&assetType=STOCK`
  - Returns staged provider queue counts (`providerUnknownValidationNeeded`, `providerRetryValidationNeeded`, `providerUnsupportedExcluded`, `providerValidationFailed`), compatibility provider counts (`providerValidationNeeded`, `retryFailedValidations`), supported-only downstream blocker counts (`supportedCatalogIdentityRepairNeeded`, `supportedBusinessMetadataRepairNeeded`, `supportedPriceBackfillNeeded`, `unsupportedExcluded`), catalog-identity-repair-needed, price-backfill-needed, business-metadata-repair-needed, business-metadata-auto-repairable, business-metadata-manual-required, business-metadata-retry-blocked, business-metadata-retry-eligible, business-metadata-recently-attempted/current-state, manual-metadata-required, manual-business-metadata-required, missing-ISIN, missing-listing-date, missing-sector, missing-industry, missing-market-cap, legacy manual-sector-industry-required counts, and `universeSignoff` for the scope. `providerValidationNeeded` maps to unknown validation only, while `retryFailedValidations` maps to retry validation. `manualBusinessMetadataRequired` is the primary manual import count; `manualSectorIndustryRequired` is a narrower compatibility/detail count.
- `GET /api/v1/market-data/universe/repair-runs/latest?region=IN&assetType=STOCK`
  - Returns the latest persisted operational repair run for the scope, including status, before/after snapshots, summary, warnings, `anotherRunNeeded`, `expectedNextAction`, `hardBlockersRemaining`, final trust status, `universeSignoff`, stable-source fingerprints, and error.
- `POST /api/v1/market-data/universe/repair-run`
  - Orchestrates bounded repair batches in dependency order: unknown provider validation, retry-failed provider validation only after unknowns are drained, catalog identity repair, provider business metadata repair, optional manual metadata import when CSV text is supplied/requested, and price backfill. Request fields include `region`, `assetType`, `batchSize`, `maxBatchesPerAction`, `mode`, `actions`, `dryRun`, `csvText`, `catalogSource`, `importMode`, `providerValidationQueue`, `policy`, `force`, and `fullReload`. `policy=INCREMENTAL_LATEST_ONLY` restricts price work to stale latest-completed EOD gaps; historical/deep repair remains explicit through `AUTO_DEEP_FOR_SHALLOW`, `FORCE_DEEP`, or `fullReload`. `mode=DRAIN_UNTIL_BLOCKED` keeps executing dependency-ordered bounded batches until requested queues drain, a queue stops decreasing, a stable source fails, max-batch bounds are reached, or only manual metadata remains. It must not stop on retry-failed provider rows while fresh unknown provider rows remain; retry no-progress stops with the explicit diagnosis warning. Dry-run mode does not mutate or persist; it returns estimated totals, planned batches, top blockers, and the expected next action. Mutation mode persists a `MarketDataRepairRun`, records before/after health and repair-plan snapshots, stops safely as `PARTIAL`, `PARTIAL_BLOCKED`, or `PARTIAL_MANUAL_REQUIRED` when appropriate, and returns per-action summaries, aggregate counts, remaining hard blockers, final trust status, `universeSignoff`, and whether another bounded run or manual import is needed. `COMPLETED` is reserved for a requested repair scope that has no unfinished requested batches.
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

### Sector Metadata Recovery

`backend/scripts/recover-sector-metadata.js` is a local operator recovery script for active `IN / STOCK` rows whose `sector` is missing or null-equivalent. It reads official NSE `quote-equity` metadata per bounded batch, maps `industryInfo.sector` to `Stock.sector`, maps `industryInfo.industry` to `Stock.industry` when missing, and records repair provenance with source `NSE_OFFICIAL_QUOTE_EQUITY`. The script defaults to dry-run and requires `--execute` before it mutates stock metadata or repair-state rows.

This recovery path is not a trader-page side effect, not a route, and not a paid/provider fallback. It is intended for operator-run metadata repair when NSE/BSE catalog files have imported identity data but do not contain sector classification.

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

Current stored `Stock.symbol` is the canonical application key. For Indian NSE rows it should be the exchange/base symbol without the Yahoo `.NS` provider suffix, for example `ABB`. Provider-specific suffixes stay in provider fields and request payloads, not in the canonical symbol. New fields clarify the different symbol roles:

- `symbol`: application/storage key. NSE rows use the base symbol; price ticks remain keyed by this canonical value.
- `sourceSymbol`: exchange/security-master base symbol, for example `ABB`.
- `providerSymbol`: Yahoo-compatible symbol used for provider fetches, for example `ABB.NS` or `ABC.BO`.
- `displaySymbol`: user-facing short symbol, normally the same base symbol for NSE/BSE equities.

Normalization helpers follow these rules:

- NSE base `ABB` becomes `sourceSymbol=ABB`, `providerSymbol=ABB.NS`.
- Legacy stored `ABB.NS` is normalized to canonical `symbol=ABB`, `sourceSymbol=ABB`, `providerSymbol=ABB.NS`.
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
| `GET /api/v1/market-data/review-readiness-summary` | Canonical scoped review-readiness summary and bounded next action for Today Review/Data Quality displays | Implemented |
| `GET /api/v1/market-data/market-map` | Read-only sector-grouped stock map from stored daily price movement evidence | Implemented |
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

The scheduler is designed for daily candles, not live trading. It wakes once per day by default and performs startup catch-up when the server comes online, so a laptop that was switched off overnight can still detect missing latest-completed EOD data without waiting for a 15-minute polling loop. Manual full-pipeline execution is available from Pipeline Ops.

Environment defaults:

| Variable | Default | Purpose |
| --- | --- | --- |
| `MARKET_DATA_SCHEDULER_ENABLED` | `false` | Enables background scheduled ingestion. |
| `MARKET_DATA_SCHEDULER_INTERVAL_MINUTES` | `1440` | Daily scheduler wake-up interval. Values below `1440` are clamped to daily so stale local env values cannot re-enable 15-minute polling. Startup catch-up covers laptop/server downtime. |
| `MARKET_DATA_SCHEDULER_REGIONS` | `IN` | Explicit comma-separated regions. `GLOBAL` is not expanded automatically. |
| `MARKET_DATA_SCHEDULER_ASSET_TYPE` | `STOCK` | Current scheduled asset scope. |
| `MARKET_DATA_SCHEDULER_BATCH_SIZE` | `25` | Max instruments processed per scheduled run. |
| `MARKET_DATA_SCHEDULER_SYNC_DURING_MARKET_HOURS` | `false` | Default is post-close only for 1D strategy workflows. |
| `MARKET_DATA_SCHEDULER_POST_CLOSE_WINDOW_MINUTES` | `120` | Window after close where final candle capture is useful. |
| `MARKET_DATA_SCHEDULER_FINALIZATION_GRACE_MINUTES` | `15` | Grace period after close before final confirmation can be trusted. |
| `MARKET_DATA_SCHEDULER_SKIP_WEEKENDS` | `true` | Skips non-trading weekends by default. |
| `MARKET_DATA_NSE_OFFICIAL_EOD_BULK_ENABLED` | `true` in non-test, `false` in test | Enables one-file official NSE latest completed EOD bulk attempt for scheduled `IN/STOCK` sync before per-symbol provider fallback. |
| `MARKET_DATA_SCHEDULER_RUN_ON_STARTUP` | `true` | Runs a smart catch-up check when the server starts; it syncs only when latest-completed EOD data is missing or the session policy says a daily candle is useful. |
| `MARKET_DATA_STARTUP_PRICE_BACKFILL_ENABLED` | `false` | Startup price backfill is disabled by default because it can launch provider work during ordinary server validation. |
| `MARKET_DATA_ALLOW_STARTUP_PROVIDER_LOADS` | `false` | Required second opt-in before startup price backfill may call a provider. |
| `MARKET_DATA_STARTUP_PRICE_BACKFILL_MAX_BATCHES` | `5` | Bounds startup latest-only price backfill when both startup backfill and startup provider loads are explicitly enabled. |
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

Scheduled sync is incremental only. For `IN/STOCK`, latest completed daily candles are date-first: the service attempts official NSE EOD sources for the full stale latest-candle queue before it starts the bounded per-symbol provider fallback. Source order is NSE UDiFF CM bhavcopy zip, NSE security bhavdata CSV, then legacy CM bhavcopy zip. This keeps the normal daily update path tied to one exchange file instead of one historical-provider request per stock. Non-IN/STOCK scopes and unmatched instruments still use the bounded provider loop with a recent lookback rather than the 15-year manual backfill path.

For scheduled `IN/STOCK` runs, the service downloads and parses the first available official NSE EOD source once, then matches only tasks that are safely NSE-identified. Official matching is allowed when the task exchange is NSE-like or symbol identity explicitly proves `.NS`; it is skipped for BSE/non-NSE exchange values, any `.BO` symbol evidence, and ambiguous tasks without explicit NSE evidence. Eligible tasks are matched by canonical/provider/source/display symbol aliases and stored under canonical local symbols with existing idempotent `PriceTick` semantics. Unmatched, skipped, disabled, or unavailable official-path rows fall back to the existing per-symbol provider loop. The scheduled summary stores official-path evidence (`sourceName`, `sourceUrl`, `sourceFingerprint`, row counts, matched count, stored counts, fallback reason).

If the expected NSE EOD file for the latest completed date is not available yet, the daily import is classified as `NOT_AVAILABLE` instead of failed. The scheduled summary persists a warning, leaves file-source fingerprint evidence empty, sets the official fallback reason to `OFFICIAL_EOD_NOT_AVAILABLE`, and uses the latest stored `dataThroughDate` when available so DB-only downstream refreshes can continue from valid persisted candles.

The scheduler avoids overlapping runs with an in-process lock. Each region is evaluated independently, so `IN,US` will only run the region whose market window is useful at that moment.

For each scheduled region run, the internal summary now includes additive changed-set evidence for downstream scheduled Data Quality orchestration:

- `dataThroughDate`
- `sourceFingerprint`
- `changedInstrumentIds` (sorted, unique)
- `changedInstrumentCount`
- `dqStageEligible`

Scheduled Data Quality fanout is allowed when Market Data produces durable changed-instrument evidence. Normal scheduled latest-candle runs fan out when `dqStageEligible=true` with a non-empty changed set. Terminal price-backfill snapshots also carry their processed instrument ids into the Pipeline Orchestration ledger so startup/manual/background Market Data loads can hand off to scheduled Data Quality after the load finishes.

Price backfill visibility:

- startup price backfill remains owned by Market Data Foundation and continues to use the existing module-local run state;
- startup price backfill uses `INCREMENTAL_LATEST_ONLY` policy with a default maximum of five batches, so server startup does not launch a broad historical/deep repair run when latest EOD is already current;
- background/manual price-backfill runs carry their policy into every worker batch; the UI starts ordinary price maintenance as `INCREMENTAL_LATEST_ONLY`, `maxBatches=3`, and `workerConcurrency=1`;
- latest-only `IN/STOCK` backfill attempts the official NSE EOD bulk file once for the full current stale queue before falling back unmatched instruments from the bounded batch to per-symbol provider calls;
- historical/deep repair remains available through the module-owned repair/backfill path, but it is not allowed to block the 15-minute latest-candle scheduler;
- each price-backfill run mirrors its current progress into the Pipeline Orchestration ledger as stage `MARKET_DATA`;
- terminal price-backfill snapshots include the processed instrument ids so Pipeline Orchestration can start downstream Data Quality and the subsequent DB-only stages without another manual click;
- Pipeline Ops can therefore show active/terminal Market Data progress after navigation or refresh;
- this mirror does not make Pipeline Ops a Market Data command launcher and does not change provider/backfill execution behavior.

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

The cooldown and market-session no-new-data skips apply only when the latest completed daily candle is already stored. If `latestStoredTradingDate` is older than `latestCompletedTradingDate`, manual and scheduled EOD workflows allow a bounded provider catch-up even before open, during market hours with in-progress candles disabled, or on closed sessions. The catch-up `endDate` is capped to `latestCompletedTradingDate`, so EOD review workflows do not request the current in-progress daily candle.

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
- Scheduled and manual catalog sync select instruments whose own latest stored daily candle is missing or older than the latest completed trading date before using region-level no-new-data skips. This prevents a single current symbol from making stale instruments look current.
- Forced/full-reload catalog sync still processes the active supported catalog queue and prioritizes instruments with `null` or oldest `lastSuccessfulDataLoadTimestamp` before symbol order, so bounded runs do not repeatedly process only the first symbols alphabetically.

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

## Crypto plane — schema notes (deferred work)

- **Reserved tables (no writer yet):** `crypto_signal_outcomes`, `crypto_signal_calibration_results`,
  `crypto_quality_evaluations`, `crypto_interest_snapshots`. They are defined for future crypto
  outcome/calibration/data-quality/interest features. They are intentionally **not dropped**: the shared
  DB is drifted, so removal requires a dedicated, controlled migration window (never `prisma migrate dev`).
- **FK constraints deferred:** `crypto_price_ticks` / `crypto_latest_prices` reference `crypto_assets` by
  `symbol` string without a DB-level FK. Storage isolation is enforced in code (every crypto write hard-codes
  `region='GLOBAL', assetType='CRYPTO'` and only touches `crypto_*` tables). Adding `ON DELETE CASCADE` FKs is
  a future controlled-migration task.
- **Crypto market-context** is persisted under the dedicated `region='CRYPTO'` partition of
  `market_context_snapshots` (the table has no `assetType` column), keeping it isolated from equity GLOBAL/IN.
