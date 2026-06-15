# Frontend Admin Reconnaissance — Wave 1 (Operator/Admin Set 1)

**Date:** 2026-06-15  
**Server:** http://localhost:5173 (shared dev FE, port 5173)  
**Market scope at time of session:** IN / STOCK (India equities)  
**Method:** Browser automation via preview tools — read-only. No destructive buttons clicked.

---

## 1. Market Data Foundation — `/admin/market-data-foundation`

**Route file:** `frontend/src/features/market-data-foundation/routes.tsx`  
**Actual path used:** `/admin/market-data-foundation` (the `/market-data-foundation` bare path also exists and is the same component)

### Purpose
Admin & maintenance console for instrument catalog, historical backfill, source-file evidence, and data-health monitoring.

### UI Elements
- Page header: "Market Data Foundation" with "Add Instrument" CTA button (navigates to `/admin/market-data-foundation/add`)
- Region note: "Market is controlled by the global header selector: **IN** (IN)" — region changes propagate from the global header dropdown
- Three tabs: **Catalog**, **Import & Backfill**, **Data Health**

#### Tab: Catalog (default)
- Filter bar: text search (symbol/company), Exchange combobox, F&O Eligible combobox, SME/Segment combobox, Refresh button
- Sortable table columns: Symbol, Company, ISIN, Exchange, Asset Type, Segment/Class, F&O Eligible, Data Health, Data Through, Actions
- Data Through column shows "Catalog row last changed" timestamps, not actual price data-through date for most rows
- Data Health column shows composite text e.g. "Metadata complete Strict universe state Partial"
- Actions column: "Inspect instrument metadata" button (per-row drilldown)
- Pagination: 25 rows per page

#### Tab: Import & Backfill
- Section: **Historical Exchange Candle Backfill** — radio group for "Backfill mode", date-range pickers (From/To), "Run Backfill" button. SKIPPED (mutating — triggers ingest).
- Section: **Manual Verified Fundamentals** — form fields: Stock ID (text), Period (Annual/Quarterly dropdown), Period End (date picker), EPS, P/E, Market Cap, Source Note, Source URL, Validated By. "Import Fundamentals" button. SKIPPED (form submission).
- Section: **Source File Evidence** — "Latest 10" label, "Refresh Evidence" button, table showing SourceFileImport evidence rows

#### Tab: Data Health
- Summary cards shown:
  - **Stored Market Data:** 2,937 instruments — IN / STOCK; Latest timestamp: 6/15/2026 2:00:00 AM; Status: COMPLETE
  - **Latest Exchange Evidence:** date 2026-06-15; file `ind_close_all_15062026.csv`; NSE SECTOR_INDEX; Accepted 25, Rejected 0
  - **Scheduler:** Enabled; Last checked 6/15/2026 5:34 PM; Data through: 2026-06-15; Next run: 6/15/2026 5:45 PM; Status: IDLE; Sub-status: `TODAY_STORED_PENDING_FINAL_CONFIRMATION` (truncated in UI — text overflows chip)
- **Readiness Snapshot:** Review ready 0, Price ready 0, Catalog only 0, Trusted mode UNKNOWN, Review blockers 4 — all zeros except blockers: data appears stale or not yet evaluated for this session

### API Calls (Catalog / Data Health load)
- `GET /api/v1/instruments?page=1&pageSize=25&sortBy=symbol&sortOrder=asc&region=IN&assetType=STOCK` → 200
- `GET /api/v1/market-data/scheduler/status?region=IN&assetType=STOCK` → 200

### Gaps / Issues
- **Data Health > Readiness Snapshot shows all zeros** (Review ready 0, Price ready 0, Catalog only 0, Trusted mode UNKNOWN) — may be stale snapshot state; the Data Health tab's "Refresh" button would re-materialize but was not clicked.
- **Scheduler sub-status chip truncation:** `TODAY_STORED_PENDING_FINAL_CONFIRMATION` is clipped with "…" inside the chip — text too long for the chip width.
- The "Data Through" column in the Catalog tab shows catalog row timestamps, not the instrument's actual OHLCV data-through date — potentially misleading column header.
- Import & Backfill tab click via preview_click did not register (tab stayed on Catalog) — had to use JS eval to programmatically click. This may indicate the MUI Tab click target area is narrow or the accessibility selector is off.
- Console warnings: repeated `No routes matched location "/derivatives-intelligence"` — the `derivatives-intelligence` route is not registered in the router, causing persistent route-not-found warnings on every page load.

---

## 2. Pipeline Ops — `/admin/pipeline-ops`

**Route file:** `frontend/src/features/pipeline-ops/routes.tsx`  
**Actual path:** `/admin/pipeline-ops`

### Purpose
Monitor and manually trigger the daily market-intelligence pipeline. Market-data backfill lives in Market Data Ops.

### UI Elements
- Header: "Daily Pipeline Ops" with description
- Controls: "Active only" checkbox, **"Run Daily Pipeline" button** (SKIPPED — mutating), "Refresh" button
- Pipeline summary bar: Scope IN / STOCK; Active: IDLE; Last: COMPLETED (Jun 15 5:37 PM); Data through: N/A; Progress: 548/548 (100%)
- Expandable table: columns — expand toggle, Module, Operation, Status, Progress, Last Run, Counts, Evidence
- "View source" links per row (non-mutating — not clicked but present)

### Pipeline Stage Inventory (full run, Jun 15 2026)
| Module Code | Display Name | Status |
|---|---|---|
| MARKET_DATA | Market Data | PARTIAL |
| MARKET_SCAN_REFRESH | **Unmapped Module** | COMPLETED |
| DATA_QUALITY | Data Quality | COMPLETED |
| RAW_SIGNALS | Signals | PARTIAL |
| SIGNAL_CALIBRATION | Signal Calibration | PARTIAL |
| CONTEXT_SNAPSHOTS | Context Snapshots | COMPLETED |
| EARNINGS_INTELLIGENCE_REFRESH | Earnings Intelligence | PARTIAL |
| MARKET_CONTEXT | Market Context | COMPLETED |
| MARKET_CONTEXT_SNAPSHOT_REFRESH | **Unmapped Module** | COMPLETED |
| MARKET_PULSE | Market Pulse | Not yet active |
| SIGNAL_QUALITY | Signal Quality | COMPLETED |
| SMART_MONEY | Smart Money | COMPLETED |
| STRATEGY_DECISION | Strategy | COMPLETED |
| BACKTEST_PROOF | Backtests | Not yet active |
| RESEARCH_PROJECTION | Research | COMPLETED |
| TODAY_REVIEW | Today Review | COMPLETED |
| SIGNAL_POSITION_LEDGER | Signal Position Ledger | COMPLETED |
| SECTOR_INTELLIGENCE_REFRESH | Sector Intelligence | COMPLETED |
| MARKET_PULSE_REFRESH | **Unmapped Module** | COMPLETED |
| STOCK_INTEREST_REFRESH | Stock Interest | COMPLETED |
| WORKBENCH_REFRESH | **Unmapped Module** | ABANDONED |
| SNAPSHOT_ASSEMBLER | **Unmapped Module** | FAILED |

### API Calls
- `GET /api/v1/pipeline/status?timeframe=1d&pipelineKey=market-intelligence&limit=100&region=IN&assetType=STOCK` → 200

### Gaps / Issues
- **SNAPSHOT_ASSEMBLER stage: FAILED** — this is the final assembler; its failure would explain stale/blank snapshots on trader-facing pages. High severity.
- **WORKBENCH_REFRESH stage: ABANDONED** — workbench page data may be stale.
- **MARKET_DATA stage: PARTIAL** — EOD data load shows PARTIAL with counts Ok 2661 / Partial 1 / Fail 0. Last run was Jun 11, data through Jun 11, but the page-level "data through" shows N/A.
- **RAW_SIGNALS, SIGNAL_CALIBRATION, EARNINGS_INTELLIGENCE_REFRESH: PARTIAL** — partial stages in the signal pipeline; causes the 0-count signal tabs in Signal Generation.
- **4 modules show as "Unmapped Module":** `MARKET_SCAN_REFRESH`, `MARKET_CONTEXT_SNAPSHOT_REFRESH`, `MARKET_PULSE_REFRESH`, `WORKBENCH_REFRESH` — these stage codes have no display-name mapping in the UI. The pipeline table shows "Unmapped Module" as the human-readable name, which is a display gap.
- **MARKET_PULSE and BACKTEST_PROOF: "Not yet active"** — placeholder stages, not wired.
- MARKET_DATA evidence note: `adapter: MarketDataFoundationService.syncScheduledRegion | changedInstrumentCount: 0 | downstreamInstrumentCount: 2329 | rowsInserted: 0 | rowsUpdated: 0` — zero rows inserted/updated on last run.

---

## 3. Signal Generation Engine — `/admin/signals`

**Route file:** `frontend/src/features/signal-generation-engine/routes.tsx`  
**Actual path:** `/admin/signals`

### Purpose
Admin view of raw signal generation output — bullish/bearish/neutral confirmation inputs with strategy match context.

### UI Elements
- Header: "Signal Generation Engine"; subtitle: "Raw bullish, neutral, and bearish confirmation inputs with Strategy Framework match context."
- Controls: checkboxes for "Use data quality filter", "Attach strategy matches", "Show strategy context"; **"Run Signals" button** (SKIPPED — mutating); links to "View Signal Quality Lab" and "View Strategy Decisions"
- Latest Run Audit card: IN / STOCK; COMPLETED; Model: signal-engine-v4; Ruleset: signal-engine-v4; Source 6/15/2026
  - Batch: 12, Generated: 7, Updated: 0, No-op: 0, Skipped: 5, Failed: 0, DQ excluded: 5, Missing DQ: 0, Duration ms: 126
- Alert banner: "Raw signals are confirmation inputs. Use Strategy Decision for candidate review and risk context."
- Current Market Regime card: NEUTRAL; Score 59; PARTIAL; reason: "62.7% of liquid-universe instruments above SMA50, 54.9% above SMA200, Nifty 50 63-bar trend score 46.6"
- Signal Track Record collapsible: 588 directional samples
- Tabs: **Bullish (0)**, **Bearish (0)**, **Neutral (0)**, **Momentum Leaders**, **Recent (0)**, **Screener**
- Table columns: Symbol, Company, Raw Score, Calibrated, RS, Raw Direction, Confidence, Audit, Price, Daily, Top Reason, Strategy Matches, Blocked Strategies, Generated, Actions

### API Calls
- Signal Generation page API calls not captured in network log (navigation happened before the second network snapshot). Based on page content, the page reads from persisted snapshots (consistent with persisted-read architecture).

### Gaps / Issues
- **All signal tabs show 0 counts (Bullish 0, Bearish 0, Neutral 0, Recent 0)** and the table shows: "No signals match this view for IN / STOCK." — This is consistent with the RAW_SIGNALS pipeline stage being PARTIAL and SNAPSHOT_ASSEMBLER FAILED.
- The run audit shows only 7 signals generated (Batch: 12, Generated: 7, Skipped: 5, DQ excluded: 5) — very small output, possibly due to data quality gate excluding most instruments.
- "Momentum Leaders" and "Screener" tabs have no count badges — unclear if they have data or are also empty.
- PARTIAL pipeline status upstream (MARKET_DATA, RAW_SIGNALS) directly explains the zero-signal display.

---

## 4. Signal Quality Lab — `/admin/signals/quality`

**Route file:** `frontend/src/features/signal-quality-lab/routes.tsx`  
**Actual path:** `/admin/signals/quality`

### Purpose
Historical signal measurement — outcomes describe past forward returns (not predictions). Operator view for diagnosing signal quality across time horizons.

### UI Elements
- Header: "Signal Quality Lab"; subtitle: "Historical signal measurement. Outcomes describe past forward returns, not predictions or trading advice."
- Controls: Horizon combobox (default 20D; options not inspected), link to "Calibration Engine", **"Refresh Diagnostics" button** (SKIPPED — mutating)
- Alert: "by-data-quality grouping is not available in the persisted read path; run recalculate to refresh."
- Filter row: Readiness combobox, Coverage combobox, Liquidity combobox, Model version text input, "Only signal-ready" checkbox, "Exclude poor quality" checkbox
- Tabs: **Overview**, **Performance**, **Noise (0)**, **Instrument history**

#### Overview tab (default)
Summary stats displayed:
- Selected Horizon: 20D
- Evidence Usability: USABLE
- Total Signals: 1,713
- Eligible Signals: 1,713
- Mature / Evaluable: 583
- Insufficient Future Rows: 0
- Missing Price History: 0
- Bullish Win Rate: 56.46%
- Bearish Win Rate: 50.64%
- Average 5D Return: — (dash — not available)
- Average 20D Return: 3.04%
- Noisy Signals: 0
- Data Status: COMPLETE

### API Calls
- Not captured in current network snapshots; page loaded from persisted snapshots (consistent with persisted-read architecture). Based on module structure: likely `GET /api/v1/signals/quality/...` or similar.

### Gaps / Issues
- **Average 5D Return shows "—" (dash)** — the 5D horizon metric is missing or not computed, only 20D return is available.
- Alert "by-data-quality grouping is not available in the persisted read path" — feature gap: DQ grouping requires a live recalculate action, not available from the persisted read. This is noted inline but may surprise operators who expect it to auto-populate.
- **Noise (0) tab** — zero noisy signals; either correct or an artifact of the limited signal set.
- Instrument history tab — not exercised (would require per-symbol drill-down).

---

## 5. Signal Calibration Engine — `/admin/signals/calibration`

**Route file:** `frontend/src/features/signal-calibration-engine/routes.tsx`  
**Actual path:** `/admin/signals/calibration`

### Purpose
Explainable historical calibration of raw signal scores. Shows per-instrument calibration adjustments, confidence, and evidence basis.

### UI Elements
- Header: "Signal Calibration Engine"; subtitle: "Explainable historical calibration. Showing calibration for IN / STOCK."
- Controls: link to "Signal Quality Lab", **"Run Calibration" button** (SKIPPED — mutating)
- Alert 1 (warning): "Calibration Evidence Warnings — 4 visible rows have warnings or data gaps. Use filters or CSV export for row-level evidence."
- Alert 2 (info): "Calibration uses historical evidence and context snapshots for research support only."
- Summary stat cards:
  - Selected Horizon: 20D
  - Readiness: USABLE
  - Downstream Influence: NORMAL
  - Evidence Basis: **MISSING_SIGNAL_QUALITY_EVIDENCE**
  - Evidence Through: — (dash)
  - Next Evaluable Date: — (dash)
  - Usable on Page: 25
  - Normal Influence on Page: 25
  - Calibrated Signals: 2,059
  - Page Avg Delta: 11.1
  - Applied on Page: 25
  - Passthrough on Page: 0
  - Limited Evidence on Page: 0
  - Unavailable Evidence on Page: 0
- Table columns: Symbol, Company, Raw Score, Calibrated, Score Adjustment, Direction, Sample Confidence, Readiness, Influence, Evidence, Samples, Data Gaps, Calibrated At, Evidence Through, Actions
- Filter inputs present (3 input controls detected via DOM, unlabeled)

### API Calls
- `GET /api/v1/signals/calibration/model?region=IN&assetType=STOCK` → 200
- `GET /api/v1/signals/calibration/top?region=IN&assetType=STOCK&horizon=20D&limit=25&offset=0&sortBy=calibratedScore&sortDirection=desc` → 200

### Gaps / Issues
- **Evidence Basis: `MISSING_SIGNAL_QUALITY_EVIDENCE`** — the calibration model reports that signal quality evidence is missing. This is a named enum state, not an error, but means calibration is running without the full quality evidence it needs. Evidence Through and Next Evaluable Date are both dashes.
- **4 rows have calibration evidence warnings** — visible in alert banner; exact instruments not drilled into.
- The 3 filter input controls have machine-generated labels (`_r_q_`, `_r_12_`, `_r_19_`) — no human-readable aria labels, making them inaccessible and hard to identify without code inspection.

---

## 6. Data Quality Engine — `/admin/data-quality`

**Route file:** `frontend/src/features/data-quality-engine/routes.tsx`  
**Actual path:** `/admin/data-quality`

### Purpose
Coverage, readiness, and liquidity checks — the gatekeeper for signals, calibration, backtesting, and trade-plan readiness.

### UI Elements
- Header: "Data Quality Engine"; subtitle: "Coverage, readiness, and liquidity checks for downstream research modules."
- Refresh button
- Pipeline stage banner: Data Quality; IN / STOCK; Completed; Progress: 2337/2337 (100%); Warnings: 0; Errors: 0; Started Jun 15 3:15 PM; Completed Jun 15 3:16 PM; Data through: Jun 15 2026; link to "View Pipeline Ops details"
- Region note: "Market is controlled by the global header selector: IN / STOCK."
- Summary stats:
  - Signal Ready / Total: **2372/2937** (81% signal-ready; 2937 evaluated)
  - Signal Ready: 2372 (81% of evaluated rows)
  - Blocked Or Limited: 565 (not ready for signal generation)
  - Issue Flags: 995 (overlapping stale, volume, and liquidity flags)
  - Review Readiness Summary: Mode Full Review; Decision: **REPAIR_DATA**; Trust: PARTIAL; Trusted/catalog: 2180/2937; Provider-supported: 2389; Stored data-through: 2026-06-15; Next bounded action: Backfill prices; Batch size: 50
- Quality Views tabs: **All**, **Signal Ready**, **Blocked**, **Poor Coverage**, **Low Liquidity**, **Backtest Ready**
- Filter row: search (symbol/company text), Coverage combobox, Readiness combobox, Liquidity combobox, Sector text, Signal Eligible combobox
- Table columns: Symbol, Company, Coverage, Signal Readiness, Liquidity, Daily Review, Signal Tier, Backtest Tier, Calibration Tier, Automation Tier, Gaps, Warnings, Last Evaluated, Actions

### API Calls
- `GET /api/v1/data-quality/instruments?limit=25&offset=0&sortBy=signalReadinessScore&sortOrder=asc&region=IN&assetType=STOCK` → 200
- `GET /api/v1/data-quality/summary?region=IN&assetType=STOCK` → 200
- `GET /api/v1/market-data/review-readiness-summary?region=IN&assetType=STOCK` → 200

### Gaps / Issues
- **Review Readiness Decision: REPAIR_DATA** — the system's own assessment is that data needs repair before a full review is meaningful. Trust level is PARTIAL (2180/2937 trusted).
- **995 issue flags** across 2937 instruments (34% flagged) — "overlapping stale, volume, and liquidity flags." Large proportion of the universe has data quality concerns.
- **565 blocked/limited instruments** (19% of universe) cannot proceed to signal generation.
- "Backtest Ready" tab exists but backtest pipeline stage is "Not yet active" (per Pipeline Ops) — tab may show zero or empty state.
- No JS console errors on this page.

---

## Cross-Cutting Observations

### Consistent JS Warning (Every Page)
`No routes matched location "/derivatives-intelligence"` — repeated on every page load. The `derivatives-intelligence` feature has a route that references a path that is not registered in the main router. This produces console noise on every navigation.

### Region Selector Behavior
All admin pages read the region from the global header "Market: India" dropdown. The note "Market is controlled by the global header selector" appears inline on MDF Catalog, Data Health, and Data Quality pages. Region switching was not exercised (would re-fetch all page data).

### All API Calls Return 200 (No Failed Requests)
The `preview_network filter:failed` check returned zero failures. All observed API calls returned HTTP 200.

### Destructive Controls Deliberately Skipped
The following buttons/forms were identified but NOT clicked:
- "Run Backfill" (MDF Import & Backfill tab) — triggers historical ingest
- "Import Fundamentals" (MDF Import & Backfill tab) — form submission
- "Run Daily Pipeline" (Pipeline Ops) — triggers full pipeline run
- "Refresh Evidence" (MDF Source File Evidence) — noted but not clicked (read-only fetch; was borderline; skipped for caution)
- "Run Signals" (Signal Generation Engine) — triggers signal generation
- "Run Calibration" (Signal Calibration Engine) — triggers calibration run
- "Refresh Diagnostics" (Signal Quality Lab) — triggers recalculation

---

## Distinct API Paths Observed

| Path Pattern | Used By |
|---|---|
| `GET /api/v1/auth/me` | Every page (auth check) |
| `GET /api/v1/alerts/events` | Every page (header) |
| `GET /api/v1/market-context/capital-posture` | Every page (header posture badge) |
| `GET /api/v1/instruments` | MDF Catalog tab |
| `GET /api/v1/market-data/scheduler/status` | MDF Data Health tab |
| `GET /api/v1/market-data/review-readiness-summary` | Data Quality Engine |
| `GET /api/v1/pipeline/status` | Pipeline Ops |
| `GET /api/v1/data-quality/instruments` | Data Quality Engine |
| `GET /api/v1/data-quality/summary` | Data Quality Engine |
| `GET /api/v1/signals/calibration/model` | Signal Calibration Engine |
| `GET /api/v1/signals/calibration/top` | Signal Calibration Engine |
| `GET /api/v1/notifications/preferences` | Notification panel (header) |
| `GET /api/v1/notifications/events` | Notification panel (header) |
| `GET /api/v1/notifications/provider-status` | Notification panel (header) |
