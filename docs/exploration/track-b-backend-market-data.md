# Backend API Inventory — Market Data & Intelligence Modules

**Audit date:** 2026-06-16  
**Scope:** market-data-foundation, derivatives-intelligence, market-context-intelligence, smart-money-intelligence, earnings-intelligence, data-quality-engine  
**Auth model:** None of the six modules apply `requireAuth`. All endpoints are unauthenticated (public / localhost-first design). Rate limiting exists only on auth-identity login/signup endpoints.  
**Base prefix:** All `/api/v1/...` endpoints are mounted at `/api/v1` via `routes.ts`. The legacy foundation router is mounted at `/api/market-data-foundation`.

---

## 1. market-data-foundation

**Router file:** `market-data-foundation.router.ts`  
**Controllers:** `MarketDataFoundationController` (main), `MarketDataFoundationCryptoBoardController` (crypto board), `MarketDataFoundationConvictionController` (conviction tab)  
**V1 prefix:** `/api/v1` (via `marketDataV1Router`)  
**Legacy prefix:** `/api/market-data-foundation` (via `marketDataFoundationRouter` — covers `/stocks` and `/data` sub-routers)

### 1a. Screener & Analytics (Active)

| Method | Path | Purpose | Key Query/Body Params | Response Shape | Data Origin |
|--------|------|---------|----------------------|----------------|-------------|
| GET | `/api/v1/market-data/screener` | Multi-factor screener with F&O readiness scoring | `region`, `assetType`, `signalDirection`, `minScore`, `minRsPercentile`, `sector`, `capBand`, `minDeliveryPct`, `min52wPositionPct`, `excludeFnoBan`, `onlyDerivativesEligible`, `limit` | Array of screener rows with `rsPercentile`, `fnoReadinessScore` (0–100), `fnoGrade` (A/B/C), `fnoComponents` breakdown | `stocks`, `signal_results`, `fno_ban_list`, `smart_money_context_snapshots`; **F&O readiness computed in-process** from persisted inputs |
| **GET** | **`/api/v1/market-data/screener/conviction`** | **NEW — High-conviction tab: signal+smart-money confluence across 1M/3M/6M** | `region`, `assetType`, `onlyFnoEligible` | `{ generatedAt, count, results: [{ instrumentId, symbol, companyName, signalDirection, signalScore, sm1m, sm3m, sm6m }], warnings }` | **`stocks` + `signal_results` + `smart_money_context_snapshots` (raw SQL, INNER JOIN across all 3 ranges); bar fixed at signalScore>=70 AND sm1M/3M/6M>70; top-20 cap** |
| GET | `/api/v1/market-data/movers` | Market movers (gainers/losers) by range | `region`, `assetType`, `range` (1D/1W/1M/3M/6M/1Y), `limit` | `{ scope, generatedAt, ranges: [{ range, gainers, losers, warnings }] }` | `market_scan_snapshots` (equity) or `crypto_market_scan_snapshots` (crypto) — persisted |
| GET | `/api/v1/market-data/market-map` | Market map tiles grouped by sector | `region`, `assetType`, `range`, `limit` | `{ status, scope, asOf, range, groups, tiles, warnings }` | `market_scan_snapshots` (key: `MARKET_MAP`) — persisted |
| GET | `/api/v1/market-data/scans/52w-high` | 52-week high proximity scan | `region`, `assetType`, `proximityPct`, `limit` | `{ scanType, scope, results, warnings }` | `market_scan_snapshots` (key: `52W_HIGH`) — persisted |
| GET | `/api/v1/market-data/scans/52w-low` | 52-week low proximity scan | `region`, `assetType`, `proximityPct`, `limit` | `{ scanType, scope, results, warnings }` | `market_scan_snapshots` (key: `52W_LOW`) — persisted |
| GET | `/api/v1/market-data/scans/delivery-spike` | Delivery volume spike scan | `region`, `assetType`, `lookbackBars`, `minSpikeRatio`, `limit` | `{ scanType, scope, results, warnings }` | `market_scan_snapshots` (key: `DELIVERY_SPIKE`) — persisted |
| GET | `/api/v1/market-data/scans/volume-spike` | Total volume spike scan | `region`, `assetType`, `lookbackBars`, `minSpikeRatio`, `limit` | `{ scanType, scope, results, warnings }` | `market_scan_snapshots` (key: `VOLUME_SPIKE`) — persisted |

**F&O Readiness Details (screener endpoint):**  
`fnoReadinessScore` is computed at read-time from persisted DB fields only (no live fetch). Weights: signal 50%, RS percentile 15%, derivatives positioning 15% (OI build-up label + PCR), delivery % 10%, 52w trend 10%. In-ban stocks penalized 50%. Grade: A (>=70), B (>=50), C (<50). When `onlyDerivativesEligible=true` the results are re-sorted by `fnoReadinessScore` desc (this is the Top-F&O view).

**Conviction Details:**  
ConvictionRepository executes raw SQL with three CTEs (`sm_1m`, `sm_3m`, `sm_6m`) using `DISTINCT ON` to pick the latest snapshot per instrument per range from `smart_money_context_snapshots`. INNER JOINs enforce "present in all three ranges". Bar constants live in `analytics/conviction-score.ts` (single source of truth). Returns at most 20 candidates.

### 1b. Crypto Board (NEW — persisted reads from `crypto_*` tables)

| Method | Path | Purpose | Key Query Params | Response Shape | Data Origin |
|--------|------|---------|-----------------|----------------|-------------|
| **GET** | **`/api/v1/market-data/crypto/board`** | **Daily crypto metric board (latest snapshotDate)** | `sortBy` (marketCap/rank/signalScore/pctChange1d/pctChange7d/volumeSpike/rsi14/distanceFromAthPct), `sortOrder`, `direction` (BULLISH/NEUTRAL/BEARISH), `minScore`, `minConfidence` (LOW/MEDIUM/HIGH), `volumeSpikeOnly`, `near52wHigh`, `goldenCrossOnly`, `limit` | `{ snapshot_date, count, rows: [{ instrument_id, symbol, name, price, market_cap, rank, signal_score, signal_direction, signal_confidence, volume_spike, pct_change_1d, pct_change_7d, pct_change_30d, distance_from_ath_pct, near_52w_high, near_52w_low, rsi14, macd, macd_signal, macd_hist, bb_percent_b, sma50, sma200, cross_state, rs_vs_btc_pct, tvl_usd, tvl_change_7d_pct, funding_rate_pct, open_interest_usd, calculation_version, data_status }] }` | **`crypto_daily_metric_snapshots` — denormalized table written by CRYPTO_DAILY_METRICS pipeline stage; pure persisted select** |
| **GET** | **`/api/v1/market-data/crypto/assets/:id/detail`** | **Single crypto asset joined detail (404 when absent)** | `:id` = instrumentId (crypto_assets.id) | `{ catalog: { instrument_id, symbol, display_symbol, name, rank, market_cap, circulating_supply, max_supply, ... }, metrics: <board_row>, fundamental: { tvl_usd, tvl_change_7d_pct, fees_24h_usd, ... }, futures: { funding_rate_pct, open_interest_usd }, signal: { score, direction, confidence, triggered_signals, explanation, ... } }` | **`crypto_assets` + `crypto_daily_metric_snapshots` + `crypto_fundamental_snapshots` + `crypto_futures_snapshots` + `crypto_signal_results`** |

### 1c. Health & Diagnostics

| Method | Path | Purpose | Key Params | Response | Data Origin |
|--------|------|---------|-----------|----------|-------------|
| GET | `/api/v1/market-data/health` | Market data module health check | `region`, `assetType` | `{ status, module, instrumentCount, latestDataTimestamp, ... }` | `stocks` / `crypto_assets` + latest price |
| GET | `/api/v1/market-data/universe/health` | Full universe health (readiness gates) | `region`, `assetType` | `{ scope, generatedAt, latestStoredEodDate, counts, coverage, topBlockers, trustStatus, universeSignoff }` | `stocks`, `stock_prices`, `fundamentals`, `instrument_eligibility` |
| GET | `/api/v1/market-data/stocks/missing-data-diagnostics` | Missing-data diagnostics with samples | `region`, `assetType`, `sampleLimit` | Diagnostic summary with per-gap samples | `stocks`, `stock_prices`, `fundamentals` |
| GET | `/api/v1/market-data/review-readiness-summary` | Universe readiness summary (fast persisted or slow recompute) | `region`, `assetType`, `recompute` | `{ scope, status, blockers, signoffState, ... }` | `market_data_review_readiness_snapshots` or live recompute |
| GET | `/api/v1/market-data/review-universe` | Trusted review universe health | `region`, `assetType` | `{ trustStatus, counts, ... }` | `stocks`, derived trust logic |
| GET | `/api/v1/market-data/review-universe/instruments` | Instruments in trusted review universe | `region`, `assetType`, `limit`, `offset` | `{ instruments: [...] }` | `stocks` filtered by trust predicates |
| GET | `/api/v1/market-data/scheduler/status` | EOD ingestion scheduler status | — | `{ regions: [...], nextRun, ... }` | In-process scheduler state |

### 1d. Instrument Catalog & Prices (Active)

| Method | Path | Purpose | Key Params | Response | Data Origin |
|--------|------|---------|-----------|----------|-------------|
| GET | `/api/v1/instruments` | List instruments (paginated, filtered) | `page`, `pageSize`, `region`, `assetType`, `exchange`, `sector`, `search`, `derivativesEligible`, ... | `{ data, total, page, pageSize }` | `stocks` |
| POST | `/api/v1/instruments` | Create instrument | body: `{ symbol, name, region, exchange, assetType, ... }` | Created instrument | `stocks` (insert) |
| GET | `/api/v1/instruments/:id` | Get single instrument | `:id`, `region`, `assetType` | Instrument record | `stocks` |
| GET | `/api/v1/prices/:instrumentId` | Price history for instrument | `:instrumentId`, `limit`, `startDate`, `endDate`, `region`, `assetType` | `{ instrument_id, symbol, adjustment_strategy, prices: [...] }` | `stock_prices` (equity) or `crypto_price_ticks` (crypto) |
| GET | `/api/v1/prices/:instrumentId/latest` | Latest price for instrument | `:instrumentId`, `region`, `assetType` | Latest price row | `stock_prices` / `crypto_price_ticks` |
| GET | `/api/v1/fundamentals/:instrumentId` | Fundamentals for instrument | `:instrumentId`, `region`, `assetType` | Fundamentals record | `fundamentals` |
| GET | `/api/v1/corporate-actions/:instrumentId` | Corporate actions list | `:instrumentId`, `region`, `assetType` | Array of corporate action records | `corporate_actions` |
| GET | `/api/v1/fx-rates` | List all FX rates | — | Array of FX rate pairs | `fx_rates` |
| GET | `/api/v1/fx-rates/:pair` | Get specific FX rate | `:pair` | FX rate record | `fx_rates` |

### 1e. Ingestion / Import (Admin/Pipeline Operations)

| Method | Path | Purpose | Key Body Params | Response | Data Origin / External |
|--------|------|---------|----------------|----------|------------------------|
| GET | `/api/v1/market-data/source-file-imports` | List source file import log entries | `region`, `source`, `segment`, `status`, `startDate`, `endDate`, `limit`, `sortBy`, `sortDirection` | Array of import log rows | `source_file_imports` |
| POST | `/api/v1/market-data/exchange-files/nse-cm-udiff/import` | Import NSE CM UDiFF daily file | `tradingDate` (req), `csvText`, `fileName`, `fileUrl`, `force` | `{ status, ... }` | **NSE exchange file** (external if `fileUrl` provided) -> `stock_prices` |
| POST | `/api/v1/market-data/exchange-files/bse-cm-backup/import` | Import BSE CM backup daily file | `tradingDate` (req), `csvText`, `fileName`, `fileUrl`, `force` | `{ status, ... }` | **BSE exchange file** (external if `fileUrl` provided) -> `stock_prices` |
| POST | `/api/v1/market-data/exchange-files/nse-index-eod/import` | Import NSE index EOD file | `tradingDate` (req), `csvText`, `fileUrl`, `force`, `segment` | `{ status, ... }` | **NSE official or bhavcopy index** -> `stock_prices` |
| POST | `/api/v1/market-data/exchange-files/nse-fo-udiff/import` | Import NSE F&O UDiFF daily file | `tradingDate` (req), `csvText`, `fileUrl`, `force` | `{ status, ... }` | **NSE F&O exchange file** -> derivatives tables |
| POST | `/api/v1/market-data/exchange-files/nse-delivery/import` | Import NSE delivery data file | `tradingDate` (req), `csvText`, `fileUrl`, `force` | `{ status, ... }` | **NSE delivery file** -> `stock_prices.delivery_percent` |
| POST | `/api/v1/market-data/exchange-files/nse-delivery/refresh` | Auto-refresh NSE delivery for latest date | `tradingDate`, `force` | `{ status, ... }` | **NSE** (live fetch) |
| POST | `/api/v1/market-data/exchange-files/nse-delivery/backfill` | Historical backfill NSE delivery | `startDate`, `endDate`, `sessions`, `batchSize`, `force`, ... | `{ status, ... }` | **NSE** (live fetch, multiple dates) |
| POST | `/api/v1/market-data/exchange-files/historical-backfill` | Trigger exchange historical backfill | `startDate`, `endDate` (req), `region`, `assetType`, `maxDates`, `workerCount`, `maxRetries`, `includeBseFill` | `{ runId, status }` 202 | **NSE/BSE exchange files** (live fetch) |
| POST | `/api/v1/market-data/exchange-files/historical-backfill/runs` | Start named backfill run | Same as above | 202 run record | **NSE/BSE exchange files** |
| GET | `/api/v1/market-data/exchange-files/historical-backfill/runs/:runId` | Get backfill run status | `:runId` | Run record with progress | `backfill_runs` |
| POST | `/api/v1/market-data/exchange-files/historical-backfill/runs/:runId/resume` | Resume paused backfill run | — | 202 | In-process |
| POST | `/api/v1/market-data/exchange-files/historical-backfill/runs/:runId/retry-failed` | Retry failed dates in a run | `maxRetries` | 202 | In-process |
| POST | `/api/v1/market-data/exchange-files/historical-backfill/runs/:runId/cancel` | Cancel a backfill run | — | Run record | In-process |
| POST | `/api/v1/market-data/exchange-files/nse-corporate-actions/import` | Import NSE corporate actions | `csvOrJsonText`, `rows`, `region`, `assetType`, `source`, `force` | `{ status, ... }` | **NSE corporate actions** -> `corporate_actions` |
| POST | `/api/v1/market-data/adjusted-close/recompute` | Recompute adjusted closes | `instrumentId`, `region`, `assetType`, `batchSize`, `offset` | Summary | `stock_prices` + `corporate_actions` (in-process compute) |
| POST | `/api/v1/market-data/fundamentals/nse-xbrl-bulk-ingest` | Bulk NSE XBRL fundamentals ingest | `region`, `assetType`, `symbolBatchSize`, `maxSymbols`, `maxQuarterlyPeriods`, `maxAnnualPeriods`, `delayBetweenBatchesMs` | Summary | **NSE XBRL / official results API** (live fetch) -> `fundamentals` |
| POST | `/api/v1/market-data/fundamentals/manual-verified-import` | Import single manual-verified fundamental | `stockId`, `region`, `assetType`, `periodType`, `periodEndDate`, `revenue`, `eps`, `netIncome`, `peRatio`, `marketCap`, `sourceNote`, `sourceUrl`, `validatedBy` | Created record 201 | `fundamentals` |
| POST | `/api/v1/market-data/fundamentals/manual-verified-bulk-import` | Bulk import manual-verified fundamentals CSV | `fileName`, `csvText`, `region`, `assetType`, `sourceUrl`, `evidenceDate` | Summary 201 | `fundamentals` |

### 1f. Repair & Catalog Admin

| Method | Path | Purpose | Key Params | Response | Data Origin |
|--------|------|---------|-----------|----------|-------------|
| GET | `/api/v1/market-data/universe/repair-plan` | List instruments needing repair | `region`, `assetType` | Repair plan with candidates and actions | `stocks`, `stock_prices`, `fundamentals` |
| GET | `/api/v1/market-data/universe/repair-workbench` | Repair workbench (full detail per instrument) | `region`, `assetType` | Workbench summary | Same as above |
| GET | `/api/v1/market-data/universe/repair-runs/latest` | Latest repair run status | `region`, `assetType` | Repair run record | `repair_runs` |
| POST | `/api/v1/market-data/universe/repair-run` | Execute repair run | `region`, `assetType`, `batchSize`, `maxBatchesPerAction`, `workerConcurrency`, `actions`, `dryRun`, `mode`, `force`, `csvText`, `catalogSource`, `importMode` | Repair run result | `stocks`, `stock_prices`, `fundamentals` (writes) |
| GET | `/api/v1/market-data/provider-cleanup/report` | Report of Yahoo/provider data to clean | — | Cleanup candidates list | `stocks` |
| POST | `/api/v1/market-data/provider-cleanup/execute` | Execute provider data cleanup | — | Cleanup result | `stocks` (writes) |
| POST | `/api/v1/market-data/catalog/identity/repair` | Repair catalog identity fields | `region`, `assetType`, `batchSize`, `offset`, `csvText`, `catalogSource`, `importMode` | Repair result | `stocks` (writes) |
| POST | `/api/v1/market-data/catalog/identity-repair` | Alias for catalog identity repair | Same | Same | Same |
| POST | `/api/v1/market-data/prices/identity-repair` | Repair price identity (date/symbol linkage) | `region`, `assetType`, `batchSize`, `offset`, `dryRun` | Repair result | `stock_prices` |
| GET | `/api/v1/market-data/metadata/manual-template` | Generate manual metadata CSV template | `region`, `assetType` | CSV template structure | `stocks` (read) |
| POST | `/api/v1/market-data/metadata/manual-import` | Import manual metadata CSV | `region`, `assetType`, `batchSize`, `offset`, `csvText` | Import result | `stocks` (writes) |
| GET | `/api/v1/market-data/catalog/sources` | List registered catalog sources | — | Array of catalog source configs | In-process registry |
| POST | `/api/v1/market-data/catalog/import` | Import catalog from a registered source | body per source schema | Import result | `stocks` + source-specific (NSE/BSE/US/EU catalog files) |
| POST | `/api/v1/market-data/catalog/backfill-metadata` | Backfill catalog metadata fields | body options | Result | `stocks` |
| POST | `/api/v1/ingestion/sync` | **DISABLED** | — | HTTP 410 | — |

### 1g. Legacy Stock API (under `/api/market-data-foundation/stocks`)

| Method | Path | Purpose | Notes |
|--------|------|---------|-------|
| GET | `/api/market-data-foundation/stocks` | List stocks (paginated) | Active; same service as `/api/v1/instruments` |
| GET | `/api/market-data-foundation/stocks/search` | Search assets by query `?q=...` | Active |
| GET | `/api/market-data-foundation/stocks/yahoo-search` | **HTTP 410 — Yahoo provider disabled** | Disabled |
| GET | `/api/market-data-foundation/stocks/:id` | Get single stock | Active |
| POST | `/api/market-data-foundation/stocks` | Create stock | Active |
| PATCH | `/api/market-data-foundation/stocks/:id` | Update stock | Active |
| DELETE | `/api/market-data-foundation/stocks/:id` | Delete stock | Active |
| POST | `/api/market-data-foundation/stocks/:id/toggle-active` | Toggle active status | Active |
| POST | `/api/market-data-foundation/stocks/:id/sync` | **HTTP 410 — provider sync disabled** | Disabled |
| POST | `/api/market-data-foundation/stocks/sync-runs` | **HTTP 410 — legacy provider sync** | Disabled |
| GET | `/api/market-data-foundation/stocks/sync-runs/:runId` | **HTTP 410** | Disabled |
| POST | `/api/market-data-foundation/stocks/sync-runs/:runId/cancel` | **HTTP 410** | Disabled |
| POST | `/api/market-data-foundation/stocks/sync-all` | **HTTP 410 — bulk sync disabled** | Disabled |

### 1h. Legacy Data API (under `/api/market-data-foundation/data`)

| Method | Path | Purpose | Notes |
|--------|------|---------|-------|
| GET | `/api/market-data-foundation/data/search` | **HTTP 410 — external provider search** | Disabled |
| POST | `/api/market-data-foundation/data/ingest` | **HTTP 410 — legacy provider ingestion** | Disabled |
| GET | `/api/market-data-foundation/data/prices/:symbol` | List prices by symbol (legacy) | Active — reads `stock_prices` |
| GET | `/api/market-data-foundation/data/fundamentals/:symbol` | **HTTP 410 — provider fundamentals** | Disabled |
| GET | `/api/market-data-foundation/data/corporate-actions/:symbol` | **HTTP 410 — provider corp actions** | Disabled |

### 1i. Provider-Disabled Endpoints (HTTP 410) in V1

All return `{ code: 'EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY', error, message, allowedWorkflows }`:

- `POST /api/v1/market-data/provider/validate`
- `POST /api/v1/market-data/metadata/provider-business/repair`
- `POST /api/v1/market-data/metadata/enrich`
- `POST /api/v1/market-data/prices/backfill`
- `POST /api/v1/market-data/prices/backfill-runs`
- `GET /api/v1/market-data/prices/backfill-active-run`
- `GET /api/v1/market-data/prices/backfill-runs/active`
- `GET /api/v1/market-data/prices/backfill-runs/:runId`
- `POST /api/v1/market-data/prices/backfill-runs/:runId/cancel`
- `POST /api/v1/fx-rates/sync`

### 1j. US SEC Services (Internal — Pipeline-Only, NOT exposed as HTTP endpoints)

The US SEC ingestion services live under `ingestion/us/` and are invoked by the pipeline-orchestration `POST /api/v1/pipeline/commands` dispatch — they are NOT directly routed as HTTP endpoints on the market-data-foundation router:

- `market-data-foundation.sec-13f.service.ts` — fetches `https://www.sec.gov/files/structureddata/data/form-13f-data-sets/{YYYYqQ}_form13f.zip`, aggregates institutional holdings by CUSIP, stores to raw-SQL table `us_institutional_holdings`
- `market-data-foundation.sec-companyfacts.service.ts` — fetches SEC EDGAR company facts JSON (`data.sec.gov/api/xbrl/companyfacts/CIK*.json`) -> `fundamentals`
- `market-data-foundation.sec-form4.service.ts` — fetches SEC Form 4 insider transaction filings
- `market-data-foundation.us-catalog-source.ts` — US stock catalog sourcing (not a standalone HTTP route)

---

## 2. derivatives-intelligence

**Router file:** `derivatives-intelligence.router.ts`  
**Prefix:** `/api/v1` (all routes prefixed `/derivatives/...`)  
**Auth:** Public (no `requireAuth`)  
**External source:** NSE F&O bhavcopy and participant OI CSV files (live fetch on ingest endpoints)

| Method | Path | Purpose | Key Params | Response Shape | Data Origin |
|--------|------|---------|-----------|----------------|-------------|
| GET | `/api/v1/derivatives/oi-buildup` | OI build-up per F&O stock (persisted) | `region` (defaults to IN), `assetType`, `eligibleOnly`, `limit` (max 500) | `{ rows: [{ symbol, oiChange, pctOiChange, buildupLabel, lastPrice, pctPriceChange }] }` or `notApplicable` for non-IN | `oi_buildup` table — persisted by bhavcopy ingest |
| GET | `/api/v1/derivatives/fo-bhavcopy/meta` | Latest persisted F&O bhavcopy date + row count | — | `{ tradingDate, rowCount }` | `fo_bhavcopy` table |
| POST | `/api/v1/derivatives/fo-bhavcopy/ingest` | Fetch NSE F&O bhavcopy, persist contracts, compute OI buildup + option metrics | `?date=YYYY-MM-DD` (optional) | `{ ingest: { status, tradingDate, rowsUpserted }, buildup, optionMetrics }` | **NSE F&O bhavcopy URL** (live fetch) -> `fo_bhavcopy`, `oi_buildup`, `option_metrics` |
| GET | `/api/v1/derivatives/option-metrics` | PCR, max-pain, support/resistance per underlying+expiry (persisted) | `region`, `assetType`, `underlying`, `limit` (max 2000) | `{ rows: [{ underlying, expiry, pcrOi, pcrVolume, maxPain, supportLevel, resistanceLevel }], marketPcr }` or `notApplicable` | `option_metrics` table — persisted |
| GET | `/api/v1/derivatives/pcr` | Market-wide put-call ratio | `region`, `assetType` | Same shape as option-metrics | `option_metrics` (full table read) |
| GET | `/api/v1/derivatives/participant-oi` | Participant-wise OI (FII/DII/Pro/Client net positioning) | `region`, `assetType` | `{ rows: [{ participant, futureIndexLong, futureIndexShort, ... }] }` or `notApplicable` | `participant_oi` table |
| POST | `/api/v1/derivatives/participant-oi/ingest` | Fetch NSE participant OI CSV, persist | `?date=YYYY-MM-DD` | `{ status, date, rowsUpserted }` | **NSE participant OI CSV** (live fetch) -> `participant_oi` |

**Region gating:** All derivatives endpoints default to `region=IN` and return `notApplicable` payload (not 4xx) for non-IN regions — they are India/NSE-only.

---

## 3. market-context-intelligence

**Router file:** `market-context-intelligence.router.ts`  
**Prefix:** `/api/v1`  
**Auth:** Public  
**Note:** `marketContextIntelligenceRouter` and `marketIntelligenceContextReadRouter` are both mounted at `/api/v1`; the second router duplicates three market-intelligence routes (market-pulse, market-pulse/history, sectors) for an alternate consumer path.

| Method | Path | Purpose | Key Params | Response Shape | Data Origin |
|--------|------|---------|-----------|----------------|-------------|
| GET | `/api/v1/market-context/summary` | Latest persisted market context summary | `region`, `assetType` | `{ status, scope, summary, asOf, materialized }` or `{ status: 'missing', ... }` | `market_context_snapshots` — persisted |
| GET | `/api/v1/market-context/persisted-summary` | Alias for persisted context summary | Same | Same | Same |
| GET | `/api/v1/market-context/persisted-breadth` | Latest persisted market breadth snapshot | `region`, `assetType` | Breadth snapshot record | `market_context_snapshots` |
| GET | `/api/v1/market-context/breadth-internals` | Breadth internals time series | `region` (defaults to GLOBAL), `days` (1–180, default 60) | Array of breadth snapshots oldest->newest | `market_context_snapshots` |
| GET | `/api/v1/market-context/capital-posture` | Capital posture composite | `region` (defaults to IN) | Capital posture DTO | `market_context_snapshots`, derived sector/FII data |
| GET | `/api/v1/market-intelligence/market-pulse` | Latest market pulse snapshot | `region` (defaults to IN), `assetType` (defaults to STOCK), `timeframe` (defaults to 1d) | Market pulse snapshot | `market_pulse_snapshots` |
| GET | `/api/v1/market-intelligence/market-pulse/history` | Market pulse history | `region`, `assetType`, `timeframe`, `limit` (max 100) | Array of market pulse snapshots | `market_pulse_snapshots` |
| GET | `/api/v1/market-intelligence/sectors` | Sector intelligence snapshots | `region`, `assetType` | Sector snapshot array | `sector_intelligence_snapshots` |
| GET | `/api/v1/market-context/regime` | Market regime (bull/bear/sideways) | `region`, `assetType` | Regime record | `market_context_snapshots.regime` |
| GET | `/api/v1/market-context/sectors` | Sector context snapshot | `region`, `assetType` | Sector breakdown | `market_context_snapshots.sectors` |
| GET | `/api/v1/market-context/breadth` | Breadth metrics | `region`, `assetType` | Breadth record | `market_context_snapshots.breadth` |
| GET | `/api/v1/market-context/countries` | Country-level context | `region`, `assetType` | Countries record | `market_context_snapshots.countries` |
| GET | `/api/v1/market-context/macro` | Macro context | — | Macro record | `market_context_snapshots.macro` |
| POST | `/api/v1/market-context/run` | Recompute and save market context (admin) | `region`, `assetType` | Newly computed snapshot | Live compute over `stocks`, `stock_prices`, `signal_results`; writes `market_context_snapshots` |
| GET | `/api/v1/market-context/fii-dii` | FII/DII institutional activity (persisted) | `region`, `assetType`, `days` (1–30, default 5) | `{ rows: [{ date, fiiNetEquity, diiNetEquity, ... }] }` or `notApplicable` | `fii_dii_activity` table |
| POST | `/api/v1/market-context/fii-dii/ingest` | Fetch FII/DII data from NSE, persist | — | `{ status, rowsUpserted }` | **NSE FII/DII CSV** (live fetch) -> `fii_dii_activity` |
| GET | `/api/v1/market-context/bulk-block-deals` | Bulk and block deals (persisted) | `region`, `assetType`, `days` (1–30, default 1) | `{ rows: [{ date, symbol, clientName, dealType, quantity, price }] }` or `notApplicable` | `bulk_block_deals` table |
| POST | `/api/v1/market-context/bulk-block-deals/ingest` | Fetch bulk/block deals from NSE, persist | — | `{ status, rowsUpserted }` + optional Telegram alert | **NSE bulk/block deals** (live fetch) -> `bulk_block_deals` |
| GET | `/api/v1/market-context/institutional-activity` | Aggregate institutional activity (FII/DII + bulk/block + F&O ban + SM sectors) | `region`, `assetType` | Composed DTO | `fii_dii_activity`, `bulk_block_deals`, `fno_ban_list`, `smart_money_context_snapshots` — all persisted reads |

**Region gating:** FII/DII, bulk-block deals, and institutional-activity endpoints return `notApplicable` payload for non-IN regions.  
**Crypto routing:** `contextRegion` maps crypto scope to the `CRYPTO` partition key in `market_context_snapshots`.

---

## 4. smart-money-intelligence

**Router file:** `smart-money-intelligence.router.ts`  
**Prefix:** `/api/v1`  
**Auth:** Public  
**Primary table:** `smart_money_context_snapshots` (columns: `instrumentId`, `symbol`, `range`, `snapshotDate`, `smartMoneyScore`, `status`, `sector`, ...)

| Method | Path | Purpose | Key Params | Response Shape | Data Origin |
|--------|------|---------|-----------|----------------|-------------|
| GET | `/api/v1/smart-money/health` | Smart-money engine health | — | `{ status, snapshotCount, latestSnapshotDate }` | `smart_money_context_snapshots` |
| POST | `/api/v1/smart-money/run` | Generate smart-money snapshots for a batch | `batchSize`, `region`, `assetType`, `offset` (body) | `{ processed, failed, total }` | Live compute over `stock_prices`, `signal_results`; writes `smart_money_context_snapshots` |
| GET | `/api/v1/smart-money/sectors` | Smart-money score by sector | `range` (1M/3M/6M), `region`, `assetType` | `{ sectors: [{ sector, averageScore, status, instrumentCount }] }` | `smart_money_context_snapshots` (aggregated) |
| GET | `/api/v1/smart-money/top` | Top accumulation candidates | `range`, `region`, `assetType`, `sector`, `limit`, `offset` | `{ results: [SmartMoneyStockSummary], total }` | `smart_money_context_snapshots` (status=ACCUMULATION, score>=threshold) |
| GET | `/api/v1/smart-money/distribution` | Top distribution candidates | `range`, `region`, `assetType`, `sector`, `limit`, `offset` | `{ results: [SmartMoneyStockSummary], total }` | `smart_money_context_snapshots` (status=DISTRIBUTION, score<=threshold) |
| GET | `/api/v1/smart-money/stocks/:instrumentId` | Smart-money profile for single stock | `:instrumentId`, `range` | Full `SmartMoneyStockSummary` or 404 | `smart_money_context_snapshots` latest per range |
| GET | `/api/v1/smart-money/fno-ban` | Current NSE F&O ban list | `region`, `assetType` | `{ symbols: [...], count, asOf }` or `notApplicable` | `fno_ban_list` table |
| POST | `/api/v1/smart-money/fno-ban/ingest` | Fetch F&O ban list from NSE, persist | — | `{ status, count, symbols }` | **NSE F&O ban list** (live fetch) -> `fno_ban_list` |

---

## 5. earnings-intelligence

**Router file:** `earnings-intelligence.router.ts`  
**Prefix:** `/api/v1`  
**Auth:** Public  
**Primary tables:** `earnings_intelligence_snapshots`, `fundamentals` (field `officialResultDate`)

| Method | Path | Purpose | Key Params | Response Shape | Data Origin |
|--------|------|---------|-----------|----------------|-------------|
| GET | `/api/v1/market-intelligence/earnings` | Latest persisted earnings intelligence snapshot | `region`, `assetType`, `snapshotDate`, `instrumentIds[]`, `includeUpcoming`, `includePast`, `daysAhead`, `daysBehind`, `minMarketCap`, `sortBy`, `limit`, `offset` | `{ scope, snapshotDate, total, results: [EarningsSnapshotRow] }` | `earnings_intelligence_snapshots` |
| POST | `/api/v1/market-intelligence/earnings/ingest-board-meetings` | Fetch earnings result dates from provider and populate `Fundamental.officialResultDate` | `region` (defaults to IN), `fromDate`, `toDate`, `dryRun`, `symbol` | Provider-native result summary | **NSE board-meetings calendar** (live fetch) -> `fundamentals.officialResultDate` |
| POST | `/api/v1/market-intelligence/earnings/refresh` | Materialize/re-materialize earnings intelligence snapshots | `region`, `assetType`, `snapshotDate`, `batchSize` (1–100, default 25), `offset`, `instrumentIds[]` | `{ processed, failed, snapshotDate }` | `fundamentals` (read) -> `earnings_intelligence_snapshots` (write) |

---

## 6. data-quality-engine

**Router file:** `data-quality-engine.router.ts`  
**Prefix:** `/api/v1`  
**Auth:** Public  
**Primary tables:** `data_quality_evaluations`, `instrument_eligibility`

| Method | Path | Purpose | Key Params | Response Shape | Data Origin |
|--------|------|---------|-----------|----------------|-------------|
| GET | `/api/v1/data-quality/summary` | DQE summary across universe | `region`, `assetType`, `minScore`, `status` | `{ scope, total, coverageBreakdown, signalReadinessCount, ... }` | `data_quality_evaluations`, `stocks`, `stock_prices`, `fundamentals` |
| GET | `/api/v1/data-quality/instruments` | List per-instrument DQ evaluations | `region`, `assetType`, `minScore`, `status`, `page`, `pageSize` | `{ data: [DataQualityEvaluationDto], total }` | `data_quality_evaluations` |
| GET | `/api/v1/data-quality/signal-readiness` | Instruments ready for signal generation | Same filter params | `{ instruments: [...], count }` | `data_quality_evaluations`, `instrument_eligibility` |
| GET | `/api/v1/data-quality/liquidity` | Liquidity evaluations | Same filter params | `{ instruments: [...] }` | `data_quality_evaluations` |
| GET | `/api/v1/data-quality/instruments/:instrumentId` | Full DQ diagnostics for one instrument | `:instrumentId` | `{ evaluation, staleness, useCaseTiers, recommendedFixes, eligibility }` or 404 | `data_quality_evaluations`, `instrument_eligibility`, `stock_prices`, `fundamentals` |
| POST | `/api/v1/data-quality/evaluate` | Trigger DQ evaluation for a batch | `region`, `assetType`, `instrumentIds[]`, `batchSize`, `offset`, `concurrency` | `{ evaluated, failed, skipped }` 202 | Live compute over `stocks`, `stock_prices`, `fundamentals`, `signal_results`; writes `data_quality_evaluations`, `instrument_eligibility` |

---

## Totals & Cross-Module Summary

| Module | Active Endpoints | Disabled (410) | External Sources Touched |
|--------|-----------------|----------------|--------------------------|
| market-data-foundation | ~60 | ~15 | NSE exchange files, BSE exchange files, NSE XBRL, NSE corporate actions, NSE delivery, SEC EDGAR (pipeline-only via pipeline-orchestration dispatch) |
| derivatives-intelligence | 7 | 0 | NSE F&O bhavcopy, NSE participant OI CSV |
| market-context-intelligence | 19 | 0 | NSE FII/DII CSV, NSE bulk/block deals |
| smart-money-intelligence | 8 | 0 | NSE F&O ban list |
| earnings-intelligence | 3 | 0 | NSE board-meetings calendar |
| data-quality-engine | 6 | 0 | None (reads from other modules' DB tables) |
| **TOTAL** | **~103** | **~15** | |

---

## New Surfaces Added Since Last Audit

### Conviction Screener (`GET /api/v1/market-data/screener/conviction`)
- **Own controller:** `MarketDataFoundationConvictionController` (split from god-controller per shrink-only rule)
- **Inputs joined:** `stocks` (isActive/isDelisted/providerSupportStatus filter), `signal_results` (latest per instrument, score>=70), `smart_money_context_snapshots` (latest per instrument for ranges 1M, 3M, 6M — ALL three must be present and score>70)
- **Algorithm:** Raw SQL with 3 CTEs (`sm_1m`, `sm_3m`, `sm_6m`) each using `DISTINCT ON ("instrumentId") ORDER BY snapshotDate DESC`; INNER JOIN enforces "present in all three ranges"; bar is product-fixed constants — `CONVICTION_MIN_SIGNAL_SCORE=70`, `CONVICTION_MIN_SMART_MONEY_SCORE=70` — not request params; post-SQL defensive filter via `passesConvictionBar()`; top-20 cap via `CONVICTION_RESULT_LIMIT`
- **Output:** `{ generatedAt, count, results: [instrumentId, symbol, companyName, signalDirection, signalScore, sm1m, sm3m, sm6m], warnings }`
- **Crypto:** Returns empty with warning ("equity-only screen")
- **Source files:** `market-data-foundation.conviction.controller.ts`, `analytics/market-data-foundation.serving.conviction-reads.ts`, `analytics/conviction-score.ts`, `persistence/market-data-foundation.repository.conviction.ts`

### F&O Readiness Analytics (augments `GET /api/v1/market-data/screener`)
- **Not a separate endpoint** — adds three extra fields to every screener row
- **Inputs (all persisted DB fields):** `signalScore` from `signal_results`, `rsPercentile` (computed in-process from percentile rank within returned set), `range52wPositionPct` and `deliveryPct` from scan snapshot payload, `buildupLabel` and `pcrOi` from `oi_buildup`/`option_metrics`, `inFnoBan` from `fno_ban_list`
- **Algorithm:** `computeFnoReadiness()` in `analytics/fno-readiness-score.ts`; weights: signal 50%, RS 15%, derivatives positioning 15% (OI build-up label mapped to 0-100; PCR extreme penalty -10), delivery 10%, trend 10%; ban penalty x0.5; clamped 0-100; grade A (>=70), B (>=50), C (<50)
- **Top-F&O view:** `onlyDerivativesEligible=true` -> results re-sorted by `fnoReadinessScore` desc, then sliced to `limit` (overrides the default signal-score order from the repository)
- **Source files:** `analytics/fno-readiness-score.ts`, `analytics/market-data-foundation.serving.fno-readiness-reads.ts`

### Crypto Board (`GET /api/v1/market-data/crypto/board`)
- **Own controller:** `MarketDataFoundationCryptoBoardController`
- **Inputs:** `crypto_daily_metric_snapshots` — denormalized table written by CRYPTO_DAILY_METRICS pipeline stage; contains price, signal score/direction/confidence, technical indicators (RSI-14, MACD, BB %B, SMA50/200, crossState/GOLDEN), on-chain TVL from DeFiLlama, perp futures data (funding rate, OI from Binance)
- **Filter whitelist:** signalDirection (exact enum), minScore (Prisma gte), minConfidence (ordinal floor mapped to `{ in: [...allowed] }` set), volumeSpikeOnly, near52wHigh, goldenCrossOnly; sortBy from 8-key whitelist (`BOARD_SORT_COLUMNS`)
- **Output keys (all snake_case):** `instrument_id, symbol, name, snapshot_date, data_through_date, price, market_cap, rank, signal_score, signal_direction, signal_confidence, volume_spike, pct_change_1d/7d/30d, distance_from_ath_pct, near_52w_high/low, rsi14, macd, macd_signal, macd_hist, bb_percent_b, sma50, sma200, cross_state, rs_vs_btc_pct, tvl_usd, tvl_change_7d_pct, funding_rate_pct, open_interest_usd, calculation_version, data_status`

### Crypto Asset Detail (`GET /api/v1/market-data/crypto/assets/:id/detail`)
- **Inputs:** `crypto_assets` (catalog) + latest from `crypto_daily_metric_snapshots`, `crypto_fundamental_snapshots`, `crypto_futures_snapshots`, `crypto_signal_results` — four parallel Prisma queries joined in-process
- **Output:** Nested `{ catalog, metrics, fundamental, futures, signal }` — all sub-objects null-safe when individual snapshots absent

---

## Disabled / Placeholder / Dead Endpoints

All provider-disabled endpoints return **HTTP 410** with body `{ code: 'EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY', error, message, allowedWorkflows }`.

Disabled surfaces (inferred from `providerDisabledResponse()` delegation in the controller):

- Yahoo Finance search (`GET .../yahoo-search`)
- Legacy provider stock sync (`POST /:id/sync`, `POST /sync-all`, `POST /sync-runs`)
- External provider data search and ingestion (`GET /data/search`, `POST /data/ingest`, `POST /ingestion/sync`)
- Legacy provider corporate actions + fundamentals fetches (`GET /data/fundamentals/:symbol`, `GET /data/corporate-actions/:symbol`)
- Provider validation (`POST /market-data/provider/validate`)
- Provider metadata enrichment (`POST /market-data/metadata/enrich`)
- Provider price backfill — all five endpoint variants
- Provider business metadata repair (`POST /market-data/metadata/provider-business/repair`)
- FX rate sync (`POST /fx-rates/sync`)
