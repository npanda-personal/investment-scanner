# Track B — Backend Market-Data API Inventory

**Date:** 2026-06-15
**Scope:** Six backend modules: `market-data-foundation`, `derivatives-intelligence`, `market-context-intelligence`, `smart-money-intelligence`, `earnings-intelligence`, `data-quality-engine`.
**Route prefix root:** All modules mount under `/api/v1` except `market-data-foundation`'s admin router which mounts under `/api/market-data-foundation`.

---

## Route Prefix Reference

| Router export | Mount path |
|---|---|
| `marketDataV1Router` | `/api/v1` |
| `marketDataFoundationRouter` | `/api/market-data-foundation` |
| `derivativesIntelligenceRouter` | `/api/v1` |
| `marketContextIntelligenceRouter` | `/api/v1` |
| `marketIntelligenceContextReadRouter` | `/api/v1` (duplicate registration of 3 routes — same handler) |
| `smartMoneyIntelligenceRouter` | `/api/v1` |
| `earningsIntelligenceRouter` | `/api/v1` |
| `dataQualityEngineRouter` | `/api/v1` |

---

## 1. market-data-foundation

### 1a. Admin / operator router — prefix `/api/market-data-foundation`

These routes are used in the admin panel for catalog and data management. No auth middleware observed in router; access control is at the network/UI level.

| # | Method | Full Path | Purpose | Key Request Fields | Key Response Fields | Auth | Data Origin |
|---|---|---|---|---|---|---|---|
| 1 | GET | `/api/market-data-foundation/stocks` | List instruments (paginated, filtered) | query: `page`, `pageSize`, `region`, `assetType`, `search`, `country`, `exchange`, `sector`, `industry`, `dataStatus`, `catalogSource`, `providerSupportStatus`, `derivativesEligible`, `sortBy`, `sortOrder` | `{ instruments[], pagination }` | none observed | DB: `stocks` (Prisma `Stock` model) |
| 2 | GET | `/api/market-data-foundation/stocks/search` | Full-text asset search | query: `q`, `region`, `assetType` | `SearchResult[]` | none observed | DB: `stocks` |
| 3 | GET | `/api/market-data-foundation/stocks/yahoo-search` | Yahoo Finance search | — | **DISABLED** (410 `EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY`) | none observed | Disabled |
| 4 | GET | `/api/market-data-foundation/stocks/:id` | Get single instrument by ID | path: `id` | Stock object | none observed | DB: `stocks` |
| 5 | POST | `/api/market-data-foundation/stocks` | Create instrument | body: `symbol`, `name`, `region`, `exchange` | Created stock object | none observed | DB: `stocks` (write) |
| 6 | PATCH | `/api/market-data-foundation/stocks/:id` | Update instrument metadata | path: `id`; body: update fields | Updated stock object | none observed | DB: `stocks` (write) |
| 7 | DELETE | `/api/market-data-foundation/stocks/:id` | Delete instrument | path: `id` | 204 No Content | none observed | DB: `stocks` (write) |
| 8 | POST | `/api/market-data-foundation/stocks/:id/toggle-active` | Toggle `isActive` on an instrument | path: `id` | Updated stock object | none observed | DB: `stocks` (write) |
| 9 | POST | `/api/market-data-foundation/stocks/:id/sync` | Provider-based sync for one instrument | — | **DISABLED** (410) | none observed | Disabled |
| 10 | POST | `/api/market-data-foundation/stocks/sync-runs` | Start legacy provider catalog sync run | — | **DISABLED** (410) | none observed | Disabled |
| 11 | GET | `/api/market-data-foundation/stocks/sync-runs/:runId` | Status of legacy sync run | path: `runId` | **DISABLED** (410) | none observed | Disabled |
| 12 | POST | `/api/market-data-foundation/stocks/sync-runs/:runId/cancel` | Cancel legacy sync run | path: `runId` | **DISABLED** (410) | none observed | Disabled |
| 13 | POST | `/api/market-data-foundation/stocks/sync-all` | Bulk provider sync | — | **DISABLED** (410) | none observed | Disabled |
| 14 | GET | `/api/market-data-foundation/data/search` | External provider search | — | **DISABLED** (410) | none observed | Disabled |
| 15 | POST | `/api/market-data-foundation/data/ingest` | Legacy provider ingestion | — | **DISABLED** (410) | none observed | Disabled |
| 16 | GET | `/api/market-data-foundation/data/prices/:symbol` | Price history by symbol (legacy path) | path: `symbol`; query: `limit` (default 100) | `{ symbol, prices[] }` | none observed | DB: `price_ticks` (raw SQL via repository) |
| 17 | GET | `/api/market-data-foundation/data/fundamentals/:symbol` | Fundamentals by symbol (legacy path) | — | **DISABLED** (410) | none observed | Disabled |
| 18 | GET | `/api/market-data-foundation/data/corporate-actions/:symbol` | Corporate actions by symbol (legacy path) | — | **DISABLED** (410) | none observed | Disabled |

### 1b. V1 API router — prefix `/api/v1`

#### System / health

| # | Method | Full Path | Purpose | Key Request Fields | Key Response Fields | Auth | Data Origin |
|---|---|---|---|---|---|---|---|
| 19 | GET | `/api/v1/market-data/health` | Module-level health check | query: `region`, `assetType` | `{ status, module, instrumentCount, latestDataTimestamp, data_status, … }` | none observed | DB: `stocks`, `price_ticks` (counts + max timestamp) |
| 20 | GET | `/api/v1/market-data/scheduler/status` | EOD scheduler status across all regions | — | `{ regions[], nextRun, … }` | none observed | In-process scheduler state |
| 21 | GET | `/api/v1/market-data/universe/health` | Universe health (coverage metrics) | query: `region`, `assetType` | `{ counts, coverage, trustStatus, trustReasons }` | none observed | DB: `stocks`, `price_ticks`, `fundamentals`, `market_data_sync_states` |
| 22 | GET | `/api/v1/market-data/stocks/missing-data-diagnostics` | Per-instrument missing-data report | query: `region`, `assetType`, `sampleLimit` | `{ instruments[], summary }` | none observed | DB: `stocks`, `price_ticks`, `fundamentals` |
| 23 | GET | `/api/v1/market-data/review-readiness-summary` | Trusted-universe readiness summary (operator view) | query: `region`, `assetType`, `recompute` (bool) | `{ ReviewReadinessSummary }` | none observed | DB: `stocks`, `price_ticks`, `fundamentals` (heavy if `recompute=true`, else snapshot cache) |
| 24 | GET | `/api/v1/market-data/review-universe` | Trusted review universe health | query: `region`, `assetType` | `{ TrustedReviewUniverseHealth }` | none observed | DB: `stocks`, `price_ticks`, `fundamentals` |
| 25 | GET | `/api/v1/market-data/review-universe/instruments` | Paginated trusted review universe instruments | query: `region`, `assetType`, `limit`, `offset` | `{ instruments[] }` | none observed | DB: `stocks`, `price_ticks` (in-process 60s snapshot cache) |

#### Market scans (persisted-reads)

| # | Method | Full Path | Purpose | Key Request Fields | Key Response Fields | Auth | Data Origin |
|---|---|---|---|---|---|---|---|
| 26 | GET | `/api/v1/market-data/scans/52w-high` | 52-week high scan | query: `region`, `assetType`, `proximityPct`, `limit` | `{ tradingDate, rows[{ symbol, price, high52w, proximityPct, … }] }` | none observed | DB: `market_scan_snapshots` (persisted via pipeline) |
| 27 | GET | `/api/v1/market-data/scans/52w-low` | 52-week low scan | query: `region`, `assetType`, `proximityPct`, `limit` | `{ tradingDate, rows[{ symbol, price, low52w, proximityPct, … }] }` | none observed | DB: `market_scan_snapshots` (persisted) |
| 28 | GET | `/api/v1/market-data/scans/delivery-spike` | Delivery-spike scan | query: `region`, `assetType`, `lookbackBars`, `minSpikeRatio`, `limit` | `{ tradingDate, rows[{ symbol, deliveryPct, avgDeliveryPct, spikeRatio, … }] }` | none observed | DB: `market_scan_snapshots` (persisted) |
| 29 | GET | `/api/v1/market-data/scans/volume-spike` | Volume-spike scan | query: `region`, `assetType`, `lookbackBars`, `minSpikeRatio`, `limit` | `{ tradingDate, rows[{ symbol, volume, avgVolume, spikeRatio, … }] }` | none observed | DB: `market_scan_snapshots` (persisted) |
| 30 | GET | `/api/v1/market-data/screener` | Multi-factor stock screener (persisted-read) | query: `region`, `assetType`, `signalDirection`, `minScore`, `minRsPercentile`, `sector`, `capBand`, `minDeliveryPct`, `min52wPositionPct`, `excludeFnoBan`, `onlyDerivativesEligible`, `limit` | `rows[{ instrumentId, symbol, companyName, price, signalDirection, signalScore, rsPercentile, sector, capBand, deliveryPct, range52wPositionPct, inFnoBan, buildupLabel, oiChangePct, pcrOi, scoreDeltaPrev, isNewEntry, factorFamilies }]` | none observed | DB: `stocks`, `signal_results`, `price_ticks`, `market_delivery_snapshots`, `fno_ban_list`, `fo_oi_buildup`, `fo_option_metrics` (raw SQL cross-join) |
| 31 | GET | `/api/v1/market-data/movers` | Market movers (top gainers/losers) | query: `region`, `assetType`, `limit`, `range` (1D/1W/1M/3M/6M/1Y) | `{ MarketMoversSummary }` | none observed | DB: `market_scan_snapshots` (persisted) |
| 32 | GET | `/api/v1/market-data/market-map` | Sector/industry market heat-map | query: `region`, `assetType`, `limit`, `range` | `{ MarketMapSummary }` | none observed | DB: `market_scan_snapshots` (persisted) |

#### Universe repair / workbench

| # | Method | Full Path | Purpose | Key Request Fields | Key Response Fields | Auth | Data Origin |
|---|---|---|---|---|---|---|---|
| 33 | GET | `/api/v1/market-data/universe/repair-plan` | Repair action plan for data gaps | query: `region`, `assetType` | `{ MarketDataRepairPlan }` | none observed | DB: `stocks`, `price_ticks`, `fundamentals` |
| 34 | GET | `/api/v1/market-data/universe/repair-workbench` | Repair workbench view (operator) | query: `region`, `assetType` | Workbench object | none observed | DB: multiple (computed in-process) |
| 35 | GET | `/api/v1/market-data/universe/repair-runs/latest` | Latest repair run summary | query: `region`, `assetType` | `{ MarketDataRepairRunRecord }` | none observed | DB: `market_data_repair_runs` |
| 36 | POST | `/api/v1/market-data/universe/repair-run` | Trigger a data repair run | body: `region`, `assetType`, `batchSize`, `maxBatchesPerAction`, `workerConcurrency`, `actions[]`, `dryRun`, `mode`, `force`, `fullReload`, `csvText`, `catalogSource`, `importMode` | `{ MarketDataRepairRunResponse }` | none observed | DB: reads/writes `stocks`, `price_ticks`, `fundamentals`; may fetch NSE XBRL (external) |

#### Provider / cleanup (operator)

| # | Method | Full Path | Purpose | Key Request Fields | Key Response Fields | Auth | Data Origin |
|---|---|---|---|---|---|---|---|
| 37 | GET | `/api/v1/market-data/provider-cleanup/report` | Report of stale/orphan provider data | — | Cleanup report object | none observed | DB: `stocks`, `price_ticks` (audit query) |
| 38 | POST | `/api/v1/market-data/provider-cleanup/execute` | Execute provider data cleanup | — | Cleanup result | none observed | DB: `stocks`, `price_ticks` (write) |
| 39 | GET | `/api/v1/market-data/provider/validate` | Provider validation | — | **DISABLED** (410) | none observed | Disabled |
| 40 | POST | `/api/v1/market-data/metadata/enrich` | Provider metadata enrichment | — | **DISABLED** (410) | none observed | Disabled |
| 41 | POST | `/api/v1/market-data/metadata/provider-business/repair` | Provider business metadata repair | — | **DISABLED** (410) | none observed | Disabled |

#### Source-file imports (exchange files, NSE/BSE)

| # | Method | Full Path | Purpose | Key Request Fields | Key Response Fields | Auth | Data Origin |
|---|---|---|---|---|---|---|---|
| 42 | GET | `/api/v1/market-data/source-file-imports` | List source-file import history | query: `region`, `source`, `segment`, `status`, `startDate`, `endDate`, `limit`, `sortBy`, `sortDirection` | `SourceFileImport[]` | none observed | DB: `source_file_imports` |
| 43 | POST | `/api/v1/market-data/exchange-files/nse-cm-udiff/import` | Import NSE CM UDiFF EOD file | body: `tradingDate` (required), `csvText`, `fileName`, `fileUrl`, `force` | Import result `{ status, rowsImported, … }` | none observed | External: NSE CM UDiFF archive URL (if `fileUrl` not supplied) → DB: `price_ticks`, `stocks` |
| 44 | POST | `/api/v1/market-data/exchange-files/bse-cm-backup/import` | Import BSE CM backup file | body: `tradingDate` (required), `csvText`, `fileName`, `fileUrl`, `force` | Import result | none observed | External: BSE CM backup archive (if not supplied) → DB: `price_ticks` |
| 45 | POST | `/api/v1/market-data/exchange-files/nse-index-eod/import` | Import NSE index EOD bhavcopy | body: `tradingDate` (required), `csvText`, `fileUrl`, `force`, `segment` | Import result | none observed | External: NSE index bhavcopy archive (auto-fetched when `csvText`/`fileUrl` absent) → DB: `price_ticks` |
| 46 | POST | `/api/v1/market-data/exchange-files/nse-fo-udiff/import` | Import NSE F&O UDiFF file | body: `tradingDate` (required), `csvText`, `fileName`, `fileUrl`, `force` | Import result | none observed | External: NSE F&O UDiFF archive → DB: `fo_bhavcopy_contracts` (and derivative tables) |
| 47 | POST | `/api/v1/market-data/exchange-files/nse-delivery/import` | Import NSE delivery data | body: `tradingDate` (required), `csvText`, `fileName`, `fileUrl`, `force` | Import result | none observed | External: NSE delivery file URL → DB: `market_delivery_snapshots` |
| 48 | POST | `/api/v1/market-data/exchange-files/nse-delivery/refresh` | Refresh NSE delivery data for a date | body: `tradingDate`, `force` | Import result | none observed | External: NSE → DB: `market_delivery_snapshots` |
| 49 | POST | `/api/v1/market-data/exchange-files/nse-delivery/backfill` | Historical delivery backfill | body: `region`, `assetType`, `startDate`, `endDate`, `sessions`, `batchSize`, `offset`, `force`, `downloadDelayMs`, `jitterMs` | Backfill result | none observed | External: NSE (multiple dates) → DB: `market_delivery_snapshots` |
| 50 | POST | `/api/v1/market-data/exchange-files/nse-corporate-actions/import` | Import NSE corporate actions | body: `csvOrJsonText`, `rows[]`, `region`, `assetType`, `source`, `force` | Import result | none observed | Caller-supplied CSV / JSON (or NSE source) → DB: `corporate_actions` |
| 51 | POST | `/api/v1/market-data/adjusted-close/recompute` | Recompute adjusted closes | body: `instrumentId` (single) OR `region`, `assetType`, `batchSize`, `offset` (batch) | Recompute result | none observed | DB: `price_ticks`, `corporate_actions` (write) |

#### Historical backfill (exchange files)

| # | Method | Full Path | Purpose | Key Request Fields | Key Response Fields | Auth | Data Origin |
|---|---|---|---|---|---|---|---|
| 52 | POST | `/api/v1/market-data/exchange-files/historical-backfill` | Start historical exchange backfill run (simple) | body: `startDate`, `endDate`, `region`, `assetType`, `maxDates`, `workerCount`, `maxRetries`, `includeBseFill` | 202: `{ runId, … }` | none observed | External: NSE/BSE archives → DB: `price_ticks`, `market_data_backfill_runs` |
| 53 | POST | `/api/v1/market-data/exchange-files/historical-backfill/runs` | Start backfill run (explicit) | body: `startDate`, `endDate`, `region`, `assetType`, `maxDates`, `workerCount`, `maxRetries`, `includeBseFill` | 202: run record | none observed | External: NSE/BSE → DB (same as above) |
| 54 | GET | `/api/v1/market-data/exchange-files/historical-backfill/runs/:runId` | Get backfill run status | path: `runId` | Run record | none observed | DB: `market_data_backfill_runs` |
| 55 | POST | `/api/v1/market-data/exchange-files/historical-backfill/runs/:runId/resume` | Resume paused/interrupted backfill run | path: `runId` | 202: run record | none observed | DB: `market_data_backfill_runs` (write) + External: NSE/BSE |
| 56 | POST | `/api/v1/market-data/exchange-files/historical-backfill/runs/:runId/retry-failed` | Retry failed dates in a backfill run | path: `runId`; body: `maxRetries` | 202: run record | none observed | DB + External: NSE/BSE |
| 57 | POST | `/api/v1/market-data/exchange-files/historical-backfill/runs/:runId/cancel` | Cancel a backfill run | path: `runId` | Run record | none observed | DB: `market_data_backfill_runs` (write) |

#### Price backfill (all disabled)

| # | Method | Full Path | Purpose | Auth | Data Origin |
|---|---|---|---|---|---|
| 58 | POST | `/api/v1/market-data/prices/backfill` | Provider price backfill | none | **DISABLED** (410) |
| 59 | POST | `/api/v1/market-data/prices/backfill-runs` | Start provider backfill run | none | **DISABLED** (410) |
| 60 | GET | `/api/v1/market-data/prices/backfill-active-run` | Active provider backfill run | none | **DISABLED** (410) |
| 61 | GET | `/api/v1/market-data/prices/backfill-runs/active` | Same as above (alias) | none | **DISABLED** (410) |
| 62 | GET | `/api/v1/market-data/prices/backfill-runs/:runId` | Provider backfill run status | none | **DISABLED** (410) |
| 63 | POST | `/api/v1/market-data/prices/backfill-runs/:runId/cancel` | Cancel provider backfill run | none | **DISABLED** (410) |

#### Metadata / fundamentals (manual import)

| # | Method | Full Path | Purpose | Key Request Fields | Key Response Fields | Auth | Data Origin |
|---|---|---|---|---|---|---|---|
| 64 | GET | `/api/v1/market-data/metadata/manual-template` | Download CSV template for manual metadata | query: `region`, `assetType` | CSV template object | none observed | In-process: computed from instrument list |
| 65 | POST | `/api/v1/market-data/metadata/manual-import` | Import manual metadata CSV | body: `region`, `assetType`, `csvText`, `batchSize`, `offset` | Import result | none observed | DB: `stocks` (write) |
| 66 | POST | `/api/v1/market-data/fundamentals/manual-verified-import` | Import single manually verified fundamental | body: `stockId`, `region`, `assetType`, `periodType`, `periodEndDate`, `revenue`, `eps`, `netIncome`, `peRatio`, `marketCap`, `currency`, `sourceNote`, `sourceUrl`, `validatedBy`, `validatedAt` | 201: created fundamental | none observed | DB: `fundamentals` (write) |
| 67 | POST | `/api/v1/market-data/fundamentals/manual-verified-bulk-import` | Import CSV of manually verified fundamentals | body: `fileName`, `csvText`, `region`, `assetType`, `sourceUrl`, `evidenceDate` | 201: import result | none observed | DB: `fundamentals` (write) |
| 68 | POST | `/api/v1/market-data/fundamentals/nse-xbrl-bulk-ingest` | Bulk ingest XBRL fundamentals from NSE | body: `region`, `assetType`, `symbolBatchSize`, `maxSymbols`, `maxQuarterlyPeriods`, `maxAnnualPeriods`, `delayBetweenBatchesMs` | Ingest result | none observed | External: NSE XBRL/financial-results API (bot-protected, requires cookie) → DB: `fundamentals` |

#### Catalog management

| # | Method | Full Path | Purpose | Key Request Fields | Key Response Fields | Auth | Data Origin |
|---|---|---|---|---|---|---|---|
| 69 | GET | `/api/v1/market-data/catalog/sources` | List available catalog sources | — | Catalog source list | none observed | In-process: static registry |
| 70 | POST | `/api/v1/market-data/catalog/import` | Import a catalog source | body: (catalog import request) | Import result | none observed | External: catalog source URL → DB: `stocks` (write) |
| 71 | POST | `/api/v1/market-data/catalog/backfill-metadata` | Backfill metadata for existing catalog entries | body: (options) | Backfill result | none observed | DB: `stocks` (read + write) |
| 72 | POST | `/api/v1/market-data/catalog/identity/repair` | Repair catalog identity (duplicate alias) | body: `region`, `assetType`, `batchSize`, `offset`, `csvText`, `catalogSource`, `importMode` | Repair result | none observed | DB: `stocks` (write) |
| 73 | POST | `/api/v1/market-data/catalog/identity-repair` | Same as above (alias path) | same | same | none | DB: `stocks` (write) |

#### Identity repair

| # | Method | Full Path | Purpose | Key Request Fields | Auth | Data Origin |
|---|---|---|---|---|---|---|
| 74 | POST | `/api/v1/market-data/prices/identity-repair` | Relink price rows to correct instruments | body: `region`, `assetType`, `batchSize`, `offset`, `dryRun` | none | DB: `price_ticks`, `stocks` (write) |

#### Instrument CRUD (V1 path)

| # | Method | Full Path | Purpose | Key Request Fields | Key Response Fields | Auth | Data Origin |
|---|---|---|---|---|---|---|---|
| 75 | GET | `/api/v1/instruments` | List instruments (paginated) | query: same as `/stocks` | `{ instruments[], pagination }` | none observed | DB: `stocks` |
| 76 | POST | `/api/v1/instruments` | Create instrument | body: instrument fields | 201: created instrument | none observed | DB: `stocks` (write) |
| 77 | GET | `/api/v1/instruments/:id` | Get instrument by ID | path: `id`; query: `region`, `assetType` | Instrument object | none observed | DB: `stocks` |
| 78 | GET | `/api/v1/prices/:instrumentId` | Price history for instrument | path: `instrumentId`; query: `limit`, `startDate`, `endDate`, `region`, `assetType` | `{ symbol, prices[] }` | none observed | DB: `price_ticks` |
| 79 | GET | `/api/v1/prices/:instrumentId/latest` | Latest price for instrument | path: `instrumentId`; query: `region`, `assetType` | Latest price object | none observed | DB: `price_ticks` |
| 80 | GET | `/api/v1/fundamentals/:instrumentId` | Stored fundamentals for instrument | path: `instrumentId`; query: `region`, `assetType` | Fundamentals object | none observed | DB: `fundamentals` |
| 81 | GET | `/api/v1/corporate-actions/:instrumentId` | Corporate actions for instrument | path: `instrumentId`; query: `region`, `assetType` | Corporate actions object | none observed | DB: `corporate_actions` |

#### FX rates

| # | Method | Full Path | Purpose | Key Request Fields | Key Response Fields | Auth | Data Origin |
|---|---|---|---|---|---|---|---|
| 82 | GET | `/api/v1/fx-rates` | List all stored FX rates | — | `{ source, rates[], ingestion_timestamp, last_updated_timestamp, data_status }` | none observed | DB: `fx_rates` |
| 83 | GET | `/api/v1/fx-rates/:pair` | Get single FX rate by pair | path: `pair` (e.g. `USD/INR`) | FX rate object | none observed | DB: `fx_rates` |
| 84 | POST | `/api/v1/fx-rates/sync` | Sync FX rates from external provider | — | **DISABLED** (410) | none | Disabled |

#### Legacy ingestion sync

| # | Method | Full Path | Purpose | Auth | Data Origin |
|---|---|---|---|---|---|
| 85 | POST | `/api/v1/ingestion/sync` | Legacy provider ingestion sync | none | **DISABLED** (410) |

#### Crypto board (persisted-reads)

| # | Method | Full Path | Purpose | Key Request Fields | Key Response Fields | Auth | Data Origin |
|---|---|---|---|---|---|---|---|
| 86 | GET | `/api/v1/market-data/crypto/board` | Latest crypto daily-metric board | query: `sortBy`, `sortOrder`, `direction`, `minScore`, `minConfidence`, `volumeSpikeOnly`, `near52wHigh`, `goldenCrossOnly`, `limit` | `{ snapshot_date, count, rows[] }` | none observed | DB: `crypto_daily_metrics` (pipeline-materialized snapshot) |
| 87 | GET | `/api/v1/market-data/crypto/assets/:id/detail` | Crypto asset detail (joined) | path: `id` | Detail object (404 if absent) | none observed | DB: `crypto_daily_metrics`, `crypto_assets` |

---

## 2. derivatives-intelligence

Prefix: `/api/v1`

| # | Method | Full Path | Purpose | Key Request Fields | Key Response Fields | Auth | Data Origin |
|---|---|---|---|---|---|---|---|
| 88 | GET | `/api/v1/derivatives/oi-buildup` | OI buildup by instrument (futures) | query: `region`, `assetType`, `limit` (1–500, default 50), `eligibleOnly` | `{ rows[{ underlying, buildupLabel, oiChangePct, … }] }` — returns `notApplicable` for non-IN regions | none observed | DB: `fo_oi_buildup` (pipeline-materialized from `fo_bhavcopy_contracts`) |
| 89 | GET | `/api/v1/derivatives/fo-bhavcopy/meta` | Latest F&O bhavcopy staleness badge | — | `{ tradingDate, rowCount, … }` | none observed | DB: `fo_bhavcopy_contracts` (max trading_date + count) |
| 90 | POST | `/api/v1/derivatives/fo-bhavcopy/ingest` | Ingest NSE F&O bhavcopy + recompute OI/option metrics | query: `date` (YYYY-MM-DD, optional — defaults to today) | `{ ingest: { status, tradingDate, rowsUpserted }, buildup, optionMetrics }` | none observed | External: **NSE archives** (`https://nsearchives.nseindia.com/content/fo/BhavCopy_NSE_FO_…csv.zip`) → DB: `fo_bhavcopy_contracts`, `fo_oi_buildup`, `fo_option_metrics` |
| 91 | GET | `/api/v1/derivatives/option-metrics` | Option metrics (PCR, max-pain, S/R) per underlying+expiry | query: `region`, `assetType`, `underlying`, `limit` (1–2000, default 200) | `{ rows[], marketPcr }` — `notApplicable` for non-IN | none observed | DB: `fo_option_metrics` (pipeline-computed) |
| 92 | GET | `/api/v1/derivatives/pcr` | Market-wide put-call ratio | query: `region`, `assetType` | Same shape as option-metrics (limit=500) | none observed | DB: `fo_option_metrics` |
| 93 | GET | `/api/v1/derivatives/participant-oi` | Participant-wise OI (FII/DII/Pro/Client) | query: `region`, `assetType` | `{ rows[{ category, longContracts, shortContracts, netContracts, … }] }` — `notApplicable` for non-IN | none observed | DB: `fo_participant_oi` (persisted) |
| 94 | POST | `/api/v1/derivatives/participant-oi/ingest` | Fetch & persist participant OI from NSE | query: `date` (optional) | `{ status, rowsUpserted, tradingDate }` | none observed | External: **NSE** (participant-wise OI CSV) → DB: `fo_participant_oi` |

---

## 3. market-context-intelligence

Prefix: `/api/v1`

| # | Method | Full Path | Purpose | Key Request Fields | Key Response Fields | Auth | Data Origin |
|---|---|---|---|---|---|---|---|
| 95 | GET | `/api/v1/market-context/summary` | Latest persisted market context summary | query: `region`, `assetType` | `{ status, scope, summary: { regime, breadth, sectors, … }, asOf }` | none observed | DB: `market_context_snapshots` (Prisma model) |
| 96 | GET | `/api/v1/market-context/persisted-summary` | Same as `/summary` (explicit persisted path) | query: `region`, `assetType` | Same as above | none observed | DB: `market_context_snapshots` |
| 97 | GET | `/api/v1/market-context/persisted-breadth` | Latest persisted breadth data | query: `region`, `assetType` | Breadth object | none observed | DB: `market_context_snapshots` |
| 98 | GET | `/api/v1/market-context/breadth-internals` | Breadth internals time series | query: `region`, `days` (1–180, default 60) | `{ series[{ date, advancers, decliners, … }] }` | none observed | DB: `market_context_snapshots` (time-series slice) |
| 99 | GET | `/api/v1/market-context/capital-posture` | Capital posture (advance/decline, breadth signals) | query: `region` | Capital posture DTO | none observed | DB: `market_context_snapshots`, `price_ticks` (computed in-process) |
| 100 | GET | `/api/v1/market-context/regime` | Market regime from snapshot | query: `region`, `assetType` | Regime object | none observed | DB: `market_context_snapshots` |
| 101 | GET | `/api/v1/market-context/sectors` | Sector summary from snapshot | query: `region`, `assetType` | Sectors array | none observed | DB: `market_context_snapshots` |
| 102 | GET | `/api/v1/market-context/breadth` | Breadth summary from snapshot | query: `region`, `assetType` | Breadth object | none observed | DB: `market_context_snapshots` |
| 103 | GET | `/api/v1/market-context/countries` | Countries breakdown from snapshot | query: `region`, `assetType` | Countries object | none observed | DB: `market_context_snapshots` |
| 104 | GET | `/api/v1/market-context/macro` | Macro overlay from snapshot | — | Macro object | none observed | DB: `market_context_snapshots` |
| 105 | POST | `/api/v1/market-context/run` | Recompute and persist a market context snapshot | query: `region` | Updated snapshot | none observed | DB: `stocks`, `price_ticks`, `market_context_snapshots` (heavy compute + write) |
| 106 | GET | `/api/v1/market-intelligence/market-pulse` | Latest market-pulse snapshot | query: `region`, `assetType`, `timeframe` | Market-pulse DTO | none observed | DB: `market_pulse_snapshots` (Prisma model) |
| 107 | GET | `/api/v1/market-intelligence/market-pulse/history` | Market-pulse snapshot history | query: `region`, `assetType`, `timeframe`, `limit` (max 100) | `{ snapshots[] }` | none observed | DB: `market_pulse_snapshots` |
| 108 | GET | `/api/v1/market-intelligence/sectors` | Latest sector intelligence snapshot | query: `region`, `assetType` | Sector intelligence DTO | none observed | DB: `market_context_snapshots` (sector slice) |
| 109 | GET | `/api/v1/market-context/fii-dii` | FII/DII net buy/sell activity | query: `region`, `assetType`, `days` (1–30, default 5) — India-only (notApplicable for non-IN) | `{ rows[{ tradingDate, category, buyValueCr, sellValueCr, netValueCr }] }` | none observed | DB: `fii_dii_snapshots` (raw-SQL table) |
| 110 | POST | `/api/v1/market-context/fii-dii/ingest` | Fetch & persist FII/DII data from NSE | — | `{ status, rowsUpserted, … }` | none observed | External: **NSE API** (`https://www.nseindia.com/api/fiidiiTradeReact`) → DB: `fii_dii_snapshots` |
| 111 | GET | `/api/v1/market-context/bulk-block-deals` | Bulk & block deals list | query: `region`, `assetType`, `days` (1–30, default 1) — India-only | `{ rows[{ tradeDate, dealType, symbol, clientName, buySell, qty, avgPrice }] }` | none observed | DB: `bulk_block_deals` (raw-SQL table) |
| 112 | POST | `/api/v1/market-context/bulk-block-deals/ingest` | Fetch & persist bulk/block deals from NSE | — | `{ status, rowsUpserted }` | none observed | External: **NSE API** (`https://www.nseindia.com/api/snapshot-capital-market-largedeal`) → DB: `bulk_block_deals` |
| 113 | GET | `/api/v1/market-context/institutional-activity` | Aggregate institutional activity (FII/DII + block deals + F&O ban + smart-money sectors) | query: `region`, `assetType` — India-only | Composite DTO | none observed | DB: `fii_dii_snapshots`, `bulk_block_deals`, `fno_ban_list`, `smart_money_context_snapshots` |

---

## 4. smart-money-intelligence

Prefix: `/api/v1`

| # | Method | Full Path | Purpose | Key Request Fields | Key Response Fields | Auth | Data Origin |
|---|---|---|---|---|---|---|---|
| 114 | GET | `/api/v1/smart-money/health` | Smart-money module health | — | `{ status, … }` | none observed | DB: `smart_money_context_snapshots` (Prisma model) |
| 115 | POST | `/api/v1/smart-money/run` | Recompute smart-money snapshots for a batch | body: `region`, `assetType`, `batchSize` (default 100), `offset` | Run result | none observed | DB: `stocks`, `price_ticks`, `fundamentals` → writes `smart_money_context_snapshots` |
| 116 | GET | `/api/v1/smart-money/sectors` | Sector-level smart-money aggregation | query: `region`, `assetType`, `range` | `{ sectors[{ sector, accumulation, distribution, … }] }` | none observed | DB: `smart_money_context_snapshots` (Prisma, aggregated by sector) |
| 117 | GET | `/api/v1/smart-money/top` | Top accumulation candidates | query: `region`, `assetType`, `sector`, `range`, `limit`, `offset` | `{ results[], total }` | none observed | DB: `smart_money_context_snapshots` (Prisma, filtered to ACCUMULATION status) |
| 118 | GET | `/api/v1/smart-money/distribution` | Top distribution candidates | query: `region`, `assetType`, `sector`, `range`, `limit`, `offset` | `{ results[], total }` | none observed | DB: `smart_money_context_snapshots` (Prisma, filtered to DISTRIBUTION or low score) |
| 119 | GET | `/api/v1/smart-money/stocks/:instrumentId` | Smart-money detail for single instrument | path: `instrumentId`; query: `range` | Smart-money stock summary (404 if absent) | none observed | DB: `smart_money_context_snapshots`, `stocks`, `price_ticks` |
| 120 | GET | `/api/v1/smart-money/fno-ban` | Current F&O ban list | query: `region`, `assetType` — India-only (notApplicable for non-IN) | `{ banDate, symbols[], count }` | none observed | DB: `fno_ban_list` (raw-SQL table) |
| 121 | POST | `/api/v1/smart-money/fno-ban/ingest` | Fetch & persist F&O ban list from NSE | — | `{ status, banDate, count }` | none observed | External: **NSE** (`https://nsearchives.nseindia.com/content/fo/fo_secban.csv`) → DB: `fno_ban_list` |

---

## 5. earnings-intelligence

Prefix: `/api/v1`

| # | Method | Full Path | Purpose | Key Request Fields | Key Response Fields | Auth | Data Origin |
|---|---|---|---|---|---|---|---|
| 122 | GET | `/api/v1/market-intelligence/earnings` | Latest earnings intelligence snapshot | query: `region` (default IN), `assetType`, `category` (ANNOUNCED/UPCOMING/MISSED/…), `limit` (1–100, default 25) | `{ rows[{ symbol, companyName, periodType, periodEndDate, resultDateSource, officialResultDate, … }], snapshot_date }` | none observed | DB: `earnings_intelligence_snapshots` or computed from `fundamentals` + `stocks` |
| 123 | POST | `/api/v1/market-intelligence/earnings/ingest-board-meetings` | Ingest earnings dates from NSE board-meetings (India) or SEC EDGAR (US) | body: `region`, `fromDate`, `toDate`, `dryRun`, `symbol` | `{ status, matched, skipped, error? }` | none observed | External (India): **NSE API** (bot-protected) / External (US): **SEC EDGAR** company-facts → DB: `fundamentals.officialResultDate` |
| 124 | POST | `/api/v1/market-intelligence/earnings/refresh` | Re-materialize earnings intelligence snapshots | body: `region`, `assetType`, `snapshotDate`, `batchSize`, `offset`, `instrumentIds[]` | `{ processed, skipped, errors, snapshotDate }` | none observed | DB: `fundamentals`, `stocks` → writes `earnings_intelligence_snapshots` |

---

## 6. data-quality-engine

Prefix: `/api/v1`

| # | Method | Full Path | Purpose | Key Request Fields | Key Response Fields | Auth | Data Origin |
|---|---|---|---|---|---|---|---|
| 125 | GET | `/api/v1/data-quality/summary` | DQE aggregate summary | query: `region`, `assetType`, `search`, `status` (GOOD/PARTIAL/POOR/UNUSABLE), `readinessStatus` (READY/LIMITED/NOT_READY), `liquidityStatus` (LIQUID/THIN/ILLIQUID/UNKNOWN), `sector`, `country`, `eligibleForSignals`, `eligibleForBacktesting`, `sortBy`, `sortOrder`, `minCoverageScore`, `minReadinessScore`, `limit`, `offset` | `{ DataQualitySummary: { totalInstruments, byStatus, avgScore, … } }` | none observed | DB: `instrument_eligibility` (Prisma model), joined with `stocks` |
| 126 | GET | `/api/v1/data-quality/instruments` | Paginated DQE evaluations list | same query params as summary | `{ results: DataQualityEvaluationDto[], total, … }` | none observed | DB: `instrument_eligibility`, `stocks` |
| 127 | GET | `/api/v1/data-quality/instruments/:instrumentId` | DQE diagnostics for single instrument | path: `instrumentId` | `{ DataQualityEvaluationDto + diagnostics }` (404 if absent) | none observed | DB: `instrument_eligibility`, `stocks`, `price_ticks`, `fundamentals` |
| 128 | GET | `/api/v1/data-quality/signal-readiness` | Signal-readiness subset of DQE | same query params (minus some filters) | `{ results[], … }` | none observed | DB: `instrument_eligibility` (filtered to signal-readiness columns) |
| 129 | GET | `/api/v1/data-quality/liquidity` | Liquidity evaluations subset | same query params | `{ results[], … }` | none observed | DB: `instrument_eligibility` (filtered to liquidity columns) |
| 130 | POST | `/api/v1/data-quality/evaluate` | Run DQE evaluation for a batch / single instrument | body/query: `instrumentId`, `symbol`, `region`, `assetType`, `batchSize` (1–100, default 25), `offset` | 202: `{ processed, skipped, errors }` | none observed | DB: `stocks`, `price_ticks`, `fundamentals` → writes `instrument_eligibility` |

---

## Summary Statistics

| Module | GET endpoints | POST endpoints | Total | External source hits | Disabled / stub endpoints |
|---|---|---|---|---|---|
| market-data-foundation (admin) | 4 active + 11 disabled | 3 active + 5 disabled | 23 | None | 16 (410 DISABLED) |
| market-data-foundation (v1) | 36 active + 7 disabled | 19 active + 1 disabled | 63 | NSE archives, BSE archives, NSE XBRL API | 8 (410 DISABLED) |
| derivatives-intelligence | 5 | 2 | 7 | NSE archives (fo-bhavcopy zip), NSE participant OI CSV | 0 |
| market-context-intelligence | 15 | 3 | 18 | NSE APIs (FII/DII, bulk-block-deals) | 0 |
| smart-money-intelligence | 6 | 2 | 8 | NSE (fo_secban.csv) | 0 |
| earnings-intelligence | 1 | 2 | 3 | NSE board-meetings API (bot-protected), SEC EDGAR company-facts | 0 |
| data-quality-engine | 5 | 1 | 6 | None | 0 |
| **TOTAL** | **72** | **30** | **128** | | **24 disabled** |

---

## External Source Inventory

| Source | URL | Used By | Notes |
|---|---|---|---|
| NSE CM UDiFF archive | `https://nsearchives.nseindia.com/content/cm/` | MDF exchange-file imports | Bhavcopy EOD for equities |
| BSE CM backup archive | BSE CM backup URL | MDF exchange-file imports | BSE EOD data |
| NSE F&O Bhavcopy archive | `https://nsearchives.nseindia.com/content/fo/BhavCopy_NSE_FO_…csv.zip` | derivatives-intelligence (fo-bhavcopy ingest) | Zip + CSV; 30k–100k rows |
| NSE participant OI CSV | NSE participant-wise OI endpoint | derivatives-intelligence (participant-oi ingest) | FII/DII/Pro/Client OI |
| NSE F&O ban list | `https://nsearchives.nseindia.com/content/fo/fo_secban.csv` | smart-money-intelligence (fno-ban ingest) | Daily securities in ban period |
| NSE FII/DII API | `https://www.nseindia.com/api/fiidiiTradeReact` | market-context-intelligence (fii-dii ingest) | Requires NSE cookie/User-Agent |
| NSE bulk/block deals API | `https://www.nseindia.com/api/snapshot-capital-market-largedeal` | market-context-intelligence (bulk-block-deals ingest) | No cookie needed |
| NSE XBRL / financial results API | `https://www.nseindia.com/api/...` (financial results) | MDF (nse-xbrl-bulk-ingest), earnings ingest-board-meetings (India) | Bot-protected; requires cookie |
| SEC EDGAR company-facts | `https://data.sec.gov/api/xbrl/companyfacts/CIK….json` | earnings ingest-board-meetings (US), MDF SEC services | Free, no auth |

---

## Disabled / Dead Endpoint Notes

The following 24 endpoints return HTTP 410 with `EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY` and are effectively dead:

- All Yahoo Finance / provider-based flows: `yahoo-search`, `/stocks/:id/sync`, `/stocks/sync-all`, `/stocks/sync-runs`, `/data/search`, `/data/ingest`, `/data/fundamentals/:symbol`, `/data/corporate-actions/:symbol`
- Provider price backfill flows: all 6 `/prices/backfill*` endpoints
- Provider validation / enrichment: `/market-data/provider/validate`, `/market-data/metadata/enrich`, `/market-data/metadata/provider-business/repair`
- FX-rate sync: `POST /fx-rates/sync`
- Legacy ingestion: `POST /ingestion/sync`

These routes exist as named stubs in the controller with `providerDisabledResponse()` — they will never call any service or DB code. The intent is to surface clear error messages to callers that still try the old API paths.

---

## Notable Observations

1. **No auth middleware observed** on any of these routes at the router level. Access control appears to be network/UI-level (admin panel vs user-facing pages) rather than token-based middleware in the backend.

2. **The screener (`GET /api/v1/market-data/screener`)** is a live cross-join across six DB tables (`stocks`, `signal_results`, `price_ticks`, `market_delivery_snapshots`, `fno_ban_list`, `fo_oi_buildup`, `fo_option_metrics`) with optimized CTE paths. It is NOT a persisted-snapshot read — it runs a real-time SQL query on each call. The 52w-position filter switches to a heavier full-universe path.

3. **`POST /api/v1/market-context/run`** is a heavy in-process recompute that touches `stocks` + `price_ticks` and writes a new snapshot. It is a side-effectful POST on a GET-style route name.

4. **`marketIntelligenceContextReadRouter`** registers the same three routes (`/market-intelligence/market-pulse`, `/market-intelligence/market-pulse/history`, `/market-intelligence/sectors`) as `marketContextIntelligenceRouter` — both are mounted at `/api/v1`. These are effectively duplicate registrations; the second registration wins in Express (or both fire if no response is sent by the first, which won't happen here).

5. **NSE XBRL and board-meetings ingestion** is explicitly flagged as bot-protected (requires live NSE cookie). These will fail from automated environments without cookie warm-up.

6. **`GET /api/v1/market-data/review-readiness-summary`** has a `?recompute=true` query flag that switches it from a fast persisted-read to a heavy live universe-health computation — a stateful side effect on a GET endpoint.
