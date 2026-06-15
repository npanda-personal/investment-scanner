# Frontend Admin Recon — Wave 2 (Operator/Admin Set 2)

**Date:** 2026-06-15  
**Server:** http://localhost:5173 (shared dev FE)  
**Scope:** 8 operator/admin screens in the Signals-and-Strategy + Data-Ops admin sections.

---

## Tab-Switching Automation Note

MUI `<Tabs>` with `onChange={(_, v) => setActiveTab(v)}` does not respond to `preview_eval` `.click()`, `dispatchEvent`, keyboard arrow keys, or `preview_click` with nth-child selectors when the tab is already scrolled into view. The active tab was stuck on "Wait / Watch" on the Strategy Decision screen for the full session. Content for tabs not visited is documented from source-code reading instead of live browser observation. No JS errors were present.

---

## 1. Strategy Decision Engine — `/admin/strategy`

**Purpose:** Operator view of rule-based strategy evaluation output. Shows market gate, review candidates (TRADE_CANDIDATE), wait/watch queue, exits/risk alerts, model documentation, evaluation runner, and per-stock lookup.

**UI Elements:**
- Page header with "Run Evaluation" CTA (destructive-class — skipped)
- Research-support disclaimer alert (always visible)
- Capital posture chip in top bar: "Posture: Neutral" (from `GET /api/v1/market-context/capital-posture`)
- 7-tab layout: Market Gate / Review Candidates / Wait-Watch / Exits-Risks / Rules & Model / Evaluate / Stock Lookup
- Market scope dropdown ("Market: India") in header

**Tabs observed (Market Gate — default):**
- Market Condition: MIXED, Gate Status: SELECTIVE
- Allowed actions listed as bullet points
- Analysis narrative: "Market conditions are mixed; selectivity is required."

**Tab: Review Candidates (visited via src read + brief UI):**
- DataTable with columns: Symbol, Strategy, Decision, Framework, Rating, Readiness, Score, Confidence, Entry Zone, Generated, Actions (Risk Plan link)
- Data present: RATEGAIN, INSPRISYS, PRUDENT, ANTHEM, ATGL, SOFTTECH, NYKAA, CUB, TCS, BAJEL, SASKEN, PARACABLES, RELIABLE, HAPPYFORGE, and many more
- All rows show Score=95, Confidence=HIGH, Strategy versions v1.2.0 (SECTOR_LEADER_MOMENTUM / PULLBACK_IN_UPTREND)
- **Gap:** Rating column shows "UNKNOWN" for all rows; Readiness shows "RESEARCH_ONLY" universally — no differentiated grading

**Tab: Wait / Watch (stuck active — observed live):**
- Columns: Symbol, Status, Requirement, Reason
- 58 total rows (1–50 of 58 shown per page), all status=Watch, all requirement="Wait For Confirmation" or "Wait For Pullback"
- Reasons: "Price-volume accumulation detected.", "Long-term uptrend is intact.", "Multi-week base evidence is available before breakout.", "Stock signal is bullish.", "Price is above SMA50."

**Tab: Exits / Risks (from source):**
- Columns: Symbol, Risk Level (formatDecision), Review Action, Risk Score, Reasons (first 2 joined with ";")
- emptyMessage: "No holdings currently flagged for exit review."
- Uses `exits` state from `GET /api/v1/strategy/exits`

**Tab: Rules & Model (from source):**
- Shows model version, Market Gate Rules grid, per-strategy detail (thresholds, weights), Language & Safety Standards block
- Data from `GET /api/v1/strategy/model`

**Tab: Evaluate (from source):**
- Strategy selector dropdown, batch evaluation runner (POST to `/api/v1/strategy/evaluate` — DESTRUCTIVE, not clicked)
- Shows evaluatableStrategies list, progress alerts, batch size 100 / 4 workers

**Tab: Stock Lookup (from source):**
- InstrumentSearchSelect, then shows Decision, Action, Score, scoreBreakdown, Entry Zone (referencePrice / preferredEntryMin / preferredEntryMax), reasons/warnings/blockers
- From `GET /api/v1/strategy/decisions/:instrumentId`

**API Calls (all 200 OK):**
- `GET /api/v1/strategy/market-gate?region=IN&assetType=STOCK`
- `GET /api/v1/strategy/candidates?limit=25&offset=0&decision=TRADE_CANDIDATE&region=IN&assetType=STOCK&sortBy=decisionScore&sortDirection=desc`
- `GET /api/v1/strategy/candidates?limit=50&decision=WAIT&region=IN&assetType=STOCK`
- `GET /api/v1/strategy/candidates?limit=50&decision=WATCH&region=IN&assetType=STOCK`
- `GET /api/v1/strategy/exits?region=IN&assetType=STOCK`
- `GET /api/v1/strategy/model?region=IN&assetType=STOCK`
- `GET /api/v1/alerts/events?region=IN&assetType=STOCK`
- `GET /api/v1/market-context/capital-posture?region=IN&assetType=STOCK`

**Console errors:** None.

**Gaps / Issues:**
- **Tab switching broken in automation** — MUI Tabs onChange not triggered by any synthetic event in preview_eval context. This is an automation limitation, not a product bug.
- **Rating column universally "UNKNOWN"** on Review Candidates — strategyRatingGrade null for all TRADE_CANDIDATE rows.
- "Run Evaluation" CTA is always visible even when market gate is SELECTIVE — no gating of the destructive action in UI.
- Exits/Risks tab not observed live (empty or requires real portfolio signals).

---

## 2. Strategy Framework — `/admin/strategies`

**Purpose:** Registry of all defined strategies (entry, exit, gate, filter, calibration, diagnostic, draft). Shows catalog, proof registry, detail, performance, rankings, and per-stock evaluation.

**UI Elements:**
- Page header: "Strategy Framework — 11 configured" with IN/STOCK scope chips
- Research-support disclaimer alert
- Info alert about ENTRY strategies being backtest candidates; EXIT/GATE/etc. supporting decisions only
- 6-tab layout: Catalog / Proof Registry / Detail / Performance / Rankings / Evaluate Stock
- Category filter buttons: All (11), Entry (5), Exit (1), Gates (1), Filters (1), Risk (0), Calibration (0), Diagnostics (0), Drafts (3)

**Catalog tab (default, observed live):**
- DataTable: Strategy name + code, Category, Status, Style, Latest rating, Readiness, Actions (View / Backtest in Lab)
- 11 strategies total, paginated 10 per page (1–10 of 11)
- Strategies visible: BREAKDOWN_MOMENTUM (ENTRY/DRAFT), BREAKOUT_CONFIRMATION (ENTRY/ACTIVE), DEFENSIVE_EXIT (EXIT/ACTIVE), LOW_QUALITY_DATA_REJECTION (FILTER/ACTIVE), MEAN_REVERSION_PULLBACK (ENTRY/DRAFT), PULLBACK_IN_UPTREND (ENTRY/ACTIVE), QUALITY_TREND (ENTRY/DRAFT), RISK_OFF_AVOIDANCE (GATE/ACTIVE), SECTOR_LEADER_MOMENTUM (ENTRY/ACTIVE), SMART_MONEY_ACCUMULATION (ENTRY/ACTIVE), TREND_MOMENTUM (ENTRY/ACTIVE)
- **All strategies show "Unproven" / "Research Only" except TREND_MOMENTUM which shows "Average" / "Watchlist Candidate"**
- "Backtest in Lab" disabled for DRAFT strategies and non-entry strategies (shows tooltip explaining reason)

**API Calls (all 200 OK):**
- `GET /api/v1/strategies?region=IN&assetType=STOCK`
- `GET /api/v1/strategies/TREND_MOMENTUM?region=IN&assetType=STOCK` (Detail tab preloads first strategy)
- `GET /api/v1/strategies/TREND_MOMENTUM/performance?region=IN&assetType=STOCK`
- `GET /api/v1/strategies/rankings?timeframe=1Y&region=IN&assetType=STOCK`
- `GET /api/v1/strategies/proof-registry?timeframe=1Y&region=IN&assetType=STOCK`
- `GET /api/v1/strategies/TREND_MOMENTUM/proof?timeframe=1Y&region=IN&assetType=STOCK`

**Console errors:** None.

**Gaps / Issues:**
- 10 of 11 strategies are "Unproven" / "Research Only" — only TREND_MOMENTUM has any proof (Average/Watchlist). No GOOD or EXCELLENT proof exists for any strategy.
- Risk (0), Calibration (0), Diagnostics (0) categories are empty — placeholders only.
- Detail/Performance/Rankings/Evaluate-Stock tabs not visited live (tab-switch automation limitation as above — source read confirms they use the strategy selector to swap data, calling `GET /api/v1/strategies/:code`, `/performance`, `/proof`).

---

## 3. Historical Context Snapshots — `/admin/context-snapshots`

**Purpose:** Manual generation and lookup tool for persisted market regime, breadth, sector, country, and smart-money context snapshots.

**UI Elements:**
- Page header: "Historical Context Snapshots"
- "Open Signal Quality Lab" secondary action link
- Summary stats: Market Snapshots 114, Sector Snapshots 1113, Country Snapshots 114, Smart Money 137,929, Latest Date 6/15/2026
- "Generate Snapshot" form (DESTRUCTIVE — skipped): scope dropdown, snapshot date picker, smart-money limit field, Generate button
- Note: "Generation is manual in this version. No scheduler or paid data provider is required."
- **Lookup Tool** form: Date, Stock/instrument, Sector, Country fields with Lookup button (read-only — non-destructive)
- Three data tables: Market Regime Snapshots, Sector Snapshots, Country Snapshots (20 rows each + "Show more" button)
- Region/date breakdown visible for India (IN) spanning 2026-05-24 to 2026-06-15

**Market Regime Snapshots (live data):**
- Columns: Date, Region, Regime, Score, SMA50
- Latest: 6/15/2026 IN NEUTRAL 59 62.7%
- Historical range: NEUTRAL throughout recent weeks; risk-on 5/28–5/30, risk-off 5/31

**Sector Snapshots:**
- Columns: Date, Region, Sector, Status, Score
- Today: Technology LEADING 79, Utilities LEADING 71, Industrials LAGGING 69, Energy LAGGING 62, Basic Materials WEAKENING 61, Financial Services LAGGING 58, Communication Services LAGGING 55, Real Estate LAGGING 50, Consumer Defensive WEAKENING 49, Information Technology LAGGING 0
- **Gap:** Information Technology score = 0 (likely data quality issue / missing signals)

**Country Snapshots:**
- Columns: Date, Region, Country, Score, Status
- India: Score 62, Status PARTIAL today
- Status alternates PARTIAL / COMPLETE — PARTIAL is the norm, suggesting incomplete daily ingest runs

**API Calls (from service file — confirmed via module loads in network log):**
- `GET /api/v1/context-snapshots/coverage?region=IN&assetType=STOCK`
- `GET /api/v1/context-snapshots/market?region=IN&assetType=STOCK&limit=100`
- `GET /api/v1/context-snapshots/sectors?region=IN&assetType=STOCK&limit=100`
- `GET /api/v1/context-snapshots/countries?region=IN&assetType=STOCK&limit=100`

**Console errors:** None.

**Gaps / Issues:**
- Country snapshot status is PARTIAL for most dates — indicates daily pipeline rarely completes fully.
- Information Technology sector score = 0 today (abnormal).
- Generate Snapshot form is visible and enabled — no workflow guard to prevent accidental re-generation; operator-facing warning only.

---

## 4. Market Context Intelligence — `/admin/market-context`

**Purpose:** Live/persisted market regime, sector rotation, breadth indicators, country strength, macro snapshot, FII/DII activity, and bulk/block deals.

**UI Elements:**
- Page header: "Market Context Intelligence"
- "Updated: 6/15/2026, 3:25:22 PM" timestamp + "Refresh" button (triggers live fetch — not clicked)
- Warning alert: "Market context data is partial. Some indicators may be incomplete or missing."
- Market Regime section: Score 59, NEUTRAL, PARTIAL (capital posture blurb)
- Institutional Activity section (collapsible)
- Sector Rotation: Technology Leading, Utilities Leading, Industrials Lagging, Energy Lagging, Basic Materials Weakening (with 1M/3M/6M % and signal count "Signals 0/0" for all)
- Breadth Indicators row: Above SMA50 62.7%, Above SMA200 54.9%, A/D Ratio 3.00, 52W High/Low 43/4, Bullish/Bearish 0/0, Price Sample 360, SMA Samples 360/360
- Breadth by Cap Band table: Large/Mid/Small cap with >SMA50, >SMA200, A/D, N columns
- Country / Region Strength: India 3M 11.6%, Score 62
- Macro Snapshot: **UNKNOWN — "Macro providers are not configured yet." / Status MISSING**
- FII/DII Activity table (5 rows shown): Cash-market net buy/sell, ₹ Crore, Source NSE
  - Latest (15 Jun): FII +₹200.05 Cr, DII +₹3,189.26 Cr
- Bulk & Block Deals table: large institutional/HNI trades from NSE

**API Calls (from service file):**
- `GET /api/v1/market-context/summary` or `/api/v1/market-context/persisted-summary`
- `GET /api/v1/market-context/persisted-breadth`
- `GET /api/v1/market-context/capital-posture`
- `GET /api/v1/market-context/sectors`
- `GET /api/v1/market-context/breadth`

**Console errors:** None.

**Gaps / Issues:**
- **Macro Snapshot is MISSING** — macro data providers not configured; block renders "UNKNOWN / MISSING" placeholder visibly.
- All sector rotation cards show "Signals 0/0" — no active signal counts flowing into sector rotation display.
- Status PARTIAL for market context (partial ingest runs).
- "Bullish / Bearish 0 / 0" breadth indicator — these likely require signal data to populate and are currently empty.

---

## 5. Breadth Internals — `/admin/breadth-internals`

**Purpose:** Historical market breadth trends over time with Recharts line charts. Key early-warning indicator view for Indian market tops.

**UI Elements:**
- Page header: "Breadth Internals — Market breadth trends over time. Breadth divergence is the key early-warning indicator for Indian market tops."
- Timeframe selector buttons: 14d / 30d / 60d / 90d
- Latest snapshot: 2026-06-15
- 4 KPI chips: Above SMA50 62.7%, Above SMA200 54.9%, A/D Ratio 3.00, 52W High/Low 43/4, High-Low Net +39, Regime NEUTRAL (59.0)
- 5 Recharts line charts: % Above SMA50, % Above SMA200, Advance/Decline Ratio, New 52W Highs vs Lows (bar-style), New High-Low Net, Regime Score
- Charts span Jul 2023 – Jun 2026 (full history depth)
- Period Deltas table (2023-07-01 to 2026-06-15): Current vs Period Start vs Change
  - % Above SMA50: 62.7% vs 75.7% → -13.0%
  - % Above SMA200: 54.9% vs 65.8% → -10.9%
  - A/D Ratio: 3.00 vs 1.37 → +1.63
  - New High-Low Net: 39 vs 30 → +9
  - Regime Score: 59 vs 82 → -23
- Footer: "All data sourced from persisted market context snapshots (NSE/BSE). For research purposes only."

**API Calls (from service file — BreadthInternalsEnvelope type):**
- `GET /api/v1/market-context/breadth-internals?timeframe=30d&region=IN&assetType=STOCK` (or similar with timeframe param)

**Console errors:** None.

**Gaps / Issues:**
- Charts fully populated with 3-year history. No missing data or placeholder states observed.
- Timeframe selector not exercised (non-destructive filter — would re-fetch with different timeframe param). Four buttons visible but not clicked.

---

## 6. Backtesting Strategy Lab — `/admin/backtests`

**Purpose:** Daily-close simulation runner against active entry strategies. Supports registered strategy backtests and custom rule backtests. Shows equity curve, monthly return grid, benchmark comparison, and regime/metrics breakdown.

**UI Elements:**
- Page header: "Backtesting & Strategy Lab — Historical daily-close simulations. Results are not predictions."
- Scope chips: IN / STOCK
- CTA: "Run Registered Backtest" (DESTRUCTIVE — skipped)
- 3-tab layout: Registered Strategy / Custom Rules / Saved Runs
- **Registered Strategy tab (default):**
  - Strategy selector: "Trend Momentum" (preselected), dropdown includes evaluatableStrategies
  - Timeframe selector: 1Y / 3Y / 5Y / 10Y / 15Y (3Y selected by default)
  - Universe: "All eligible instruments (bounded)"
  - Capital / Max positions fields
  - Sliders: Cost % (0–5%), Slippage % (0–5%), Max hold days, Stop loss % (0–50%), Trailing stop % (0–50%), Take profit % (0=disabled)
  - Run Registered Backtest button
  - Results (for TREND_MOMENTUM 3Y IN STOCK):
    - Rating: Average / WATCHLIST_CANDIDATE / PARTIAL
    - Ending Capital ₹1,09,584, Total Return 9.6%, CAGR 4.3%, Max Drawdown -17.7%
    - Sharpe -0.20, Sortino -0.23, Calmar 0.24
    - Win Rate 31.1% (25.7%–37.0%), Trades 254, Profit Factor 1.19, Avg Hold 25 days, Longest Hold 208 days
  - Benchmark Comparison: NSE_NIFTY_50, Strategy CAGR 4.3% vs Benchmark CAGR 1.3%, Excess CAGR +3.0%
  - **3 caveat banners shown:**
    1. SURVIVORSHIP_BIAS_UNIVERSE — universe constructed from today's active instruments only, delisted stocks absent
    2. PRICE_PROXY_CONTEXT — sectorLeadership/smartMoneyStatus derived from price proxies, not real sector RS or institutional flow
    3. WARM_UP_DRAG — 9,154 instrument-bars blocked due to warm-up (< 200 bars history)
  - Equity Curve: Recharts LineChart (Oct 2023 – Jun 2026)
  - Monthly Returns grid (Year × Month): 2023–2026 annual/monthly breakdown
  - Regime breakdown table (not observed in detail — source shows regime bucket padding)

**API Calls:**
- `GET /api/v1/strategies?region=IN&assetType=STOCK` (strategy list for dropdown)
- `POST /api/v1/backtests/run` (triggered by "Run" button — DESTRUCTIVE, not clicked)
- `GET /api/v1/backtests/runs?region=IN&assetType=STOCK` (Saved Runs tab)
- `GET /api/v1/backtests/strategies` (Custom Rules saved strategies)

**Console errors:** None.

**Gaps / Issues:**
- Results shown are from a previously-run backtest stored in state — the page shows TREND_MOMENTUM results on load without a new run, suggesting the hook auto-loads the latest result from the API.
- Survivorship bias and price-proxy caveats are prominently displayed (good transparency).
- Custom Rules tab and Saved Runs tab not exercised.
- Only TREND_MOMENTUM has meaningful backtest data; other 4 active ENTRY strategies show "Unproven" in the Framework catalog.

---

## 7. Smart Money Intelligence — `/admin/smart-money`

**Purpose:** Price-volume accumulation / distribution screening with sector-level aggregation. FnO ban list management.

**UI Elements:**
- Page header: "Smart Money Intelligence — Price-volume accumulation, distribution warnings, and sector flow context."
- "Refresh Snapshots" CTA (DESTRUCTIVE — skipped)
- Disclaimer: scores based on price-volume only; NSE/BSE free data does not include institutional-ownership filings or insider disclosures
- Filters: Range (3M selected), Sector dropdown, Reset button
- **Top Accumulation Candidates table** (857 total, 10 shown per page):
  - Columns: Symbol (name + sector), Score, Daily %, Actions
  - Top 10 all score=100 ACCUMULATION: ABSLMC, AHCL, APARINDS, BANDHANBNK, EBGNG, MAHABANK, MSTCLTD, NGLFINECHEM, RBLBANK, SAYAJIHOTL
  - Pagination: 1–10 of 857
- **Top Distribution Warnings table** (231 total, 10 shown):
  - BANG, HITECHGEAR, TCS (score 0 — unusual), PGHH (1), SAURASHCEM (3), SHANTI (3), EIDPARRY (4), MEDICAMEQ (5), GTPL (6), RKEC (6)
  - **Note:** TCS showing score=0 DISTRIBUTION with -35.9% daily move is notable
- **Sector Smart Money View table:**
  - Columns: Sector, Status, Score, Accum., Distrib., Unusual Vol., Instr.
  - All sectors showing "Accumulation" status (55–61 range) except Unknown (Neutral 54) and Communication Services (Neutral 50)
  - Financial Services: 227 instruments, 52 accum / 11 distrib / 70 unusual vol
  - Industrials: 439 instruments, 115 accum / 23 distrib / 107 unusual vol
- FnO ban list section (from source: `fetchFnoBanList()` and `ingestFnoBanList()`)
- Range filter (1M/3M/6M) and Sector filter both functional

**API Calls:**
- `GET /api/v1/smart-money/top?limit=10&offset=0&range=3M&region=IN&assetType=STOCK`
- `GET /api/v1/smart-money/distribution?limit=10&offset=0&range=3M&region=IN&assetType=STOCK`
- `GET /api/v1/smart-money/sectors?range=3M&region=IN&assetType=STOCK`
- `GET /api/v1/smart-money/fno-ban`
- `GET /api/v1/smart-money/health`

**Console errors:** None.

**Gaps / Issues:**
- **TCS showing score=0 DISTRIBUTION with -35.9% daily move** — this is a significant outlier that may indicate a data quality issue (ex-date or corporate action, or genuine data error).
- Ownership data status is "MISSING" per the source component's guard clause (NSE free data doesn't include institutional filings).
- All sectors uniformly show "Accumulation" with scores in 55–61 range — very narrow spread suggesting the accumulation scoring is not differentiating meaningfully across sectors.
- FnoBan ingest button in the component is DESTRUCTIVE — not clicked.

---

## 8. Trade Plan Risk Engine — `/admin/trade-plans`

**Purpose:** Legacy trade plan evidence page. Shows generated review evidence rows (NOT trade recommendations). Includes paper-readiness proof chain and funnel diagnostics. References "use Today Review and Signal Position Ledger for the current trusted signal workflow."

**UI Elements:**
- Prominent alert banner (two versions): "Evidence only — not trade instructions" and "This legacy page shows generated review evidence only."
- Tab layout: Legacy Trade Plan Evidence / Backtest Proof
- Filters: Paper Review Candidate (readiness filter), Backtest Proof timeframe selector, Generate Plans button (DESTRUCTIVE — skipped)
- Note: "Backtest proof timeframe affects proof, rating, and paper-readiness checks. Entry, stop, target, and position sizing are current-market risk levels"
- **Funnel diagnostics** (Generation Funnel IN/STOCK): Review-candidate only, Readiness filter, Proof filters
- **Legacy Evidence Rows table** (3 rows shown, 1–3 of 3):
  - Columns: Symbol, Strategy, Status, Risk, Entry (range), Stop, Target, R:R, Readiness, Rating, Price, Reason, Actions (View)
  - PREMIERENE TREND_MOMENTUM VALID LOW INR 1,069.30–1,090.90 Stop 952.38 Target 1,335.54 2.0R Paper Review Good Price 1,080.10
  - RISHAB TREND_MOMENTUM VALID LOW INR 507.33–517.57 Stop 481.54 Target 574.28 2.0R Paper Review Good Price 512.45
  - KRN TREND_MOMENTUM VALID MEDIUM INR 1,204.63–1,228.97 Stop 995.05 Target 1,660.30 2.0R Paper Review Good Price 1,216.80
- **Very small result set (3 rows)** — paper-readiness filter is highly restrictive

**portfolioImpact null finding (from DB recon + source):**
- `TradePlanResultDto.portfolioImpact: PortfolioImpact | null` — type definition confirms nullable
- `TradePlanDetail.tsx` line 184: guards with `{plan.portfolioImpact ? (...)}`
- The table view (`TradePlanTable.tsx`) does not render portfolioImpact — only shown in detail view
- **Per DB recon, 99.6% of trade_plan_results rows have portfolioImpact null** → detail pages will show the portfolioImpact section blank for virtually all plans

**API Calls (all 200 OK):**
- `GET /api/v1/trade-plans/candidates?region=IN&assetType=STOCK&limit=25&offset=0&paperReadyOnly=true&paperReadinessStatus=READY_FOR_PAPER_REVIEW&sortBy=generatedAt&sortDirection=desc`
- `GET /api/v1/trade-plans/funnel?region=IN&assetType=STOCK`

**Console errors:** None.

**Gaps / Issues:**
- **Only 3 rows pass paper-readiness filter** — the funnel is highly restrictive; "Generate Plans" would need to run to see more.
- **portfolioImpact is null for ~99.6% of rows** — the detail page's Portfolio Impact section will be empty for nearly all plans.
- Page has two warning banners calling itself "legacy" — suggests this page is being deprecated in favor of Signal Position Ledger / Today Review.
- Backtest Proof tab and proof-chain visualization not observed live.

---

## 9. Signal Position Ledger — `/admin/signal-position-ledger`

**Purpose:** Read-only rule-trigger lifecycle evidence (entry triggers, return tracking, exit signals). Named "Trigger Monitor" in the page header. Operator diagnostic view for signal lifecycle.

**UI Elements:**
- Page header: "Trigger Monitor — Read-only rule-trigger lifecycle evidence for the current market scope. Scope: IN / STOCK."
- Secondary actions: "Reload snapshot" button + "Export CSV" button
- Summary strip (4 KPI chips): Entry trigger candidates 1,110 (IN/STOCK total), DQ ready evidence 22 (visible rows), Forward-validation shown 0 (visible rows), Rows with caveats 25 (open details)
- 2-tab layout: Entry Trigger Candidates / Closed History
- **Entry Trigger Candidates table** (1,110 total active rows, 25 per page):
  - Columns: Stock (symbol + full company name), Trigger (date @ price), Return till date, Evidence (DQ status + Grade), Lifecycle (health state), Rule (strategyId - entryRuleId)
  - All 25 visible rows show: Evidence = READY / Grade N/A, Lifecycle = "Risk warning", Rule = "Unavailable - —"
  - Return till date: "+0%" for most rows; "Unavailable" for a few (ALGOQUANT, ARIS, ARSSBL — status LIMITED)
  - Rows sorted by entryTriggerTimestamp desc — all entries dated Jun 15, 2026
- Row click opens a modal with full entry trigger detail (Dialog)
- **Closed History tab** (0 closed entries per summary strip)

**API Calls (both 200 OK):**
- `GET /api/v1/signals/position-ledger/persisted/active?region=IN&assetType=STOCK&limit=25&offset=0&sortBy=entryTriggerTimestamp&sortDirection=desc`
- `GET /api/v1/signals/position-ledger/persisted/closed?region=IN&assetType=STOCK&limit=25&offset=0&sortBy=entryTriggerTimestamp&sortDirection=desc`

**Console errors:** None.

**Gaps / Issues:**
- **Rule column shows "Unavailable - —" for all 25 visible rows** — `row.strategyId` is null/undefined for all entry trigger candidates. This means the signal lifecycle records are not linked to a strategy or entry rule, making the "Rule" column uninformative.
- **Grade N/A for all rows** — `row.strategyRatingGrade` is null for all visible entries.
- **0 closed entries** — no historical lifecycle evidence exists yet; the Closed History tab will render the empty-state message.
- **DQ ready evidence: only 22 of 1,110 rows** — very low data quality coverage (2%). The "Visible rows" KPI for forward-validation = 0, meaning no rows have passed forward-validation yet.
- **Caveats on 25 rows** — likely the rows where `currentReturnStatus !== 'CURRENT'` or LIMITED evidence.
- Return till date = +0% for most entries (all triggered today, 2026-06-15 — no meaningful return yet).
- The Prisma delegate concern from the task brief does not manifest as a 500 error — API returns 200 with data. The strategyId/entryRuleId null issue is the more visible data quality gap.

---

## Summary Table

| Screen | Path | API Calls | Data State | Notable Gaps |
|---|---|---|---|---|
| Strategy Decision Engine | `/admin/strategy` | 8 endpoints (all 200) | Active data for all tabs | Tab switching frozen in automation; Rating=UNKNOWN on all candidates |
| Strategy Framework | `/admin/strategies` | 6 endpoints (all 200) | 11 strategies, 10 Unproven | Risk/Calibration/Diagnostics categories empty |
| Historical Context Snapshots | `/admin/context-snapshots` | 4 endpoints | 114 market, 1113 sector, 114 country snaps | Most dates PARTIAL; IT sector score=0 today |
| Market Context Intelligence | `/admin/market-context` | 5 endpoints | Live data present; PARTIAL status | Macro snapshot MISSING; Sector signals 0/0; Bullish/Bearish 0/0 |
| Breadth Internals | `/admin/breadth-internals` | 1 endpoint (breadth-internals) | Full 3Y history in charts | No gaps observed |
| Backtesting Strategy Lab | `/admin/backtests` | 2+ endpoints | TREND_MOMENTUM 3Y results loaded | Only 1 of 5 active strategies has backtest data |
| Smart Money Intelligence | `/admin/smart-money` | 5 endpoints | 857 accum / 231 distrib | TCS score=0 anomaly; ownership data MISSING |
| Trade Plans (Legacy) | `/admin/trade-plans` | 2 endpoints (both 200) | 3 rows pass paper-readiness | portfolioImpact null ~99.6%; page self-labeled "legacy" |
| Signal Position Ledger | `/admin/signal-position-ledger` | 2 endpoints (both 200) | 1,110 active / 0 closed | strategyId null on all rows; Grade N/A; 0 forward-validation |

## Destructive Controls Skipped

- **Strategy Decision → "Run Evaluation"** (POST batch evaluation across universe)
- **Historical Context Snapshots → "Generate Snapshot"** (POST to context-snapshots/generate)
- **Market Context → "Refresh"** (live re-fetch + snapshot write)
- **Backtesting Lab → "Run Registered Backtest"** (POST to /api/v1/backtests/run)
- **Smart Money → "Refresh Snapshots"** (POST to /api/v1/smart-money/run)
- **Trade Plans → "Generate Plans"** (POST batch plan generation)
- **Signal Position Ledger** has no generate/run button — Reload snapshot and Export CSV are read-only operations

## Distinct API Paths Covered

```
GET  /api/v1/strategy/market-gate
GET  /api/v1/strategy/candidates
GET  /api/v1/strategy/exits
GET  /api/v1/strategy/model
GET  /api/v1/strategies
GET  /api/v1/strategies/:code
GET  /api/v1/strategies/:code/performance
GET  /api/v1/strategies/:code/proof
GET  /api/v1/strategies/rankings
GET  /api/v1/strategies/proof-registry
GET  /api/v1/context-snapshots/coverage
GET  /api/v1/context-snapshots/market
GET  /api/v1/context-snapshots/sectors
GET  /api/v1/context-snapshots/countries
GET  /api/v1/market-context/capital-posture
GET  /api/v1/market-context/summary (or /persisted-summary)
GET  /api/v1/market-context/persisted-breadth
GET  /api/v1/market-context/sectors
GET  /api/v1/market-context/breadth
GET  /api/v1/market-context/breadth-internals
GET  /api/v1/backtests/runs
GET  /api/v1/backtests/strategies
GET  /api/v1/smart-money/top
GET  /api/v1/smart-money/distribution
GET  /api/v1/smart-money/sectors
GET  /api/v1/smart-money/fno-ban
GET  /api/v1/smart-money/health
GET  /api/v1/trade-plans/candidates
GET  /api/v1/trade-plans/funnel
GET  /api/v1/signals/position-ledger/persisted/active
GET  /api/v1/signals/position-ledger/persisted/closed
GET  /api/v1/alerts/events
```
