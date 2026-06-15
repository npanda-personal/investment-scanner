# Track C — DB Reconnaissance: Market Data / Instrument Tables

**Date:** 2026-06-15  
**Scope:** Prisma models + raw-SQL tables in the MARKET-DATA / INSTRUMENT group.  
**Method:** READ-ONLY. Row counts via `pg_class.reltuples` for large tables; `count(*)` for small ones. Null-density via single-pass aggregates. Readers from `grep -l` over `backend/src/`.

---

## Summary Table

| Table | Rows (approx) | Status |
|---|---|---|
| price_ticks | ~39.8M | Rich — multi-region historical data |
| latest_prices | ~16K | Populated, mirrors stocks count |
| stocks | 15,909 | Populated — US-heavy; sector/industry null for ~75% |
| instrument_coverage | 1,502 | US-only (curated set); nearly fully populated |
| source_file_imports | 4,049 | Active, NSE bhavcopy + FnO history |
| instrument_exchange_identities | **0** | EMPTY — schema exists, no rows |
| market_delivery_snapshots | 211,446 | Rich — Jan–Jun 2026 NSE delivery data |
| fundamentals | 15,845 | Populated; peRatio ~94% null; officialResultDate 28% populated |
| corporate_actions | 426,118 | Very large; amount null ~2.3%, splitRatio ~97.8% null |
| fx_rates | **0** | EMPTY |
| market_data_repair_attempts | 819 | Small operational table |
| market_data_repair_states | 819 | Small; resolvedAt 100% null (all unresolved) |
| market_data_repair_runs | 28 | Small operational log |
| market_data_sync_states | 16,155 | Fully populated, all fields non-null |
| instrument_eligibility | 10,074 | Active; ~5.7% lastPriceDate null |
| daily_instrument_snapshot | 20,094 | Active; stopLoss/oiBuildup 100% null |
| snapshot_watermarks | 6 | Very small — only recent dates covered |
| fo_bhavcopy_contracts | 370,938 | Rich — 2026-06-03 to 06-15 |
| fo_participant_oi | 28 | Thin — 2026-06-05 to 06-15 (~2 weeks) |
| fo_option_metrics | 4,641 | Moderate — 2026-06-05 to 06-15 |
| fo_oi_buildup | 1,512 | Moderate — 2026-06-05 to 06-15 |
| fii_dii_snapshots | 14 | Very thin — only ~1 week |
| bulk_block_deals | 827 | Moderate — 2026-06-05 to 06-15 |
| fno_ban_list | 1,512 | Moderate — 2026-06-08 to 06-16 |
| us_insider_trades | **does not exist yet** | Created lazily on first ingest run |
| us_institutional_holdings | **does not exist yet** | Created lazily on first ingest run |

---

## Prisma Models

---

### 1. `price_ticks` (PriceTick)

**Schema:** `symbol TEXT`, `region TEXT?`, `exchange TEXT?`, `timestamp DATETIME`, `open/high/low/close DECIMAL`, `adjustedClose DECIMAL?`, `volume BIGINT?`, `source TEXT?`, `sourceFileImportId TEXT?` (FK → source_file_imports, SetNull), `dataStatus TEXT DEFAULT 'COMPLETE'`.  
Unique: `[symbol, timestamp]`. Indexes on `[symbol,timestamp]`, `[region]`, `[sourceFileImportId]`.  
TimescaleDB hypertable (equity price history — NOT safe for `ALTER TABLE` column changes via standard migration).

**Population:**
- Rows: ~39.8M (pg_class estimate); confirmed 39,773,932 via count(*)
- region: 100% non-null. Breakdown: US 32.5M, IN 5.5M, EU 1.7M
- exchange: 99.98% non-null (9,458 null)
- adjustedClose: 94.8% non-null (~2.05M null — likely IN rows lacking adj close)
- volume: 99.97% non-null (~12,363 null)
- source: 100% non-null
- sourceFileImportId: 13.9% non-null (5.5M rows have file import linkage — IN bhavcopy imports)
- Date range: 1970-01-02 to 2026-06-15 (the 1970 rows are likely placeholder/legacy; 3 distinct regions)

**Readers:** `market-data-foundation` (price-reads repository, scans, catalog-queries, screener, movers), `market-context-intelligence` (breadth), `signal-generation-engine`, `portfolio-management`, `today-trade-review`, `data-quality-engine`, `backtesting-strategy-lab`

---

### 2. `latest_prices` (LatestPrice)

**Schema:** `symbol TEXT PK`, `region TEXT?`, `price DECIMAL`, `timestamp DATETIME`, `updatedAt DATETIME @updatedAt`.

**Population:**
- Rows: ~16,017 (pg_class)
- Mirrors stock catalog size. All key fields expected non-null by design.

**Readers:** `market-data-foundation` (price-reads, screener), `signal-generation-engine`, `today-trade-review`, `portfolio-management`

---

### 3. `stocks` (Stock)

**Schema:** 35+ columns. Key: `id TEXT PK`, `symbol TEXT UNIQUE`, `name TEXT`, `region TEXT`, `exchange TEXT?`, `sector TEXT?`, `industry TEXT?`, `currency TEXT?`, `marketCap DECIMAL?`, `assetType TEXT?`, `instrumentSegment TEXT?`, `derivativesEligible BOOL DEFAULT false`, `isDelisted BOOL DEFAULT false`, `isActive BOOL DEFAULT true`, `dataStatus TEXT DEFAULT 'PARTIAL'`, `lastSuccessfulDataLoadTimestamp DATETIME?`. Multiple relations to child tables.  
Indexes: `[region,assetType,symbol]`, `[region,assetType,providerSupportStatus,isActive,isDelisted]`.

**Population:**
- Rows: 15,909 exact
- region: 100% non-null. Breakdown: US 12,169 | IN 3,435 | EU 301 | HK 2 | CA 1 | UK 1
- exchange: 100% non-null
- sector: 22.1% non-null (3,520/15,909) — 77.9% null; mostly US stocks missing sector
- industry: 22.2% non-null (3,533) — similarly sparse
- currency: 99.9% non-null (16 null)
- marketCap: 25.0% non-null (3,984) — very sparse
- assetType: 99.9% non-null (16 null)
- lastSuccessfulDataLoadTimestamp: 22.0% non-null (3,504) — only recently-synced stocks have this

Notable gaps: sector, industry, marketCap null for ~75–78% of the catalog. US stocks dominate.

**Readers:** Nearly every module — primary instrument catalog. Key readers: `market-data-foundation` (all sub-repositories), `signal-generation-engine`, `earnings-intelligence`, `data-quality-engine`, `smart-money-intelligence`, `snapshot-assembler`, `portfolio-management`, `today-trade-review`, `stock-research-workbench`, `ai-investment-copilot`

---

### 4. `instrument_coverage` (InstrumentCoverage)

**Schema:** `id TEXT PK`, `stockId TEXT UNIQUE` (no FK — intentionally decoupled), `symbol TEXT`, `region TEXT`, `isTracked BOOL DEFAULT false`, `trackingTier TEXT?` (CORE|STANDARD), `reason TEXT?` (INDEX|ETF|LIQUIDITY|MANUAL), `liquidityScore DECIMAL?`, `liquidityRank INT?`, `rankedAt DATETIME?`.  
Indexes: `[region,isTracked]`, `[symbol]`.

**Population:**
- Rows: 1,502 exact
- isTracked: 100% non-null (all rows tracked)
- trackingTier: 100% non-null
- reason: 100% non-null
- liquidityScore: 99.9% non-null (1,500/1,502 — 2 null)
- liquidityRank: 99.9% non-null (1,500/1,502)
- rankedAt: 100% non-null
- All 1,502 rows are US region (US curation only implemented; IN/EU not yet curated through this table)

**Readers:** `market-data-foundation` (repository.coverage.ts), `market-data-foundation.quality` (universe-readiness)

---

### 5. `source_file_imports` (SourceFileImport)

**Schema:** `id TEXT PK`, `source TEXT`, `segment TEXT`, `tradingDate DATETIME`, `fileName TEXT`, `fileUrl TEXT?`, `fileHash TEXT`, `fileSize INT?`, `status TEXT`, `rowsRaw INT DEFAULT 0`, `rowsAccepted INT DEFAULT 0`, `rowsRejected INT DEFAULT 0`, `parserVersion TEXT`, `importedAt DATETIME`, `errorMessage TEXT?`.  
Unique: `[source,segment,tradingDate,fileHash]`. Index: `[source,segment,tradingDate,status]`.  
Relations: PriceTick[], InstrumentExchangeIdentity[], MarketDeliverySnapshot[].

**Population:**
- Rows: 4,049 exact
- tradingDate: 100% non-null
- rowsRaw: 100% non-null
- fileUrl: 95.8% non-null (3,877/4,049 — 172 null, likely older imports without URL tracking)
- errorMessage: 15.5% non-null (628 — error records)

**Readers:** `market-data-foundation` (repository.source-imports.ts)

---

### 6. `instrument_exchange_identities` (InstrumentExchangeIdentity)

**Schema:** `id TEXT PK`, `stockId TEXT` (FK → stocks.id, Cascade), `exchange TEXT`, `isin TEXT?`, `exchangeSymbol TEXT`, `securityCode TEXT?`, `securityId TEXT?`, `series TEXT?`, `status TEXT`, `sourceFileImportId TEXT?` (FK → source_file_imports, SetNull).  
Unique: `[stockId,exchange,exchangeSymbol]`. Indexes: `[exchange,exchangeSymbol]`, `[exchange,isin]`, `[sourceFileImportId]`.

**Population:**
- Rows: **0 — EMPTY**
- Schema fully defined but no data has been written. The bhavcopy ingest creates these records but none exist in the live DB, suggesting the identity-enrichment step is either skipped in the current pipeline or was never run.

**Readers:** `market-data-foundation` (repository.catalog-queries.ts) — joins to this table for exchange-symbol lookups; currently returns empty

---

### 7. `market_delivery_snapshots` (MarketDeliverySnapshot)

**Schema:** `id TEXT PK`, `stockId TEXT` (FK → stocks.id, Cascade), `symbol TEXT`, `exchange TEXT DEFAULT 'NSE'`, `tradingDate DATETIME`, `tradedQuantity BIGINT?`, `deliverableQuantity BIGINT?`, `deliveryPercent DECIMAL?`, `source TEXT`, `sourceFileImportId TEXT?` (FK → source_file_imports, SetNull).  
Unique: `[stockId,exchange,tradingDate,source]`. Indexes: `[symbol,tradingDate]`, `[tradingDate,exchange]`, `[sourceFileImportId]`.

**Population:**
- Rows: 211,446 exact
- tradedQuantity: 100% non-null
- deliverableQuantity: 100% non-null
- deliveryPercent: 100% non-null
- sourceFileImportId: 100% non-null (all linked to file imports)
- Date range: 2026-01-14 to 2026-06-15 (5 months of NSE CM delivery data)

**Readers:** `market-data-foundation` (repository.scans.ts, repository.scans-screener.ts — delivery spike scan), `data-quality-engine`, `signal-generation-engine` (delivery ratio signal)

---

### 8. `fundamentals` (Fundamental)

**Schema:** `id TEXT PK`, `stockId TEXT` (FK → stocks.id, Cascade), `revenue DECIMAL?`, `eps DECIMAL?`, `netIncome DECIMAL?`, `peRatio DECIMAL?`, `dividendYield DECIMAL?`, `sharesOutstanding BIGINT?`, `marketCap DECIMAL?`, `currency TEXT?`, `periodType TEXT`, `periodEndDate DATETIME`, `officialResultDate DATETIME?`, `source TEXT`, `sourceNote TEXT?`, `validatedBy TEXT?`, `validatedAt DATETIME?`, `dataStatus TEXT DEFAULT 'PARTIAL'`.  
Unique: `[stockId,periodType,periodEndDate,source]`. Indexes: `[stockId,periodEndDate]`, `[stockId,officialResultDate]`.

**Population:**
- Rows: 15,845 exact
- revenue: 98.5% non-null (15,607/15,845)
- eps: 99.1% non-null (15,709/15,845)
- netIncome: 99.5% non-null (15,764)
- peRatio: 5.9% non-null (938/15,845) — **nearly entirely null** — not sourced for most instruments
- officialResultDate: 27.7% non-null (4,386) — only populated for IN instruments with NSE board-meeting dates

**Readers:** `earnings-intelligence` (primary consumer), `signal-generation-engine` (EPS/growth signals), `data-quality-engine`, `stock-research-workbench`, `ai-investment-copilot`, `market-data-foundation` (serving.fundamentals-reads.ts, repository.fundamentals.ts)

---

### 9. `corporate_actions` (CorporateAction)

**Schema:** `id TEXT PK`, `stockId TEXT` (FK → stocks.id, Cascade), `actionType TEXT`, `effectiveDate DATETIME`, `declaredDate DATETIME?`, `paymentDate DATETIME?`, `amount DECIMAL?`, `splitRatio DECIMAL?`, `currency TEXT?`, `source TEXT`, `naturalKey TEXT UNIQUE`, `dataStatus TEXT DEFAULT 'COMPLETE'`.  
Index: `[stockId,effectiveDate]`.

**Population:**
- Rows: 426,118 exact
- actionType: 100% non-null
- amount: 97.7% non-null (416,624) — predominantly dividend records
- splitRatio: 2.2% non-null (9,494) — only split/bonus records have this
- Large table — predominantly dividend corporate actions for IN+US

**Readers:** `stock-research-workbench`, `market-data-foundation` (repository.corporate-actions.ts, serving.fundamentals-reads.ts), `signal-generation-engine` (corporate action signal)

---

### 10. `fx_rates` (FxRate)

**Schema:** `id TEXT PK`, `pair TEXT UNIQUE`, `baseCurrency TEXT`, `quoteCurrency TEXT`, `rate DECIMAL`, `rateTimestamp DATETIME`, `source TEXT`, `dataStatus TEXT DEFAULT 'COMPLETE'`.  
Index: `[baseCurrency,quoteCurrency]`.

**Population:**
- Rows: **0 — EMPTY**
- No FX rates have been ingested. Any cross-currency conversion logic that relies on this table is currently non-functional.

**Readers:** `market-data-foundation` (repository.provider-cleanup.ts references it), `scripts/auditStockDataDuplicates.ts`

---

### 11. `market_data_repair_attempts` (MarketDataRepairAttempt)

**Schema:** `id TEXT PK`, `stockId TEXT` (FK → stocks.id, Cascade), `region TEXT`, `assetType TEXT?`, `repairType TEXT`, `status TEXT`, `provider TEXT?`, `attemptedAt DATETIME`, `completedAt DATETIME?`, `fieldsFilledJson JSON?`, `error TEXT?`, `manualRequiredReason TEXT?`.

**Population:**
- Rows: 819 exact
- completedAt: 100% non-null (all 819 attempts completed)
- fieldsFilledJson: 100% non-null
- manualRequiredReason: 100% non-null (all attempts flagged as manual-required, meaning auto-repair succeeded partially but full resolution needs manual work)

**Readers:** `market-data-foundation` (repository.repair-queries.ts), `market-data-read.api.ts`

---

### 12. `market_data_repair_states` (MarketDataRepairState)

**Schema:** `id TEXT PK`, `stockId TEXT` (FK → stocks.id, Cascade), `region TEXT`, `assetType TEXT?`, `repairType TEXT`, `status TEXT`, `lastAttemptId TEXT?`, `fieldsFilledJson JSON?`, `error TEXT?`, `manualRequiredReason TEXT?`, `nextRetryAt DATETIME?`, `firstDetectedAt DATETIME`, `lastAttemptedAt DATETIME?`, `resolvedAt DATETIME?`.  
Unique: `[stockId,repairType]`. Indexes: `[region,assetType,repairType,status]`, `[repairType,status,nextRetryAt]`.

**Population:**
- Rows: 819 exact (one state per stockId+repairType pair)
- nextRetryAt: 100% non-null (819 — all scheduled for retry)
- resolvedAt: **0% non-null — 100% null** — no repairs have been fully resolved
- fieldsFilledJson: 100% non-null

**Readers:** `market-data-foundation` (repository.repair-state.ts), `market-data-read.api.ts`

---

### 13. `market_data_repair_runs` (MarketDataRepairRun)

**Schema:** `id TEXT PK`, `region TEXT`, `assetType TEXT?`, `status TEXT`, `startedAt DATETIME`, `completedAt DATETIME?`, `beforeHealthJson JSON?`, `afterHealthJson JSON?`, `beforeRepairPlanJson JSON?`, `afterRepairPlanJson JSON?`, `actionsJson JSON`, `summaryJson JSON?`, `warningsJson JSON?`, `error TEXT?`.  
Index: `[region,assetType,status,startedAt]`.

**Population:**
- Rows: 28 exact
- completedAt: 100% non-null (all runs completed)
- beforeHealthJson: 100% non-null
- Small operational audit log.

**Readers:** `market-data-foundation` (market-data-read.api.ts — admin endpoints), `repository.repair-state.ts`

---

### 14. `market_data_sync_states` (MarketDataSyncState)

**Schema:** `id TEXT PK`, `region TEXT`, `assetType TEXT`, `scopeType TEXT DEFAULT 'CATALOG'`, `scopeKey TEXT DEFAULT 'DEFAULT'`, `timeframe TEXT DEFAULT '1D'`, `tradingDate DATETIME`, `status TEXT`, `lastCheckedAt DATETIME?`, `lastProviderFetchAt DATETIME?`, `lastRunAt DATETIME?`, `lastInsertedCount INT`, `lastUpdatedCount INT`, `lastNoOpCount INT`, `lastSkippedCount INT`, `lastWarningCount INT`, `lastSummary JSON?`.  
Unique: `[region,assetType,scopeType,scopeKey,timeframe,tradingDate]`. Index: `[region,assetType,scopeType,timeframe,status]`.

**Population:**
- Rows: 16,155 exact
- lastCheckedAt: 100% non-null
- lastProviderFetchAt: 99.8% non-null (16,128/16,155 — 27 null)
- lastRunAt: 100% non-null
- lastSummary: 100% non-null
- Fully operational — tracks sync state per instrument per trading date.

**Readers:** `market-data-foundation` (ingestion scheduler, ingestion.v1, endpoints), `pipeline-orchestration`

---

### 15. `instrument_eligibility` (InstrumentEligibility)

**Schema:** `id TEXT PK`, `instrumentId TEXT` (FK → stocks.id, Cascade), `tradingDate DATETIME`, facts: `priceBars INT`, `lastPriceDate DATETIME?`, `staleSessions INT`, `volumeCoveragePct DECIMAL`, `maxGapDays INT`, `liquidityScore INT`, `hasFundamentals BOOL`, `hasSector BOOL`, `hasIndustry BOOL`, `hasCountry BOOL`. Verdicts: `signalEligible BOOL`, `reviewEligible BOOL`, `backtestEligible BOOL`, `calibrationEligible BOOL`. Arrays: `signalReasons`, `reviewReasons`, etc. Summary: `readinessScore INT`, `readinessStatus TEXT` (READY|LIMITED|NOT_READY). Provenance: `policyVersion TEXT`, `computedAt DATETIME`.  
Unique: `[instrumentId,tradingDate]`. Indexes: `[tradingDate]`, `[tradingDate,signalEligible]`, `[tradingDate,reviewEligible]`.

**Population:**
- Rows: 10,074 exact
- lastPriceDate: 94.3% non-null (9,497/10,074 — 577 null for instruments with no price data)
- Date range: 2026-05-29 to 2026-06-15 (~2.5 weeks of daily evaluations)
- All other columns fully non-null by schema.

**Readers:** `data-quality-engine` (writer + reader), `snapshot-assembler`, `signal-generation-engine`, `signal-calibration-engine`, `strategy-decision-engine`, `trade-plan-risk-engine`, `today-trade-review`, `backtesting-strategy-lab`, `smart-money-intelligence`, `shared/types/eligibility-policy.ts`

---

### 16. `daily_instrument_snapshot` (DailyInstrumentSnapshot)

**Schema:** `id TEXT PK`, `instrumentId TEXT` (FK → stocks.id, Cascade), `tradingDate DATETIME`, `snapshotVersion INT DEFAULT 1`, `region TEXT`, `assetType TEXT`. Eligibility fields (6 scalars + 2 arrays). Signals: `signalScore FLOAT?`, `signalDirection TEXT?`, `signalModelVersion TEXT?`. Calibration: `calibratedScore FLOAT?`, `calibrationAuthority TEXT?`. Decision: `strategyDecision TEXT?`, `rulesFired TEXT[]`. Trade plan: `stopLoss DECIMAL?`, `target DECIMAL?`, `rrRatio FLOAT?`, `planStatus TEXT?`. Context: `marketRegime TEXT?`, `breadthPct FLOAT?`, `sectorRelativeStrength FLOAT?`. Derivatives: `oiBuildup TEXT?`, `participantPositioning TEXT?`. Earnings: `earningsProximityDays INT?`. SmartMoney: `smartMoneyCode TEXT?`, `smartMoneyScore FLOAT?`. Provenance: `provenance JSON`, `assembledAt DATETIME`.  
Unique: `[instrumentId,tradingDate,snapshotVersion]`.

**Population:**
- Rows: 20,094 exact
- signalScore: 65.4% non-null (13,143/20,094)
- calibratedScore: 81.9% non-null (16,465)
- strategyDecision: 69.7% non-null (14,012)
- stopLoss: **0% non-null — 100% null** — trade plan section not yet assembled
- oiBuildup: **0% non-null — 100% null** — derivatives section not yet assembled
- marketRegime: 100% non-null (20,094) — context section well populated
- smartMoneyCode: 97.2% non-null (19,534/20,094)
- earningsProximityDays: not checked but likely sparse
- Date range: 2026-05-29 to 2026-06-12

**Readers:** `snapshot-assembler` (writer), `research-hub` (snapshot-reader), `today-trade-review`, `ai-investment-copilot`, `portfolio-intelligence`, `market-data-foundation` (serving-host)

---

### 17. `snapshot_watermarks` (SnapshotWatermark)

**Schema:** `id TEXT PK`, `region TEXT`, `assetType TEXT`, `tradingDate DATETIME`, `snapshotVersion INT`, `rowCount INT`, `assembledAt DATETIME`.  
Unique: `[region,assetType,tradingDate]`.

**Population:**
- Rows: 6 exact
- Very sparse — only marks a handful of dates as fully assembled.
- Date range: 2026-05-29 to 2026-06-12 (same window as DailyInstrumentSnapshot)

**Readers:** `snapshot-assembler` (writer + reader — gate for releasing a trading day), `research-hub`, `today-trade-review`

---

## Raw-SQL Tables

---

### 18. `fo_bhavcopy_contracts`

**Schema:** `(trading_date DATE, instrument_type TEXT, underlying TEXT, expiry_date DATE, strike_price NUMERIC, option_type TEXT)` composite PK. Columns: `settle_price NUMERIC?`, `underlying_price NUMERIC?`, `open_interest BIGINT`, `change_in_oi BIGINT`, `contracts_traded BIGINT`, `turnover_rs NUMERIC?`, `lot_size INT?`, `source TEXT`, `fetched_at TIMESTAMPTZ`.  
Indexes: `idx_fo_bhav_date_type`, `idx_fo_bhav_underlying_date`.  
Defined in: `derivatives-intelligence.fo-bhavcopy.service.ts`

**Population:**
- Rows: 370,938 exact
- Date range: 2026-06-03 to 2026-06-15 (~2 weeks)
- settle_price / underlying_price / turnover_rs / lot_size are nullable by design; most rows likely populated.

**Readers:** `derivatives-intelligence` (fo-bhavcopy.service.ts — writer/reader), `market-data-foundation` (repository.scans-screener.ts), `snapshot-assembler` (derivatives section)

---

### 19. `fo_participant_oi`

**Schema:** `(trading_date DATE, participant TEXT)` PK. Columns: `future_index_long/short`, `future_stock_long/short`, `option_index_call/put_long/short`, `option_stock_call/put_long/short`, `total_long`, `total_short` (all BIGINT). `source TEXT`, `fetched_at TIMESTAMPTZ`.  
Defined in: `derivatives-intelligence.participant-oi.service.ts`

**Population:**
- Rows: 28 exact (~6 participants × ~5 trading days)
- Date range: 2026-06-05 to 2026-06-15
- Very thin — only 2 weeks of data; all columns non-nullable.

**Readers:** `derivatives-intelligence` (participant-oi.service.ts), `market-context-intelligence` (eod-ingest.scheduler.ts)

---

### 20. `fo_option_metrics`

**Schema:** `(trading_date DATE, underlying TEXT, expiry_date DATE)` PK. Columns: `is_market_aggregate BOOL`, `pcr_oi NUMERIC?`, `total_call_oi BIGINT`, `total_put_oi BIGINT`, `max_call_oi_strike NUMERIC?`, `max_put_oi_strike NUMERIC?`, `max_pain_strike NUMERIC?`, `computed_at TIMESTAMPTZ`.  
Defined in: `derivatives-intelligence.option-metrics.service.ts`

**Population:**
- Rows: 4,641 exact
- Date range: 2026-06-05 to 2026-06-15
- pcr_oi, max_*_strike, max_pain_strike are nullable computed fields.

**Readers:** `derivatives-intelligence` (option-metrics.service.ts)

---

### 21. `fo_oi_buildup`

**Schema:** `(trading_date DATE, underlying TEXT, instrument_type TEXT)` PK. Columns: `total_oi BIGINT`, `oi_change BIGINT`, `oi_change_pct NUMERIC?`, `price NUMERIC?`, `price_change_pct NUMERIC?`, `buildup_label TEXT DEFAULT 'NEUTRAL'`, `derivatives_eligible BOOL`, `computed_at TIMESTAMPTZ`.  
Defined in: `derivatives-intelligence.oi-buildup.service.ts`

**Population:**
- Rows: 1,512 exact
- Date range: 2026-06-05 to 2026-06-15
- buildup_label / derivatives_eligible always non-null (defaults).

**Readers:** `derivatives-intelligence` (oi-buildup.service.ts), `snapshot-assembler` (oiBuildup field in DIS), `market-data-foundation` (repository.scans-screener.ts)

---

### 22. `fii_dii_snapshots`

**Schema:** `(trading_date DATE, category TEXT)` PK. Columns: `buy_value_cr NUMERIC`, `sell_value_cr NUMERIC`, `net_value_cr NUMERIC`, `source TEXT`, `fetched_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`. All non-nullable.  
Defined in: `market-context-intelligence.fii-dii.service.ts`

**Population:**
- Rows: 14 exact (~7 categories × ~2 days, or 2 categories × 7 days)
- Date range: 2026-06-05 to 2026-06-15
- Very thin — only ~1 week of FII/DII participation data.

**Readers:** `market-context-intelligence` (fii-dii.service.ts, eod-ingest.scheduler.ts), `market-intelligence` (event-feed.service.ts), `market-data-foundation` (repository.scans-screener.ts)

---

### 23. `bulk_block_deals`

**Schema:** `(trade_date DATE, symbol TEXT, client_name TEXT, deal_type TEXT, qty BIGINT)` composite PK. Columns: `name TEXT`, `buy_sell TEXT`, `avg_price NUMERIC`, `remarks TEXT?`, `source TEXT`, `fetched_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`.  
Defined in: `market-context-intelligence.bulk-block-deals.service.ts`

**Population:**
- Rows: 827 exact
- Date range: 2026-06-05 to 2026-06-15
- remarks: nullable, probably sparse.

**Readers:** `market-context-intelligence` (bulk-block-deals.service.ts), `market-intelligence` (instrument-context.service.ts), `market-data-foundation` (repository.scans-screener.ts)

---

### 24. `fno_ban_list`

**Schema:** `(ban_date DATE, symbol TEXT)` PK. Columns: `source TEXT`, `fetched_at TIMESTAMPTZ`.  
Defined in: `smart-money-intelligence.fno-ban.service.ts`

**Population:**
- Rows: 1,512 exact (one row per symbol per ban date)
- Date range: 2026-06-08 to 2026-06-16
- Fully non-nullable.

**Readers:** `smart-money-intelligence` (fno-ban.service.ts), `today-trade-review` (repository.ts, types.ts), `market-data-foundation` (repository.scans-screener.ts)

---

### 25. `us_insider_trades` (raw-SQL, lazy-created)

**Schema (from `sec-form4.service.ts` `ensureInsiderTradesTable`):**  
`id TEXT PK`, `stock_id TEXT?`, `symbol TEXT`, `cik TEXT`, `insider_name TEXT`, `insider_title TEXT?`, `transaction_code TEXT`, `transaction_date DATE`, `shares NUMERIC?`, `price_per_share NUMERIC?`, `value NUMERIC?`, `accession TEXT?`, `source TEXT DEFAULT 'SEC_FORM4'`, `ingested_at TIMESTAMPTZ`.  
Index: `idx_us_insider_symbol_date (symbol, transaction_date DESC)`.  
Table is created with `CREATE TABLE IF NOT EXISTS` on first call to `ensureInsiderTradesTable()`.

**Population:**
- Table does **not exist** in the live DB. The SEC Form 4 ingest service (`sec-form4.service.ts`) has never been run against this DB (or was cleared). The `us-institutional.repository.ts` calls `ensureInsiderTradesTable()` lazily — the table will be created on the first read/ingest invocation.

**Readers (once created):** `market-data-foundation` (us-institutional.repository.ts — `getInsiderTradesForSymbol`, `getSmartMoneySummaryForSymbol`)

---

### 26. `us_institutional_holdings` (raw-SQL, lazy-created)

**Schema (from `sec-13f.service.ts` `ensureInstitutionalHoldingsTable`):**  
`id TEXT PK`, `stock_id TEXT?`, `symbol TEXT?`, `cusip TEXT`, `quarter TEXT`, `total_value NUMERIC DEFAULT 0`, `total_shares NUMERIC DEFAULT 0`, `holder_count INT DEFAULT 0`, `top_holders JSONB?`, `source TEXT DEFAULT 'SEC_13F'`, `ingested_at TIMESTAMPTZ`.  
Index: `idx_us_inst_symbol_quarter (symbol, quarter)`.  
Table is created with `CREATE TABLE IF NOT EXISTS` on first call to `ensureInstitutionalHoldingsTable()`.

**Population:**
- Table does **not exist** in the live DB. The SEC 13F ingest service has never been run. Lazy-created on first invocation.

**Readers (once created):** `market-data-foundation` (us-institutional.repository.ts — `getInstitutionalHoldingsForSymbol`, `getSmartMoneySummaryForSymbol`)

---

## Key Findings Summary

### Empty / Non-Existent Tables (highest gap priority)
1. **`instrument_exchange_identities`** — 0 rows. Schema defined, indexed, referenced by catalog-queries.ts but never populated. NSE identity enrichment step appears skipped.
2. **`fx_rates`** — 0 rows. No FX rate data ingested at all. Any multi-currency portfolio math relying on this table is broken.
3. **`us_insider_trades`** — table does not exist. SEC Form 4 ingest never run.
4. **`us_institutional_holdings`** — table does not exist. SEC 13F ingest never run.

### Thin / Very Short Window Tables
5. **`fo_participant_oi`** — 28 rows, only 2026-06-05 to 06-15. Participant-level OI useful for FII/DII futures analysis but very sparse.
6. **`fii_dii_snapshots`** — 14 rows, ~1 week only.
7. **`snapshot_watermarks`** — 6 rows covering 2026-05-29 to 2026-06-12 (daily snapshots only since late May).
8. **`market_data_repair_runs`** — 28 rows (admin log, expected to be small).

### Rich / Well-Populated Tables
- **`price_ticks`** — 39.8M rows, US+IN+EU, long history to 1970 (US); solid price history coverage.
- **`market_delivery_snapshots`** — 211K rows, 5 months Jan–Jun 2026, 100% field coverage.
- **`corporate_actions`** — 426K rows, predominantly dividend records.
- **`fo_bhavcopy_contracts`** — 371K rows, 2 weeks of NSE FnO bhavcopy (dense intraday contract data).
- **`instrument_eligibility`** — 10K rows, actively computed last 2.5 weeks.
- **`daily_instrument_snapshot`** — 20K rows, assembled daily since May 29.

### Notable Null Patterns in Populated Tables
- **`stocks.sector/industry`** — ~78% null (only IN instruments have sector from NSE; US sector backfill not complete).
- **`stocks.marketCap`** — ~75% null.
- **`stocks.lastSuccessfulDataLoadTimestamp`** — ~78% null (only recently synced instruments).
- **`fundamentals.peRatio`** — ~94% null (not sourced from any provider systematically).
- **`fundamentals.officialResultDate`** — ~72% null (only IN stocks with NSE board-meeting records).
- **`daily_instrument_snapshot.stopLoss / target / rrRatio`** — 100% null (trade plan section not assembled).
- **`daily_instrument_snapshot.oiBuildup / participantPositioning`** — 100% null (derivatives section not wired into assembler).
- **`market_data_repair_states.resolvedAt`** — 100% null (no repair cycles have been closed).
