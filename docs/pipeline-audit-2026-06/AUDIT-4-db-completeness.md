# AUDIT-4: Database Completeness & Pipeline Health
**Date:** 2026-06-06  
**Method:** Read-only Postgres queries (docker exec psql)  
**Universe baseline:** 2,937 active STOCK instruments (assetType=STOCK, isActive=true, instrumentSegment=CASH)

---

## 1. Table Inventory & Row Counts

| Table | Total Rows | Date Column | Min Date | Max Date | Distinct Dates |
|---|---|---|---|---|---|
| price_ticks | 5,512,340 | timestamp | 2014-01-01 | 2026-06-05 | 3,080 |
| market_data_sync_states | 16,128 | updatedAt | — | 2026-06-06 | — |
| corporate_actions | 15,233 | effectiveDate | 2014-01-06 | 2026-07-31 | — |
| fundamentals | 14,427 | periodEndDate | 2018-03-31 | 2026-03-31 | 30 |
| data_quality_snapshots | 12,892 | snapshotDate | 2026-04-27 | 2026-06-05 | 13 |
| smart_money_context_snapshots | 105,370 | snapshotDate | 2017-02-23 | 2026-06-05 | 45 |
| signal_results | 26,442 | generatedDate | 2019-03-01 | 2026-06-06 | 31 |
| signal_outcomes | 74,260 | signalGeneratedDate | 2019-03-01 | 2025-09-01 | quarterly only |
| signal_calibration_results | 3,313 | generatedAt | 2026-06-04 | 2026-06-06 | 2 |
| earnings_intelligence_snapshots | 2,534 | snapshotDate | 2026-05-29 | 2026-06-05 | 4 |
| market_delivery_snapshots | 190,306 | tradingDate | 2026-01-14 | 2026-06-01 | 90 |
| latest_prices | 3,586 | timestamp | 2019-06-27 | 2026-06-05 | 502 |
| market_context_snapshots | 128 | snapshotDate | 2019-01-01 | 2026-06-06 | 116 |
| sector_context_snapshots | 1,154 | snapshotDate | 2019-01-01 | 2026-06-06 | 116 |
| sector_snapshots | 48 | snapshotDate | 2026-06-02 | 2026-06-06 | 3 |
| market_pulse_snapshots | 3 | snapshotDate | 2026-06-01 | 2026-06-05 | 3 |
| stock_interest_snapshots | 6,710 | snapshotDate | — | 2026-06-02 | — |
| fii_dii_snapshots | 2 | trading_date | 2026-06-05 | 2026-06-05 | 1 |
| fno_ban_list | 2 | ban_date | 2026-06-08 | 2026-06-08 | 1 |
| bulk_block_deals | 115 | trade_date | 2026-06-05 | 2026-06-05 | 1 |
| pipeline_runs | 923 | startedAt | 2026-05-25 | 2026-10-13 | — |
| pipeline_stage_runs | 34,337 | startedAt | 2026-05-25 | 2026-10-13 | — |
| today_review_candidates | 479 | createdAt | 2026-05-11 | 2026-06-06 | 11 |
| trade_plan_results | 878 | generatedDate | 2026-05-06 | 2026-06-04 | — |
| signal_position_ledger_entries | 39 | — | — | — | — |
| data_quality_evaluations | 3,456 | evaluatedAt | 2026-05-03 | 2026-06-06 | — |
| instrument_exchange_identities | 0 | — | — | — | EMPTY |
| signal_generation_runs | 0 | — | — | — | EMPTY |
| market_data_repair_runs | 0 | — | — | — | EMPTY |
| country_context_snapshots | 0 | — | — | — | EMPTY |
| fx_rates | 0 | — | — | — | EMPTY |

---

## 2. TABLE-HEALTH Matrix (Universe = 2,937 active STOCK instruments)

| Table | Rows | Latest Date | Coverage on Latest Date | vs Universe (2,937) | Gaps in Last 14d | Dup Risk |
|---|---|---|---|---|---|---|
| **signal_results** | 26,442 | 2026-06-06 | **2,044** instruments | **70% (893 missing)** | YES — only 4 dates: 06-01(2), 06-04(1021), 06-05(1775), 06-06(2044) | None |
| **data_quality_snapshots** | 12,892 | 2026-06-05 | **2,333** instruments | **79% (604 missing)** | YES — erratic: 50 on 06-04, 2333 on 06-05; gaps 05-24 to 05-25 | None |
| **smart_money_context_snapshots** | 105,370 | 2026-06-05 | **2,326** instruments | **79% (611 missing)** | YES — gaps: 05-21 to 05-24 missing; 05-27 only 115 stocks | **HIGH — 34,166 duplicate (instrument,date) pairs** |
| **earnings_intelligence_snapshots** | 2,534 | 2026-06-05 | **2,267** instruments | **77% (670 missing)** | YES — only 4 dates total; 05-29(3), 06-01(1), 06-02(263), 06-05(2267) | None |
| **price_ticks (NSE)** | ~5.5M | 2026-06-05 | **2,660** symbols | **91% of 2,937; 277 missing** | GAP: 05-28 only 3 symbols (should be ~2,660) | — |
| **latest_prices** | 3,586 | 2026-06-05 | 2,659 at max date | 922 symbols stale (pre-Jun) | — | — |
| **fundamentals** | 14,427 | 2026-03-31 | **2,267** distinct stockIds | **77% (670 missing)** | Not a daily table; latest period 2026-03-31 | — |
| **market_delivery_snapshots** | 190,306 | 2026-06-01 | **2,134** stocks | **73% (803 missing)** | GAP: no data 2026-06-02 through 2026-06-05 (4 days missing) | — |
| **market_pulse_snapshots** | 3 | 2026-06-05 | 1 row | N/A (aggregate) | ALWAYS PARTIAL (stale sources flagged) | — |
| **sector_snapshots** | 48 | 2026-06-06 | 16 sectors | N/A | Only 3 distinct dates (06-02, 06-03, 06-06) | — |
| **fii_dii_snapshots** | 2 | 2026-06-05 | 2 rows (FII, DII) | N/A | Extremely thin — only 1 date ever | — |
| **fno_ban_list** | 2 | 2026-06-08 | 2 rows | N/A | Only 1 date | — |
| **signal_position_ledger_entries** | 39 | — | 39 instruments | **1% of universe** | — | — |
| **NSE_INDEX price_ticks** | — | 2026-06-01 | 138 symbols | — | Stale: no index prices 2026-06-02 to 06-05 | — |
| **stock_interest_snapshots** | 6,710 | 2026-06-02 | — | — | Stale (4 days behind) | — |
| **today_review_candidates** | 479 | 2026-06-06 | **40** candidates | **1.4%** (capped at 40/run) | 3 dates missing in last 14d | — |

---

## 3. Pipeline Stage Status Summary

### 3a. Stage Run Counts by Status (excluding HISTORICAL_EXCHANGE_BACKFILL)

| Stage | COMPLETED | PARTIAL | FAILED | RUNNING (stale) | SKIPPED |
|---|---|---|---|---|---|
| STOCK_INTEREST_REFRESH | 245 | — | 1 | — | — |
| MARKET_DATA | 33 | 15 | **22** | **7 stale** | — |
| DATA_QUALITY | 39 | — | **12** | **2 stale** | — |
| CONTEXT_SNAPSHOTS | 28 | 2 | — | — | — |
| SMART_MONEY | 28 | 2 | — | — | — |
| MARKET_CONTEXT | 30 | — | — | — | — |
| STRATEGY_DECISION | 27 | — | 1 | **2 stale** | — |
| RESEARCH_PROJECTION | 26 | — | 1 | — | — |
| RAW_SIGNALS | 6 | 26 | — | **3 stale** | 2 |
| SIGNAL_QUALITY | 11 | 17 | — | — | 2 |
| SIGNAL_CALIBRATION | 11 | 20 | 1 | **1 stale** | — |
| TODAY_REVIEW | — | 24 | 1 | **1 stale** | — |
| EARNINGS_INTELLIGENCE_REFRESH | 1 | **130** | 2 | — | — |
| SECTOR_INTELLIGENCE_REFRESH | — | **12** | — | — | — |
| MARKET_PULSE | — | **8** | — | — | — |
| SIGNAL_POSITION_LEDGER | — | 8 | 1 | — | 2 |
| MARKET_CONTEXT_SNAPSHOT_REFRESH | 2 | — | — | — | — |

### 3b. FAILED Stages — Root-Cause Error Text

| Stage | Date | Error |
|---|---|---|
| DATA_QUALITY | 2026-05-27, 05-29, 06-02 (×8) | `priceTick.findMany() — Failed to convert rust String into napi string` |
| EARNINGS_INTELLIGENCE_REFRESH | 2026-06-02 (×2) | `FATAL: sorry, too many clients already` (Postgres connection pool exhausted) |
| STOCK_INTEREST_REFRESH | 2026-06-02 | `FATAL: sorry, too many clients already` |
| MARKET_DATA | 2026-06-02 (×5) | `value?.trim is not a function`; `HTTP 404`; `Marked failed by Codex E2E cleanup (stale RUNNING ledger)` |
| SIGNAL_CALIBRATION | 2026-06-01 | `Validation harness interrupted startup downstream stage` |
| SIGNAL_POSITION_LEDGER | 2026-06-01 | `Validation harness timed out during downstream no-op rerun probe` |
| RESEARCH_PROJECTION | 2026-06-01 | `this.calibrationService.health is not a function` |
| STRATEGY_DECISION | 2026-05-27 | `Marked failed by Codex E2E cleanup (stale RUNNING ledger)` |
| TODAY_REVIEW | 2026-05-27 | `Marked failed by Codex E2E cleanup (stale RUNNING ledger)` |

### 3c. PARTIAL Stages — Key Patterns

| Stage | Pattern |
|---|---|
| EARNINGS_INTELLIGENCE_REFRESH | 130 PARTIAL runs on 2026-06-02 alone; 126 sub-runs, only 21,100 of 362,018 processed (5.8% done); 19,945 skipped. Near-total skip. |
| RAW_SIGNALS | Consistently PARTIAL: 289 skipped per run (≈12% of universe). Never COMPLETED on full universe run since May-26. |
| MARKET_PULSE | Always PARTIAL; warnings: `INDEX stale at 2026-06-01` and `DELIVERY stale at 2026-06-01` (source data not ingesting through to 06-05). |
| SIGNAL_CALIBRATION | 20 PARTIAL; only 2 dates of results exist (06-04: 1,136 instruments, 06-06: 2,046). No daily coverage. |
| TODAY_REVIEW | Always PARTIAL; top-N capped at 40 candidates per run (pipeline cap). |
| SIGNAL_POSITION_LEDGER | 2,906–2,907 skipped per run (>99% skipped); only 5 not-skipped → 39 total entries in the ledger. |

### 3d. Stale RUNNING Runs (Leaked State — Never Completed)
- **19 pipeline_runs stuck in RUNNING** status from 2026-06-01 to 2026-06-05 (including 3 `market-data-historical-exchange-backfill` since 2026-06-01 with partial progress)
- **16 pipeline_stage_runs stuck in RUNNING** for stages: MARKET_DATA (7), DATA_QUALITY (2), RAW_SIGNALS (3), SIGNAL_CALIBRATION (1), STRATEGY_DECISION (2), TODAY_REVIEW (1)
- These leaked RUNNING records block idempotency gates on re-runs

---

## 4. Incremental Gap Evidence (Last 14 Days)

### signal_results — dates present in last 14d (2026-05-24 to 2026-06-06):
| Date | Stocks |
|---|---|
| 2026-06-01 | **2** (effectively empty) |
| 2026-06-04 | 1,021 |
| 2026-06-05 | 1,775 |
| 2026-06-06 | 2,044 |
| **MISSING:** 2026-05-24 to 05-31 (7 trading days), 2026-06-02, 2026-06-03 | — |

**8 of 12 trading days in last 14 calendar days have NO signal_results row (or 2 rows).**

### data_quality_snapshots — dates present in last 14d:
| Date | Stocks |
|---|---|
| 2026-05-25 | 606 |
| 2026-05-26 | 185 |
| 2026-05-27 | 114 |
| 2026-05-29 | 2,388 |
| 2026-06-01 | 2,339 |
| 2026-06-02 | 2,344 |
| 2026-06-03 | 2,333 |
| 2026-06-04 | **50** (partial run) |
| 2026-06-05 | 2,333 |
| **MISSING:** 2026-05-24, 2026-05-28 | — |

2 missing dates; 3 partial dates (50–606 stocks instead of ~2,333).

### price_ticks (NSE) — anomaly:
- 2026-05-28: only **3 symbols** (should be ~2,660). Confirmed 1-day gap/failed load.
- NSE_INDEX: max date **2026-06-01** — 4 trading days stale (no index prices for 06-02 to 06-05).

### market_delivery_snapshots:
- Max date **2026-06-01**. No delivery data for 2026-06-02 through 2026-06-05 (4 days gap).
- This is why market_pulse_snapshots is always PARTIAL (DELIVERY source stale).

### earnings_intelligence_snapshots:
- Only **4 distinct dates** total in the table: 05-29(3 stocks), 06-01(1 stock), 06-02(263 stocks), 06-05(2,267 stocks).
- 130 PARTIAL pipeline runs on 06-02 processed only 21k of 362k stock-runs (5.8%).

---

## 5. Duplicate / Idempotency Evidence

| Table | Duplicate (instrument, date) Pairs | Severity |
|---|---|---|
| smart_money_context_snapshots | **34,166 duplicate pairs** | CRITICAL |
| signal_results | 0 | OK |
| data_quality_snapshots | 0 | OK |
| earnings_intelligence_snapshots | 0 | OK |

The `smart_money_context_snapshots` table has 34,166 instrument-date combinations with 3 rows each (triplicated). This is evidence of broken upsert/idempotency: each pipeline run inserts new rows instead of upserting. With 105,370 total rows vs ~45 distinct dates × ~2,600 instruments = ~117,000 expected, roughly 1/3 of rows are exact duplicates at the (instrument, date) level.

---

## 6. Coverage vs Universe — Ranked Problems

### #1 CRITICAL — signal_results: 8/12 trading days missing in last 14d
- Latest date: 2,044 / 2,937 = **70% coverage**
- RAW_SIGNALS stage consistently PARTIAL with ~289 skipped per run
- Multiple stale RUNNING stage entries block re-runs
- Root cause: stale RUNNING ledger + connection pool exhaustion on 06-02 caused cascading failures

### #2 CRITICAL — smart_money_context_snapshots: 34,166 duplicate rows (broken upsert)
- 105,370 rows but ~34k are triplicates
- Latest date coverage: 2,326 / 2,937 = **79%**
- Gaps: 05-21 to 05-24 missing entirely; 05-27 only 115 stocks

### #3 HIGH — market_delivery_snapshots: 4-day gap (2026-06-02 to 06-05)
- Latest date stuck at 2026-06-01
- Latest coverage: 2,134 / 2,937 = **73%** (also partial load on existing dates)
- This cascades: market_pulse_snapshots always PARTIAL because DELIVERY source is stale
- NSE_INDEX price_ticks also stale at 2026-06-01

### #4 HIGH — DATA_QUALITY stage failing repeatedly (12 FAILEDs)
- Error: `priceTick.findMany() — Failed to convert rust String into napi string` (Prisma/napi type marshalling bug on large result sets)
- Affected dates: 05-27, 05-29, 06-02 (8 failures on 06-02 alone)
- Result: data_quality_snapshots has 50 stocks on 06-04 and partial counts on 05-25/26/27

### #5 HIGH — EARNINGS_INTELLIGENCE_REFRESH: 130 PARTIAL on 2026-06-02, effectively only 5.8% processed
- Also 2 FAILED runs (connection pool exhausted: `FATAL: too many clients already`)
- Table has only 4 distinct dates; latest full run 2026-06-05 has 2,267/2,937 = **77%**

### #6 HIGH — Connection pool exhaustion on 2026-06-02
- 3 distinct stages failed: EARNINGS_INTELLIGENCE_REFRESH, STOCK_INTEREST_REFRESH, DATA_QUALITY
- Error: `FATAL: sorry, too many clients already` — concurrent pipeline runs exhausting Postgres connection pool
- This was a cascade failure day affecting signal generation downstream

### #7 MEDIUM — signal_calibration_results: only 2 dates of data
- 2026-06-04 (1,136 instruments) and 2026-06-06 (2,046 instruments)
- Coverage: 2,046 / 2,937 = **70%**; no daily calibration snapshots

### #8 MEDIUM — latest_prices: 922 symbols stale (pre-June)
- 3,586 total symbols; 2,659 at 2026-06-05; 922 have older timestamps
- These stale prices contaminate signal generation for those instruments

### #9 MEDIUM — fii_dii_snapshots: only 1 date in entire table (2026-06-05)
- Institutional flow data essentially absent; not ingesting historically

### #10 MEDIUM — signal_position_ledger_entries: 39 rows (1.3% of universe)
- SIGNAL_POSITION_LEDGER skips 2,906/2,907 per run (>99% skip rate)
- Only 39 active position entries — effectively empty for any portfolio operation

### #11 LOW — today_review_candidates: hard-capped at 40 per run
- Consistently 40 candidates per day regardless of universe size
- Missing 3 dates in last 14d (05-28, 05-30, 06-01 not present as trading days)

### #12 LOW — market_pulse_snapshots: always PARTIAL (3 rows total)
- PARTIAL on all 3 runs due to stale INDEX and DELIVERY source segments
- Only covers 2026-06-01 to 06-05 with 3 snapshots

---

## 7. Tables That Are Effectively Empty or Never Populated
- `instrument_exchange_identities`: 0 rows (EMPTY — schema exists but never populated)
- `signal_generation_runs`: 0 rows (EMPTY)
- `market_data_repair_runs` / `market_data_repair_attempts` / `market_data_repair_states`: 0 rows
- `country_context_snapshots`: 0 rows
- `fx_rates`: 0 rows
- `fii_dii_snapshots`: 2 rows (1 date only — functionally empty)
- `backtest_runs`: 0 rows (backtests not persisted to DB)

---

## 8. Pipeline Runs Overall Health

| Status | Count |
|---|---|
| COMPLETED | 568 |
| PARTIAL | 276 |
| FAILED | 44 |
| RUNNING (stale) | 19 |
| CANCELLED | 7 |
| SKIPPED | 6 |
| BLOCKED | 3 |

- **44 FAILED pipeline runs** (all `market-intelligence` pipelineKey), all on 2026-06-01 and 2026-06-02
- **19 RUNNING (leaked)** — these are stale RUNNING records that were never cleaned up, including 3 historical backfill runs from 2026-06-01 (261-262 of ~262 stocks processed but stuck RUNNING)
- **1 anomalous pipeline_run with startedAt = 2026-10-13** (future date — possible clock skew or test artifact)
- 276 PARTIAL runs indicate the pipeline consistently finishes but with skipped/incomplete stages

---

*Audit performed 2026-06-06. Read-only — no data was modified.*
