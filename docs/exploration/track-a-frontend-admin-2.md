# Frontend Admin/Operator Screen Audit — Wave 2
**Date:** 2026-06-16 (re-audit)  
**Server:** http://localhost:5181 (ui-userfacing instance)  
**Scope:** 8 operator/admin screens — Signals & Strategy + Market Data ops  
**Auth:** test@example.com (token injected via localStorage `investment_scanner_auth_token`)  
**Region default:** US/STOCK; switched to IN/STOCK for screens requiring NSE data

---

## 1. Signal Position Ledger / Trigger Monitor
**Route:** `/signal-position-ledger`  
**Purpose:** Read-only rule-trigger lifecycle evidence — entry candidates and closed history for the active market scope.

### UI Elements
- Page header: "Trigger Monitor"; subtitle "Read-only rule-trigger lifecycle evidence for the current market scope. Scope: US / STOCK."
- Summary strip: 67 open entries, 0 closed entries (US/STOCK)
- 4 stat cards: Entry trigger candidates (67), DQ ready evidence (25), Forward-validation shown (0), Rows with caveats (25)
- Two tabs: "Entry Trigger Candidates" | "Closed History"
- Table columns: Stock, Trigger (date + price), Return till date, Evidence (DQ status + Grade), Lifecycle, Rule
- Controls: "Reload snapshot" button, "Export CSV" button; sortable Trigger and Return columns
- Pagination: 25 rows per page default

### API Calls
- `GET /api/v1/signals/position-ledger/persisted/active?region=US&assetType=STOCK&limit=25&offset=0&sortBy=entryTriggerTimestamp&sortDirection=desc`
- `GET /api/v1/signals/position-ledger/persisted/closed?region=US&assetType=STOCK&limit=25&offset=0&sortBy=entryTriggerTimestamp&sortDirection=desc`

### Data Notes
- 67 open entries (AGX, AFRM, AGL, etc.); triggered Jun 12–15 2026
- Evidence column: "READY" DQ status on all; Grade "N/A" on all
- Rule column: "Unavailable — —" on all rows
- `currentReturnPercent: 0` on all rows (latest price = trigger price, same-day triggers)
- `exitDecision: "INSUFFICIENT_DATA"` on most; `exitStrategyId: "DEFENSIVE_EXIT"` populated even when entry strategy null
- `calibrationEvidenceStatus: "UNAVAILABLE"` universally; `displayWarnings: ["Forward-validation evidence is unavailable."]`
- 0 closed entries in Closed History tab
- API-confirmed nulls per row: `strategyId`, `strategyVersion`, `strategyDecision`, `strategyReadinessLabel`, `strategyRatingGrade`, `entryRuleId`

### Gaps / Issues
- **PRIOR FINDING — UNCHANGED:** Strategy join is null on every row. "Rule: Unavailable" and "Grade N/A" persist for all 67 active US/STOCK entries. `entryRuleId`, `strategyId`, `strategyRatingGrade` remain null in the DB. No improvement since last audit.
- 0 rows with forward-validation evidence (calibration unavailable)
- 0 closed entries — no lifecycle completions yet

---

## 2. Trade Plan Risk Engine (Legacy)
**Route:** `/trade-plans`  
**Purpose:** Legacy trade plan evidence dashboard — generation funnel, paper-readiness blockers, and plan table.

### UI Elements
- Two alert banners: "Evidence only — not trade instructions" (top) + "This legacy page shows generated review evidence only" (secondary)
- Backtest Proof timeframe selector (default 3Y)
- "Generate Plans" button (destructive — SKIPPED)
- Generation Funnel: Raw Bullish Signals 295, Strategy Decisions 150, Eligible Review Candidates 1, Generated Plans 10, Paper Ready 0, Blocked/Watch/Insufficient 10
- Top Paper Readiness Blockers list (with counts)
- "Skipped Before Generation" breakdown
- 4-step Paper Readiness Proof Chain with links to SDE, Strategy Framework, Trade Plan screens
- Plan table: Symbol, Strategy, Status, Risk, Entry, Stop, Target, R:R, Readiness, Rating, Price, Reason, Actions

### API Calls
- `GET /api/v1/trade-plans/candidates?region=US&assetType=STOCK&backtestWindow=3Y`
- `GET /api/v1/trade-plans/funnel?region=US&assetType=STOCK&backtestWindow=3Y`

### Data Notes
**Generation funnel (US/STOCK, 3Y):**
- 295 raw bullish signals → 150 strategy decisions → 1 eligible candidate → 10 generated plans → **0 paper-ready**
- Top blockers: 10 UNPROVEN strategy rating; 10 LOW decision confidence; 1 invalid plan status; 1 HIGH risk grade; 1 active blocker
- Skipped breakdown: 97 INSUFFICIENT_DATA, 25 DEFENSIVE_EXIT excluded, 22 AVOID, 19 WATCH, 12 exit/risk-reduction
- Table body: "No legacy review evidence rows found for US/STOCK" (0–0 of 0 rows displayed)

### Gaps / Issues
- **PRIOR FINDING — UNCHANGED:** 0 plans are paper-ready. portfolioImpact section is absent entirely (not just blank) — the field is not surfaced anywhere on this page. All 10 generated plans are blocked by UNPROVEN strategy rating + LOW confidence.
- Funnel explains the blockage cleanly: strategy proof deficit is the root cause.

---

## 3. Strategy Framework
**Route:** `/strategies`  
**Purpose:** Reusable deterministic strategy registry — catalog, proof registry, ratings, backtest integration.

### UI Elements
- Header: "Strategy Framework — 11 configured — US — STOCK"
- Subtitle: "Reusable deterministic strategy registry for signals, decisions, and backtests."
- Two info banners about research-only scope and strategy categories
- Tabs: Catalog | Proof Registry | Detail | Performance | Rankings | Evaluate Stock
- Category filter buttons: All (11), Entry (5), Exit (1), Gates (1), Filters (1), Risk (0), Calibration (0), Diagnostics (0), Drafts (3)
- Table columns: Strategy (name + code), Category, Status, Style, Latest rating, Readiness, Actions
- Row actions: "View" (all); "Backtest in Lab" (active entry strategies only)

### API Calls
- `GET /api/v1/strategies?region=US&assetType=STOCK`

### Data Notes
**All 11 strategies:**

| Name | Status | Rating | Readiness |
|---|---|---|---|
| Breakdown Momentum (Short Review) | DRAFT | Unproven | Research Only |
| Breakout Confirmation | ACTIVE | Unproven + Warnings | Research Only |
| Defensive Exit Review | ACTIVE | Unproven | Research Only |
| Low Quality Data Rejection | ACTIVE | Unproven | Research Only |
| Mean Reversion Pullback | DRAFT | Unproven | Research Only |
| Pullback in Uptrend | ACTIVE | Unproven + Warnings | Research Only |
| Quality Trend | DRAFT | Unproven | Research Only |
| Risk-Off Avoidance | ACTIVE | Unproven | Research Only |
| Relative Strength Continuation | ACTIVE | Unproven + Warnings | Research Only |
| Smart Money Accumulation | ACTIVE | Unproven | Research Only |
| Trend Momentum | ACTIVE | Unproven | Research Only |

- Active ENTRY strategies (eligible for backtests): Breakout Confirmation, Pullback in Uptrend, Relative Strength Continuation, Smart Money Accumulation, Trend Momentum
- 3 strategies show "Unproven + Warnings" (Breakout Confirmation, Pullback in Uptrend, Relative Strength Continuation)

### Gaps / Issues
- **PRIOR FINDING — UNCHANGED:** All 11 strategies remain Unproven; 0 proven. No strategy has accumulated sufficient backtest evidence to advance beyond UNPROVEN rating. All readiness labels are "Research Only".

---

## 4. Strategy Decision Engine
**Route:** `/strategy`  
**Purpose:** Strategy-backed review candidates, exit-risk alerts, and market state awareness dashboard.

### UI Elements
- Header: "Strategy Decision Engine — Strategy-backed review candidates, exit-risk alerts, and market state awareness."
- "Run Evaluation" button (destructive compute action — SKIPPED)
- Research support disclaimer banner
- Tabs: Market Gate | Review Candidates | Wait / Watch | Exits / Risks | Rules & Model | Evaluate | Stock Lookup
- **Market Gate tab (default):** Market Condition chip (HEALTHY), Gate Status (OPEN), Allowed Actions list, Reasons & Blockers narrative
- **Review Candidates tab:** Table — Symbol, Strategy, Decision, Framework Rating, Readiness, Score, Confidence, Entry Zone, Generated, Actions (Risk Plan link)

### API Calls
- `GET /api/v1/market-context/capital-posture?region=US&assetType=STOCK`
- Strategy decision data (inferred from component load)

### Data Notes
- Market Condition: HEALTHY; Gate: OPEN; Capital Posture: Risk-On (US/STOCK)
- Gate analysis: "Market regime is Risk-On and breadth is healthy."
- Allowed actions: "New long candidates may be reviewed", "Only high-quality setups should be reviewed"
- **Review Candidates: 1 row** — AGIO, SMART_MONEY_ACCUMULATION v1.2.0, Decision TRADE_CANDIDATE, Framework-backed, UNPROVEN, RESEARCH_ONLY, Score 80, Confidence LOW, Generated 6/13/2026
- 1 candidate surviving the full funnel from 295 raw signals

### Gaps / Issues
- Sole review candidate (AGIO) has Confidence LOW — gates paper-ready plan generation
- "Run Evaluation" is a compute trigger — correctly skipped in this audit

---

## 5. Market Context Intelligence
**Route:** `/market-context`  
**Purpose:** Market regime, sector rotation, breadth, institutional flows, country strength, macro context.

### UI Elements
**US scope (default):** Graceful empty state — "Market context is not applicable to US equities." Explanation: FII/DII flows and bulk/block deals are NSE India only; no free equivalent for US in this release.

**IN scope (switched for audit):**
- "Market context data is partial" alert banner
- Sections: Market Regime, Institutional Activity (FII/DII Net, Bulk/Block Deals, F&O Ban, Sector Flows, F&O OI Buildup), Sector Rotation, Breadth Indicators, Breadth by Cap Band, Country/Region Strength, Macro Snapshot, FII/DII Activity history table, Bulk & Block Deals
- "Refresh" button for explicit snapshot reload
- All data labeled "as of 15 Jun 2026 · 1 day old"

### API Calls
- `GET /api/v1/market-context/capital-posture?region=IN&assetType=STOCK`
- Multiple sub-endpoints for institutional activity, breadth, sector, country, F&O data

### Data Notes (IN scope, 15 Jun 2026)
- **Market Regime:** NEUTRAL, score 59; 62.7% above SMA50, 54.9% above SMA200, Nifty 50 trend score 46.6
- **FII/DII Net:** FII +₹200 Cr, DII +₹3,189 Cr; prior 4 days FII all net negative
- **F&O Ban:** 1 stock — KAYNES
- **Sector Flows:** Utilities, Financial Services, Industrials ACCUMULATING; IT DISTRIBUTING
- **F&O OI:** PCR 0.99; 81 Long Buildup, 80 Short Covering
- **Sector Rotation:** Technology LEADING, Utilities LEADING; all sectors show "Signals 0/0"
- **Country Strength:** India 3M +11.6%, Score 62
- **Bulk & Block Deals:** "Bulk/block deal data not yet ingested. Use POST /api/v1/market-context/bulk-block-deals/ingest to fetch from NSE."
- **Macro Snapshot:** "UNKNOWN — Macro providers are not configured yet. MISSING"

### Gaps / Issues
- **PRIOR FINDING — UNCHANGED:** Macro Snapshot still "UNKNOWN / Macro providers are not configured yet." No macro data source configured.
- **PRIOR FINDING — UNCHANGED:** Sector signals still 0/0 across all sectors in Sector Rotation.
- Bulk & Block Deals section: requires manual ingest trigger — no data present.

---

## 6. Smart Money Intelligence
**Route:** `/smart-money`  
**Purpose:** Price-volume accumulation/distribution scores and sector smart money context. (IN scope for meaningful data.)

### UI Elements
- Header: "Smart Money Intelligence — as of 15 Jun 2026 · 1 day old"
- Disclaimer: price-volume proxy only; no institutional ownership or insider filing data
- "Refresh Snapshots" button (destructive recompute — SKIPPED)
- Filters: Range selector (3M default), Sector dropdown
- "Top Accumulation Candidates" table: Symbol, Score (0–100), Daily %, Actions — 857 total rows
- "Top Distribution Warnings" table: same columns — 231 total rows
- "Sector Smart Money View" table: Sector, Status, Score, Accum. count, Distrib. count, Unusual Vol. count, Instr. count

### API Calls
- `GET /api/v1/smart-money/top?limit=10&offset=0&range=3M&region=IN&assetType=STOCK`
- `GET /api/v1/smart-money/distribution?limit=10&offset=0&range=3M&region=IN&assetType=STOCK`
- `GET /api/v1/smart-money/sectors?range=3M&region=IN&assetType=STOCK`

### Data Notes
- Top accumulation (score 100): ABSLAM, AHCL, APARINDS, BANDHANBNK, EBGNG, MAHABANK, MSTCLTD, NGLFI, RBLBANK, SAYAJIHOTL
- Distribution leaders: BANG (score 0, -3.3%), HITECHGEAR (score 0, -0.0%), TCS (score 0, -35.9% **displayed**)
- API for TCS: `dailyChangePercent: -0.3585` (decimal fraction ≈ -0.036%), `smartMoneyScore: 0`, `dataStatus: "PARTIAL"`
- Sector view: all 11 sectors ACCUMULATING or NEUTRAL; scores 54–61

### Gaps / Issues
- **PRIOR FINDING — CLARIFIED/NEW BUG CONFIRMED:** TCS score=0 is correct (DISTRIBUTION classification). However, the **-35.9% daily display is a confirmed formatting bug**: API returns `dailyChangePercent` as a decimal ratio (-0.3585 ≈ -0.036%) but the UI renders it as -35.9%, treating a fractional value as if it were a percent already multiplied by 100. Actual daily change is approximately -0.04%.
- `dataStatus: "PARTIAL"` on multiple distribution stocks — expected given free-data source limitations.

---

## 7. Backtesting & Strategy Lab
**Route:** `/backtests`  
**Purpose:** Historical daily-close simulations against registered strategies with configurable parameters.

### UI Elements
- Header: "Backtesting & Strategy Lab — Historical daily-close simulations. Results are not predictions."
- Scope: IN / STOCK
- "Run Registered Backtest" button (destructive — SKIPPED)
- Tabs: Registered Strategy | Custom Rules | Saved Runs
- Parameter inputs: Strategy selector, Timeframe (3Y default), Universe, Initial capital, Max positions
- Realistic assumptions: Cost %, Slippage %, Max hold days, Stop loss %, Trailing stop %, Take profit %
- Results panel (persisted run for Trend Momentum, 3Y, IN/STOCK): headline metrics, benchmark comparison, caveats, equity curve chart, monthly returns table, performance by regime, exit breakdown, trade log

### API Calls
- `GET /api/v1/strategies?region=IN&assetType=STOCK`
- Backtest results endpoint (inferred from persisted result display)

### Data Notes (Trend Momentum, 3Y, IN/STOCK, 254 trades):
- Ending Capital ₹1,09,584; Total Return 9.6%; CAGR 4.3%; Max Drawdown -17.7%
- Sharpe -0.20; Sortino -0.23; Calmar 0.24; Win Rate 31.1% (CI 25.7%–37.0%); Profit Factor 1.19
- Rating: "Average — WATCHLIST_CANDIDATE — PARTIAL"
- vs Benchmark (NSE Nifty 50 CAGR 1.3%): Excess CAGR +3.0%
- Performance by regime: Risk-On CAGR -5.4% (poor), Neutral CAGR +12.6% (good), Risk-Off/Unknown N/A
- Exit breakdown: Strategy exit 90.6%, trailing stop 4.3%, end-of-test forced 3.5%
- Universe bounded: 50 of 2937 instruments (runtime safety cap)
- 3 caveats displayed: SURVIVORSHIP_BIAS_UNIVERSE, PRICE_PROXY_CONTEXT, WARM_UP_DRAG

### Gaps / Issues
- Rating "Average / WATCHLIST_CANDIDATE" with negative Sharpe — insufficient evidence for PROVEN status
- Monthly returns 2023 (Jun–Dec): all 0.0% — warm-up period, no trades taken

---

## 8. Historical Context Snapshots
**Route:** `/context-snapshots`  
**Purpose:** View, generate, and look up persisted market regime/breadth/sector/country/smart-money snapshots by date/stock/sector.

### UI Elements
- Header: "Historical Context Snapshots — for IN / STOCK"
- "Open Signal Quality Lab" button-link
- 5 stat cards: Market Snapshots (114), Sector Snapshots (1,113), Country Snapshots (114), Smart Money (137,929), Latest Date 6/15/2026
- "Generate Snapshot" panel: date picker, smart-money limit input, "Generate" button (destructive — SKIPPED)
- Lookup Tool: Date, Stock/instrument, Sector, Country inputs + "Lookup" button
- Market Regime Snapshots table: 20 rows visible, "Show more (80 remaining)"
- Sector Snapshots table: 20 rows visible, "Show more (80 remaining)"
- Country Snapshots table

### API Calls
- `GET /api/v1/context-snapshots/coverage?region=IN&assetType=STOCK`
- `GET /api/v1/context-snapshots/market?limit=100&region=IN&assetType=STOCK`
- `GET /api/v1/context-snapshots/sectors?limit=100&region=IN&assetType=STOCK`
- `GET /api/v1/context-snapshots/countries?limit=100&region=IN&assetType=STOCK`

### Data Notes
- 114 daily market snapshots (healthy history depth); 1,113 sector snapshots; 137,929 smart money records
- Regime history (latest 20): NEUTRAL dominant since late May; RISK_ON: Jun 4, May 25–30; RISK_OFF: May 31 (score 25, SMA50 N/A)
- Sector on 6/15: Technology LEADING 79, Utilities LEADING 71, Industrials LAGGING 69, Information Technology score **0** (anomaly)
- Country: India score 62, status PARTIAL

### Gaps / Issues
- "Information Technology" sector score of 0 on 6/15 is suspicious alongside "Technology" sector at 79 — possible sector label duplication/remapping issue (two labels covering overlapping instruments).
- Lookup tool present but requires manual input — not exercised in this read-only audit.

---

## 9. Breadth Internals
**Route:** `/breadth-internals`  
**Purpose:** Market breadth trends over configurable lookback periods for divergence detection.

### UI Elements
- Header: "Breadth Internals — Market breadth trends over time. Breadth divergence is the key early-warning indicator for Indian market tops."
- Lookback buttons: 14d | 30d | 60d | 90d
- Latest snapshot date: 2026-06-15
- 6 stat cards: Above SMA50 (62.7%), Above SMA200 (54.9%), A/D Ratio (3.00), 52W High/Low (43/4), High-Low Net (+39), Regime NEUTRAL 59.0
- 6 sparkline charts with percentile bands: % Above SMA50, % Above SMA200, A/D Ratio, 52W Highs vs Lows, High-Low Net, Regime Score
- Period Deltas table: Current vs Period Start vs Change

### API Calls
- `GET /api/v1/market-context/breadth-internals?days=60&region=IN&assetType=STOCK`

### Data Notes
- Period deltas (2023-07-01 to 2026-06-15): SMA50% −13.0%, SMA200% −10.9%, A/D +1.63, Regime Score −23
- Charts render with full percentile bands; all 4 lookback controls functional
- Latest point Jun 15: SMA50 at ~24.8th percentile, SMA200 at ~31st percentile, A/D at 2.33 (moderate)

### Gaps / Issues
- No notable issues. Screen renders fully with rich historical chart data.
- IN scope only (no US equivalent by design).

---

## Re-Audit Focus — Prior Findings Status

| Finding | Prior State | Current State (2026-06-16) |
|---|---|---|
| Signal/Trigger Monitor — strategyId null ("Rule: Unavailable", "Grade N/A") | All rows null | **UNCHANGED** — `strategyId`, `strategyRatingGrade`, `entryRuleId` null on all 67 active US/STOCK rows |
| Trade Plans — portfolioImpact blank | 99.6% null in DB | **UNCHANGED** — portfolioImpact section absent entirely; 0 of 10 plans paper-ready |
| Strategy Framework — Unproven count | All Unproven | **UNCHANGED** — all 11 strategies remain Unproven (0 proven) |
| Market Context — Macro Snapshot | "providers not configured" | **UNCHANGED** — "UNKNOWN / Macro providers are not configured yet." |
| Market Context — Sector signals | 0/0 | **UNCHANGED** — all sectors show "Signals 0/0" in Sector Rotation |
| Smart Money — TCS score=0 with large negative daily | score=0, -35.9% displayed | **BUG CONFIRMED** — score=0 is correct (DISTRIBUTION). API returns `dailyChangePercent: -0.3585` (fractional ≈ -0.036%) but UI renders -35.9%, double-multiplying by 100. |

---

## Distinct API Paths Observed

```
GET  /api/v1/auth/me
GET  /api/v1/signals/position-ledger/persisted/active
GET  /api/v1/signals/position-ledger/persisted/closed
GET  /api/v1/trade-plans/candidates
GET  /api/v1/trade-plans/funnel
GET  /api/v1/strategies
GET  /api/v1/market-context/capital-posture
GET  /api/v1/market-context/breadth-internals
GET  /api/v1/smart-money/top
GET  /api/v1/smart-money/distribution
GET  /api/v1/smart-money/sectors
GET  /api/v1/context-snapshots/coverage
GET  /api/v1/context-snapshots/market
GET  /api/v1/context-snapshots/sectors
GET  /api/v1/context-snapshots/countries
GET  /api/v1/alerts/events
GET  /api/v1/instruments
```

## Destructive Controls Skipped
- `/strategy` → "Run Evaluation" (batch strategy decision recompute)
- `/trade-plans` → "Generate Plans" (batch trade plan generation)
- `/backtests` → "Run Registered Backtest" (backtest execution)
- `/context-snapshots` → "Generate Snapshot" (snapshot generation)
- `/smart-money` → "Refresh Snapshots" (smart money recompute)
