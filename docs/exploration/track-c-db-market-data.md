# Track C — DB Market-Data / Instrument Group (Re-Audit 2026-06-16)

Covers all Prisma models and raw-SQL tables in the market-data / instrument group.
Row counts: `pg_class.reltuples` (approx) for large tables; `COUNT(*)` (exact) for small/empty ones.
Null densities: `COUNT(col)` vs `COUNT(*)` on live data.

---

## Prisma Models

### 1. `price_ticks` (PriceTick)

**Columns:** id (cuid PK), symbol, region (nullable), exchange (nullable), timestamp, open, high, low, close, adjustedClose (nullable), volume (nullable, BigInt), source (nullable), sourceFileImportId (FK → source_file_imports, nullable), ingestionTimestamp, lastUpdatedTimestamp, dataStatus.

**Unique constraint:** `(symbol, timestamp)` — note: no `region` in the key; cross-region collision risk documented in schema (deferred P0).

**Indexes:** `(symbol, timestamp)`, `region`, `sourceFileImportId`.

**Population (exact count):** 39,774,332 rows.
- `adjustedClose`: 37,725,546 non-null (94.8% populated)
- `volume`: 39,761,836 non-null (99.97% populated)
- `region`: 39,774,332 non-null (100% populated)
- Date range IN: 2014-01-01 → 2026-06-15 (4,016 distinct symbols)
- Date range US: 1970-01-02 → 2026-06-15 (12,129 distinct symbols); note 1970 epoch dates indicate placeholder/stub entries for some US instruments

**Endpoints/screens:** `market-data-foundation.repository.price.ts`, `market-data-foundation.repository.price-reads.ts`, `market-data-foundation.repository.price-readiness.ts`, `market-data-foundation.analytics.market-data-foundation.serving.price-reads.ts` — feeds signal generation, workbench, backtesting price queries.

---

### 2. `latest_prices` (LatestPrice)

**Columns:** symbol (PK), region (nullable), price, timestamp, updatedAt.

**Population (approx):** 16,017 rows; 100% non-null on region.

**Endpoints/screens:** Price reads across all trader-facing pages; queried by portfolio intelligence, workbench, and signal engine for current price context.

---

### 3. `stocks` (Stock)

**Columns:** id (cuid PK), symbol (unique), name, region, exchange (nullable), country (nullable), sector (nullable), industry (nullable), currency (nullable), marketCap (nullable), assetType (nullable), instrumentSegment (nullable), displaySymbol (nullable), providerSymbol (nullable), sourceSymbol (nullable), catalogSource (nullable), providerSupportStatus (nullable), providerError (nullable), derivativesEligible (bool), underlyingSymbol (nullable), expiryDate (nullable), contractMonth (nullable), lotSize (nullable), contractStatus (nullable), isDelisted (bool), ipoDate (nullable), isin (nullable), source, dataStatus, isActive (bool), lastSuccessfulDataLoadTimestamp (nullable), createdAt, updatedAt. Relations to ~15 downstream models.

**Indexes:** `(region, assetType, symbol)`, `(region, assetType, providerSupportStatus, isActive, isDelisted)`.

**Population (exact):** 15,909 rows.
- By region: IN=3,435 | US=12,169 | EU=301 | CA=1 | HK=2 | UK=1
- `isin`: 3,264 non-null (20.5%) — sparse, mostly IN records
- `sector`: 3,520 non-null (22.1%) — mostly IN records
- `marketCap`: 3,984 non-null (25.0%) — majority null especially for US universe

**Endpoints/screens:** `market-data-foundation.repository.catalog.ts`, `market-data-foundation.repository.catalog-queries.ts` — the universal instrument catalog. Used by virtually every module. `GET /api/v1/market-data/instruments`, `/catalog/search`, stock workbench, signal generation, portfolio management, etc.

---

### 4. `instrument_coverage` (InstrumentCoverage)

**Columns:** id (cuid PK), stockId (unique), symbol, region, isTracked (bool), trackingTier (nullable), reason (nullable), liquidityScore (nullable Decimal), liquidityRank (nullable Int), rankedAt (nullable), createdAt, updatedAt.

**Indexes:** `(region, isTracked)`, `symbol`.

**Population (exact):** 1,502 rows (US-only curated tracked set).
- `liquidityScore`: 1,500 non-null (99.9% populated)
- All 1,502 rows are `isTracked=true` (the ranked top-1,500-by-liquidity US set + 2 CORE pinned)

**Endpoints/screens:** `market-data-foundation.repository.coverage.ts` — drives US universe curation; `market-data-foundation.quality.universe-readiness.instruments.ts` enforces `isTracked`-based exclusion of 10,657 untracked US instruments from downstream analysis.

---

### 5. `source_file_imports` (SourceFileImport)

**Columns:** id (cuid PK), source, segment, tradingDate, fileName, fileUrl (nullable), fileHash, fileSize (nullable), status, rowsRaw, rowsAccepted, rowsRejected, parserVersion, importedAt, errorMessage (nullable), createdAt, updatedAt. Relations: priceTicks[], instrumentExchangeIdentities[], deliverySnapshots[].

**Unique:** `(source, segment, tradingDate, fileHash)`.

**Population (exact):** 4,051 rows.
- Status breakdown: COMPLETED=3,423 | FAILED=624 | NOT_AVAILABLE=4
- FAILED rate: 15.4% — notable; 624 import failures on record

**Endpoints/screens:** `market-data-foundation.repository.catalog-queries.ts`, admin pipeline-ops UI (`/admin/pipeline-ops`) to track NSE/BSE file import history.

---

### 6. `instrument_exchange_identities` (InstrumentExchangeIdentity)

**Columns:** id (cuid PK), stockId (FK → stocks), exchange, isin (nullable), exchangeSymbol, securityCode (nullable), securityId (nullable), series (nullable), status, sourceFileImportId (nullable FK), createdAt, updatedAt.

**Unique:** `(stockId, exchange, exchangeSymbol)`.

**Population (exact): 0 rows — EMPTY.**

PRIOR FINDING STATUS: **CONFIRMED still empty.** No exchange identity records have been written despite the schema being in place.

**Endpoints/screens:** `market-data-foundation.repository.catalog-queries.ts` — intended to store NSE/BSE per-exchange symbol mappings (ISIN, series, security code). Currently unused/unpopulated.

---

### 7. `market_delivery_snapshots` (MarketDeliverySnapshot)

**Columns:** id (cuid PK), stockId (FK → stocks), symbol, exchange (default NSE), tradingDate, tradedQuantity (nullable BigInt), deliverableQuantity (nullable BigInt), deliveryPercent (nullable Decimal), source, sourceFileImportId (nullable FK), createdAt, updatedAt.

**Unique:** `(stockId, exchange, tradingDate, source)`.

**Population (exact):** 211,446 rows.
- `deliverableQuantity`: 211,446 non-null (100%)
- `deliveryPercent`: 211,446 non-null (100%)
- Date range: 2026-01-14 → 2026-06-15 (100 distinct trading dates)

**Endpoints/screens:** `snapshot-assembler.service.ts`, `market-data-foundation.repository.price-reads.ts` — delivery % fed into market-pulse, stock-interest, and smart-money snapshots; displayed on stock workbench delivery panel.

---

### 8. `fundamentals` (Fundamental)

**Columns:** id (cuid PK), stockId (FK → stocks), revenue (nullable), eps (nullable), netIncome (nullable), peRatio (nullable), dividendYield (nullable), sharesOutstanding (nullable), marketCap (nullable), currency (nullable), periodType, periodEndDate, officialResultDate (nullable), source, sourceNote (nullable), sourceUrl (nullable), validatedBy (nullable), validatedAt (nullable), ingestionTimestamp, lastUpdatedTimestamp, dataStatus.

**Unique:** `(stockId, periodType, periodEndDate, source)`.

**Population (approx):** 15,845 rows.
- `eps`: 15,709 non-null (99.1%)
- `revenue`: 15,607 non-null (98.5%)
- `officialResultDate`: 4,386 non-null (27.7%) — majority null; only NSE-calendar-enriched rows have this field set; needed for OFFICIAL_CALENDAR earnings-intelligence categories

**Endpoints/screens:** `market-data-foundation.analytics.market-data-foundation.serving.fundamentals-reads.ts`, `market-data-foundation.yahoo-fundamentals.service.ts`, `stock-research-workbench` — fundamentals panel, earnings intelligence pipeline.

---

### 9. `corporate_actions` (CorporateAction)

**Columns:** id (cuid PK), stockId (FK → stocks), actionType, effectiveDate, declaredDate (nullable), paymentDate (nullable), amount (nullable), splitRatio (nullable), currency (nullable), source, naturalKey (unique), ingestionTimestamp, lastUpdatedTimestamp, dataStatus.

**Population (exact):** 426,118 rows.
- Breakdown by actionType: dividend=416,624 | split=5,934 | reverse_split=3,120 | bonus=440
- Dominant type: dividend (97.8%)

**Endpoints/screens:** `market-data-foundation.repository.corporate-actions.ts` — used in workbench corporate actions panel, signal engine for split-adjustment awareness.

---

### 10. `fx_rates` (FxRate)

**Columns:** id (cuid PK), pair (unique), baseCurrency, quoteCurrency, rate (Decimal), rateTimestamp, source, ingestionTimestamp, lastUpdatedTimestamp, dataStatus.

**Population (exact): 0 rows — EMPTY.**

PRIOR FINDING STATUS: **CONFIRMED still empty.** No FX rate data has ever been written. Any multi-currency conversion in the app is either hardcoded or fallback-based.

**Endpoints/screens:** No active consumers observed (table is empty). Intended for future multi-currency portfolio valuation.

---

### 11. `market_data_repair_attempts` (MarketDataRepairAttempt)

**Columns:** id (cuid PK), stockId (FK → stocks), region, assetType (nullable), repairType, status, provider (nullable), attemptedAt, completedAt (nullable), fieldsFilledJson (nullable), error (nullable), manualRequiredReason (nullable), createdAt, updatedAt.

**Population (exact):** 819 rows.
- `error`: 819 non-null (100%) — all repair attempts have an error field populated

**Endpoints/screens:** `market-data-foundation.repository.repair-queries.ts` — admin market-data health/repair endpoints.

---

### 12. `market_data_repair_states` (MarketDataRepairState)

**Columns:** id (cuid PK), stockId (FK → stocks, unique per repairType), region, assetType (nullable), repairType, status, provider (nullable), lastAttemptId (nullable), fieldsFilledJson (nullable), error (nullable), manualRequiredReason (nullable), nextRetryAt (nullable), firstDetectedAt, lastAttemptedAt (nullable), resolvedAt (nullable), createdAt, updatedAt.

**Unique:** `(stockId, repairType)`.

**Population (exact):** 819 rows.
- `error`: 819 non-null (100%) — mirrors repair_attempts count exactly

**Endpoints/screens:** `market-data-foundation.repository.repair-queries.ts` — current repair state per instrument per repair type.

---

### 13. `market_data_repair_runs` (MarketDataRepairRun)

**Columns:** id (cuid PK), region, assetType (nullable), status, startedAt, completedAt (nullable), beforeHealthJson (nullable), afterHealthJson (nullable), beforeRepairPlanJson (nullable), afterRepairPlanJson (nullable), actionsJson, summaryJson (nullable), warningsJson (nullable), error (nullable), createdAt, updatedAt.

**Population (exact):** 28 rows; all 28 have `completedAt` non-null (all runs completed).

**Endpoints/screens:** `market-data-foundation.repository.repair-queries.ts` — repair run history for admin.

---

### 14. `market_data_sync_states` (MarketDataSyncState)

**Columns:** id (cuid PK), region, assetType, scopeType (default CATALOG), scopeKey (default DEFAULT), timeframe (default 1D), tradingDate, status, lastCheckedAt (nullable), lastProviderFetchAt (nullable), lastRunAt (nullable), lastInsertedCount, lastUpdatedCount, lastNoOpCount, lastSkippedCount, lastWarningCount, lastSummary (nullable), createdAt, updatedAt.

**Unique:** `(region, assetType, scopeType, scopeKey, timeframe, tradingDate)`.

**Population (exact):** 16,158 rows.
- Breakdown by region/assetType: IN/STOCK=15,005 | US/STOCK=1,010 | IN/ETF=124 | IN/INDEX=13 | IN/EQUITY=2 | EU/STOCK=2 | GLOBAL/CRYPTO=2

**Endpoints/screens:** `market-data-foundation.repository.catalog.ts`, admin market-data-foundation UI — daily sync tracking per instrument x date.

---

### 15. `instrument_eligibility` (InstrumentEligibility)

**Columns:** id (cuid PK), instrumentId (FK → stocks), tradingDate, priceBars (Int), lastPriceDate (nullable DateTime), staleSessions (Int), volumeCoveragePct (Decimal), maxGapDays (Int), liquidityScore (Int), hasFundamentals (bool), hasSector (bool), hasIndustry (bool), hasCountry (bool), signalEligible (bool), reviewEligible (bool), backtestEligible (bool), calibrationEligible (bool), signalReasons (String[]), reviewReasons (String[]), backtestReasons (String[]), calibrationReasons (String[]), readinessScore (Int), readinessStatus (String), policyVersion (String), computedAt (DateTime), createdAt, updatedAt.

**Unique:** `(instrumentId, tradingDate)`.

**Population (exact):** 10,123 rows.
- `lastPriceDate`: 9,546 non-null (94.3%); 577 rows have no price data at all
- Date range: 2026-05-29 → 2026-06-15

**Endpoints/screens:** `snapshot-assembler.service.ts` — eligibility verdicts are the first section assembled into `daily_instrument_snapshot`; feeds today-trade-review, signal-generation-engine.

---

### 16. `daily_instrument_snapshot` (DailyInstrumentSnapshot)

**Columns:** id (cuid PK), instrumentId (FK → stocks), tradingDate, snapshotVersion (Int), region, assetType, signalEligible/reviewEligible/backtestEligible/calibrationEligible (bool), reviewReasons (String[]), signalReasons (String[]), readinessScore (Int), readinessStatus (String), signalScore (nullable Float), signalDirection (nullable), signalModelVersion (nullable), calibratedScore (nullable Float), calibrationAuthority (nullable), strategyDecision (nullable), rulesFired (String[]), stopLoss (nullable Decimal), target (nullable Decimal), rrRatio (nullable Float), planStatus (nullable), marketRegime (nullable), breadthPct (nullable Float), sectorRelativeStrength (nullable Float), oiBuildup (nullable), participantPositioning (nullable), earningsProximityDays (nullable Int), smartMoneyCode (nullable), smartMoneyScore (nullable Float), provenance (Json), assembledAt, createdAt, updatedAt.

**Unique:** `(instrumentId, tradingDate, snapshotVersion)`.

**Population (exact):** 20,143 rows.
- By region/assetType: IN/STOCK=19,857 | US/STOCK=262 | EU/STOCK=24
- Date range: 2026-05-29 → 2026-06-15
- `signalScore`: 13,192 non-null (65.5%)
- `calibratedScore`: 16,477 non-null (81.8%)
- `marketRegime`: 20,143 non-null (100%)
- `stopLoss`: **0 non-null (100% null)**
- `target`: **0 non-null (100% null)**
- `rrRatio`: **0 non-null (100% null)**
- `oiBuildup`: **0 non-null (100% null)**
- `participantPositioning`: **0 non-null (100% null)**

PRIOR FINDING STATUS: **CONFIRMED** — stopLoss/target/rrRatio 100% null; oiBuildup/participantPositioning 100% null. Trade-plan and derivatives sections are NOT being assembled into snapshots.

**Endpoints/screens:** Primary read surface for all trader-facing pages. `today-trade-review.repository.ts`, `ai-investment-copilot`, `portfolio-intelligence`, `market-intelligence.instrument-context.service.ts`.

---

### 17. `snapshot_watermarks` (SnapshotWatermark)

**Columns:** id (cuid PK), region, assetType, tradingDate, snapshotVersion (Int), rowCount (Int), assembledAt.

**Unique:** `(region, assetType, tradingDate)`.

**Population (exact):** 8 rows.
- IN/STOCK: 4 watermarks | US/STOCK: 3 watermarks | EU/STOCK: 1 watermark

**Endpoints/screens:** `snapshot-assembler.service.ts` — the read gate preventing consumers from observing mid-pipeline state. Checked before serving `daily_instrument_snapshot`.

---

## Raw SQL Tables

### R1. `fo_participant_oi`

**Columns:** trading_date (date, PK part), participant (text, PK part), future_index_long/short, future_stock_long/short, option_index_call_long/short, option_index_put_long/short, option_stock_call_long/short, option_stock_put_long/short, total_long, total_short (all bigint NOT NULL default 0), source (text), fetched_at (timestamptz). PK: `(trading_date, participant)`.

**Population (exact):** 28 rows (7 participants x 4 recent days). Date range: 2026-06-05 → 2026-06-15. NEAR-EMPTY.

**Endpoints/screens:** `derivatives-intelligence.participant-oi.service.ts`, `market-intelligence.instrument-context.service.ts`, `market-context-intelligence.eod-ingest.scheduler.ts`, `snapshot-assembler.service.ts` — intended to populate `participantPositioning` in daily snapshot, but that column is currently 100% null (not flowing through assembler).

---

### R2. `fo_option_metrics`

**Columns:** trading_date (date, PK part), underlying (text, PK part), expiry_date (date, PK part), is_market_aggregate (bool), pcr_oi (nullable numeric), total_call_oi / total_put_oi (bigint), max_call_oi_strike / max_put_oi_strike / max_pain_strike (nullable numeric), computed_at (timestamptz). PK: `(trading_date, underlying, expiry_date)`.

**Population (exact):** 4,641 rows. Date range: 2026-06-05 → 2026-06-15.

**Endpoints/screens:** `derivatives-intelligence.option-metrics.service.ts`, `market-intelligence.instrument-context.service.ts`.

---

### R3. `fo_oi_buildup`

**Columns:** trading_date (date, PK part), underlying (text, PK part), instrument_type (text, PK part), total_oi / oi_change (bigint), oi_change_pct / price / price_change_pct (nullable numeric), buildup_label (text default NEUTRAL), derivatives_eligible (bool), computed_at (timestamptz). PK: `(trading_date, underlying, instrument_type)`.

**Population (exact):** 1,512 rows. Date range: 2026-06-05 → 2026-06-15.

**Endpoints/screens:** `derivatives-intelligence.oi-buildup.service.ts`, `market-intelligence.instrument-context.service.ts` — intended to populate `oiBuildup` in daily snapshot, but that column is currently 100% null.

---

### R4. `fo_bhavcopy_contracts`

**Columns:** id (text PK via uuid), trading_date (date), instrument_type (text), underlying (text), expiry_date (date), strike_price (numeric), option_type (text), settle_price / underlying_price / turnover_rs (nullable numeric), open_interest / change_in_oi / contracts_traded (bigint), lot_size (nullable int), source (text), fetched_at (timestamptz). PK: `(trading_date, instrument_type, underlying, expiry_date, strike_price, option_type)`. Indexes: `(trading_date, instrument_type)`, `(underlying, trading_date)`.

**Population (exact):** 370,938 rows. Date range: 2026-06-03 → 2026-06-15. Most richly populated F&O table.

**Endpoints/screens:** `derivatives-intelligence.fo-bhavcopy.service.ts`, `snapshot-assembler.service.ts`.

---

### R5. `fii_dii_snapshots`

**Columns:** id (text PK), trading_date (date, PK with category), category (text), buy_value_cr / sell_value_cr / net_value_cr (numeric(14,2)), source (text), fetched_at (timestamptz), updated_at (timestamptz). PK: `(trading_date, category)`.

**Population (exact):** 14 rows. Date range: 2026-06-05 → 2026-06-15. NEAR-EMPTY (~7 trading days x 2 categories).

**Endpoints/screens:** `market-context-intelligence.fii-dii.service.ts`, `market-intelligence.event-feed.service.ts`.

---

### R6. `bulk_block_deals`

**Columns:** id (text PK), trade_date (date), deal_type (text), symbol (text), name (text), client_name (text), buy_sell (text), qty (bigint), avg_price (numeric(14,4)), remarks (nullable text), source (text), fetched_at (timestamptz), updated_at (timestamptz). PK: `(trade_date, symbol, client_name, deal_type, qty)`.

**Population (exact):** 827 rows. Date range: 2026-06-05 → 2026-06-15.
- `remarks`: 0 non-null (100% null) — never populated by NSE source

**Endpoints/screens:** `market-context-intelligence.bulk-block-deals.service.ts`, `market-intelligence.instrument-context.service.ts`.

---

### R7. `us_insider_trades`

**Status: DOES NOT EXIST.** `to_regclass('public.us_insider_trades')` returns NULL.

PRIOR FINDING STATUS: **CONFIRMED** — table was never created.

---

### R8. `us_institutional_holdings`

**Status: DOES NOT EXIST.** `to_regclass('public.us_institutional_holdings')` returns NULL.

PRIOR FINDING STATUS: **CONFIRMED** — table was never created.

---

### R9. `fno_ban_list`

**Columns:** id (text PK), ban_date (date), symbol (text), source (text), fetched_at (timestamptz). PK: `(ban_date, symbol)`.

**Population (exact):** 10 rows. Date range: 2026-06-08 → 2026-06-16. NEAR-EMPTY (rolling window only).

**Endpoints/screens:** `smart-money-intelligence.fno-ban.service.ts`, `derivatives-intelligence.catalog-enrichment.service.ts`, `market-data-foundation.repository.conviction.ts`, `market-data-foundation.repository.scans-screener.ts`, `today-trade-review.repository.ts`.

---

## Summary of Prior Findings (Re-Audit Verdict)

| Prior Finding | Status |
|---|---|
| `fx_rates` EMPTY | CONFIRMED — still 0 rows |
| `instrument_exchange_identities` EMPTY | CONFIRMED — still 0 rows |
| `us_insider_trades` DOES NOT EXIST | CONFIRMED — table absent |
| `us_institutional_holdings` DOES NOT EXIST | CONFIRMED — table absent |
| `daily_instrument_snapshot.stopLoss/target/rrRatio` 100% null | CONFIRMED — still 0/20,143 non-null |
| `daily_instrument_snapshot.oiBuildup/participantPositioning` 100% null | CONFIRMED — still 0/20,143 non-null |

All six prior findings remain unchanged as of 2026-06-16.

---

## Notable New / Updated Findings

- **`source_file_imports` FAILED rate:** 624/4,051 records (15.4%) show status=FAILED — elevated failure rate worth monitoring.
- **US `price_ticks` epoch dates:** some US records have timestamp 1970-01-02 (Unix epoch stub entries).
- **`fo_participant_oi` near-empty (28 rows):** raw data exists but does NOT flow to `daily_instrument_snapshot.participantPositioning` (100% null there).
- **`fo_oi_buildup` not flowing:** 1,512 rows exist but `daily_instrument_snapshot.oiBuildup` is still 100% null.
- **`fno_ban_list` tiny (10 rows):** rolling window only; no archival depth.
- **`fundamentals.officialResultDate`:** only 27.7% populated (4,386/15,845); limits OFFICIAL_CALENDAR earnings-intelligence categories.
- **`stocks.isin/sector/marketCap` sparse for US:** 12,169 US stocks mostly null on isin, sector, marketCap — only IN catalog is enriched.
- **All F&O / raw tables have shallow date range:** all raw SQL tables cover only 2026-06-03 → 2026-06-16 (no historical F&O archive beyond ~2 weeks).
- **`instrument_eligibility` (10,123 rows) vs `daily_instrument_snapshot` (20,143 rows):** snapshot table has ~2x more rows than eligibility, indicating the snapshot assembler writes multiple snapshotVersions per instrument-date as restates occur.
