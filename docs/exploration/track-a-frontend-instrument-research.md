# Track A — Frontend Instrument & Research Exploration

**Date:** 2026-06-15
**Server:** http://localhost:5181 (ui-userfacing variant)
**Scope:** Instrument Workspace, UnifiedStockPage (all tabs), StockResearchWorkbench, Research Hub
**Method:** Browser automation via preview_* tools — read-only, no destructive actions.

---

## 1. Instrument Workspace Landing (`/instrument-workspace`)

**Purpose:** Entry point for stock lookup. Search the local catalog and open a stock workspace.

**Route registration:** `InstrumentWorkspaceLandingPage` from `market-intelligence/components/MarketIntelligencePages.tsx` — registered at `/instrument-workspace` via `marketIntelligenceRoutes`. **Not** in `market-data-foundation/routes.tsx`.

**UI Elements:**
- PageHeader: "Instrument Workspace" / subtitle describing NSE/BSE coverage
- `InstrumentSearchSelect` component (MUI Autocomplete) — debounce-triggered, calls `GET /api/v1/instruments?search=<query>&page=1&pageSize=20&...`
- "Open" button (submits selected instrument → navigates to `/stocks/:id`)
- Bullet list of what the workspace shows once a stock is open

**API calls on load:**
- `GET /api/v1/auth/me`
- `GET /api/v1/alerts/events`
- `GET /api/v1/market-context/capital-posture`
- `GET /api/v1/instruments?page=1&pageSize=20&sortBy=symbol&sortOrder=asc` (initial catalog load)

**Data rendering:** Landing page has no data panels — purely a search entry point.

**Gaps / Issues:**
- None observed on landing itself. The `InstrumentSearchSelect` autocomplete requires actual keyboard interaction (React debounce) and cannot be reliably exercised via eval injection.

---

## 2. Deep-Link Symbol Resolution (`/instrument-workspace/:symbol`)

**Purpose:** Resolve a human-readable symbol to an instrument ID, then redirect to `/stocks/:id`.

**Route:** `InstrumentWorkspaceSymbolRedirect` in `UnifiedStockPage.tsx`.

**Behavior observed:**
- `/instrument-workspace/RELIANCE` → resolved and redirected to `/stocks/cmo2xk6uj000kw5og9smyrvys`
- `/instrument-workspace/TCS` → `/stocks/cmo2xk6up000lw5og...`
- `/instrument-workspace/INFY` → `/stocks/cmo2xk6uu000mw5og...`
- All three resolved correctly via `GET /api/v1/instruments?search=<SYMBOL>&page=1&pageSize=5` (exact-match preferred, falls back to first result)

**Gaps / Issues:** None. Symbol resolution works correctly for all three tested symbols.

---

## 3. UnifiedStockPage (`/stocks/:id`) — RELIANCE

**Purpose:** Single-instrument workspace with five tabs covering price, research, fundamentals, signals.

**Route:** `stocks/:id` → `UnifiedStockPage` component.

**Tabs:** Overview | Research | Prices | Fundamentals | Signals & History

**Key structural note:** Tabs are rendered by `UnifiedStockPage`. Only `Research` and `Signals & History` swap the main content area; `Overview`, `Prices`, and `Fundamentals` all render `InstrumentDetailPage` — but `InstrumentDetailPage` **ignores the `activeTab` prop** (prop is declared in the interface but the component body does not use it). All three tab states show the same full-page layout: price summary cards, data coverage panel, chart, price table, fundamentals table, corporate actions table. There is no tab-level filtering of content.

### 3a. Overview / Prices / Fundamentals tabs (same content — InstrumentDetailPage)

**API calls on load (all fired in parallel):**
- `GET /api/v1/instruments/:id`
- `GET /api/v1/prices/:id/latest`
- `GET /api/v1/prices/:id?limit=120`
- `GET /api/v1/fundamentals/:id`
- `GET /api/v1/corporate-actions/:id`
- `GET /api/v1/market-intelligence/instrument-context/:id`
- `GET /api/v1/instruments/:id` (second call from `UnifiedStockPage` itself for `derivativesEligible`)

**Data rendered (RELIANCE):**
- Latest Price: ₹1,307.00 as of 6/15/2026
- 120-day price range: ₹1,161.90 – ₹1,456.40
- Exchange: NSE, ISIN: INE002A01018
- Data coverage: through 6/15/2026; freshness chip shows **"Inadequate History"** (price_readiness field)
- Historical price chart (Recharts LineChart, 120 bars)
- Price Table: 20 rows of OHLCV + adjusted close + source column (NSE_UDIFF_CM_BHAVCOPY)
- Fundamentals Table (hasFundamentals=true for India): 6+ quarterly records + 1 annual. Revenue, EPS, Net Income populated. PE Ratio, Dividend Yield, Shares Outstanding, Market Cap all show **N/A** — status "PARTIAL" from source "MANUAL_VERIFIED"
- Corporate Actions: Full history — dividends back to 2014, bonus issues (2017, 2024). Status: COMPLETE.

**Market Context Rail (right column):**
- Market regime: NEUTRAL (53), as of 2026-06-05
- Sector strength: Energy: NEUTRAL
- Relative strength: — (missing)
- Institutional flow: DISTRIBUTION (31), as of 2026-06-15
- F&O eligible: Yes
- F&O ban: Not banned (ban list 2026-06-16)
- Latest signal: — (no signal)

**Gaps / Issues:**
- `activeTab` prop is declared but never consumed — Overview/Prices/Fundamentals show identical content regardless of tab. This is a UX gap: a user clicking "Prices" or "Fundamentals" does not get a focused view.
- Fundamentals: PE Ratio, Dividend Yield, Shares Outstanding, Market Cap all N/A — data marked PARTIAL.
- Relative strength in context rail: missing (—).
- Latest signal in context rail: — (no signal data for RELIANCE).
- Freshness chip shows "Inadequate History" despite data being current to 6/15/2026 — this is the `price_readiness` field from the backend, likely reflecting insufficient historical depth.
- `[MarketDataFoundation]` debug logs fire continuously in the console (432+ entries during session) — these should be removed or gated behind a flag before production.

### 3b. Signals & History tab

**API calls:**
- `GET /api/v1/signals/:id/history?limit=20`
- `GET /api/v1/signals/:id/outcomes?horizon=20D`

**Data rendered (RELIANCE, TCS, INFY — all three tested):**
- Latest Signal panel: "No signals available for this stock yet."
- Track Record (20-day horizon): "No completed signal outcomes yet for this stock."
- Recent Signals table: "No signal history available."

**Gaps / Issues:**
- **Signals & History tab is entirely empty for all three tested instruments** (RELIANCE, TCS, INFY). No signal data has been generated. The Research Hub confirms 1,265 raw signals exist in the universe, but none for these three specific instruments. Signal generation has not been run for these instruments.

### 3c. Research tab (renders StockResearchWorkbenchPage)

See Section 4 below — same component, accessed from both `?tab=research` on UnifiedStockPage and the direct route `/research/stocks/:id`.

---

## 4. Stock Research Workbench (`/research/stocks/:id`)

**Purpose:** Full single-instrument research page — signal evidence, price chart with range selectors, performance metrics, fundamentals snapshot, valuation context, relative strength, peer comparison, corporate actions, signal track record.

**Route:** `research/stocks/:id` → `StockResearchWorkbenchPage` (also embedded in UnifiedStockPage as the Research tab).

**API calls on load:**
- `GET /api/v1/research/stocks/:id/workbench?range=1Y`
- `GET /api/v1/signals/:id` → **404 Not Found** (signal for this instrument does not exist)
- `GET /api/v1/strategy/:id`
- `GET /api/v1/strategy/market-gate`

**Interactive elements:**
- Range selector toggle group: 1W | 1M | 3M | 6M | YTD | 1Y | 3Y | 5Y | MAX (fires `GET /api/v1/research/stocks/:id/workbench?range=<selected>`)
- "Add to Watchlist" icon button → opens modal: "Add RELIANCE to Watchlist" with Watchlist dropdown, Note, Tags fields + Cancel/Add
- "Create Price Alert" icon button → opens modal: "Create Alert Rule" with Name, Scope, Type, Stock pre-filled, Threshold field + Cancel/Create
- "Open Signals Dashboard" icon button (present but not exercised — navigates to signal generation engine)
- "Back to Research Command Center" → `/research`

**Data rendered (RELIANCE, 1Y range):**

| Section | Source | Status | Content |
|---|---|---|---|
| Signal Score | — | — | "No persisted signal found for this instrument. Run signal generation via POST /signals/run to populate." |
| Strategy Decision | strategy API | OK | "Insufficient Data / No Action" — Market Gate: SELECTIVE |
| Price Chart | NSE_UDIFF_CM_BHAVCOPY | COMPLETE | Warning: "Insufficient price bars for the selected range — data gap in this period." Chart shows only 1-day data at 1Y range. |
| Performance | NSE_UDIFF_CM_BHAVCOPY | COMPLETE | 1Y: -10.68%, 1D: -7.27%, 1W: -8.17%, 1M: -7.36%, YTD: 0%, 3Y CAGR: 1.86%, Max Drawdown: N/A, Volatility: N/A |
| Fundamental Snapshot | MANUAL_VERIFIED | PARTIAL | Revenue: ₹1,28,260 Cr, EPS: ₹6.44, Net Income: ₹8,721 Cr, P/E: 18.62 (derived), Yield: 0.88% (derived), Shares: N/A, Market Cap: N/A |
| Valuation Context | NSE_UDIFF_CM_BHAVCOPY | COMPLETE | Stock P/E: 18.62, Peer Avg P/E: N/A, Dividend Yield: 0.88%, Peer Avg Yield: N/A, Market Cap Rank: 1 of 11 |
| Relative Strength | NSE_UDIFF_CM_BHAVCOPY | MISSING | "Insufficient price history for the 1Y range — data gap." |
| Peer Comparison | NSE_UDIFF_CM_BHAVCOPY | PARTIAL | 10 peers listed (ONGC, ADANIENT, COALINDIA, IOC, BPCL, OIL, HINDPETRO, PETRONET, MRPL, AEGISLOG) — price and 1Y return shown, P/E: N/A for all peers |
| Corporate Actions | NSE_CORPORATE_ACTIONS | COMPLETE | Full history: dividends 2014–2026, bonus issues 2017 and 2024 |
| Signal Evidence / Track Record | — | — | "NO TRACK RECORD" — N/A for all metrics (Sample Size, Win Rate, Avg Forward Return, Calibrated Score, Calibrated Direction, Reliability Tier) |

**Range selector behavior:**
- At 3M range: chart still shows insufficient bars, Relative Strength still MISSING, 3M Return shows N/A
- At MAX range: same warnings persist — the instrument has a data gap across all ranges

**Gaps / Issues:**
- `GET /api/v1/signals/:id` returns **404** — no signal record exists for RELIANCE. This is logged as a network failure but handled gracefully in the UI.
- Price chart shows data gap warning across all range selections for RELIANCE — "Inadequate History" freshness matches this.
- Relative Strength section is consistently MISSING for RELIANCE (data gap prevents calculation).
- Peer Avg P/E and Peer Avg Yield both N/A — peer fundamentals not populated.
- Signal Evidence / Track Record: all N/A (no signals have ever been generated for RELIANCE).
- Max Drawdown and Volatility: N/A (insufficient history).
- Strategy says "Data quality marks this instrument ineligible for signals" — `data_quality_readiness: LIMITED`.

---

## 5. Research Hub (`/research`)

**Purpose:** Prioritized market intelligence dashboard — actionability status, priority board, signal track record summary, market pulse drilldown tabs.

**Route:** `/research` → `ResearchOverviewPage` (lazy-loaded).

**API calls on load:**
- `GET /api/v1/research/overview`
- `GET /api/v1/signals/quality/summary?horizon=20D&limit=10000&minSampleSize=0`
- `GET /api/v1/market-intelligence/market-pulse?timeframe=1d`
- `GET /api/v1/market-context/persisted-breadth`
- `GET /api/v1/market-intelligence/sectors`
- `GET /api/v1/smart-money/sectors?range=3M`

**Interactive elements:**
- "Reload Snapshot" button (re-fetches research overview snapshot)
- Drilldown tabs: Market Pulse | Breadth / Participation | Sector Map | Flow / Institutional
- Candidate cards link to `/strategy?instrumentId=:id` (strategy decision engine)
- Candidate cards also link to `/stocks/:id` (instrument icon)
- Action links: "Run Data Quality & Universe Sync" → `/data-quality`, "Run Strategy Evaluation" → `/strategy`, "Generate missing strategy performance summaries" → `/strategies`

**Data rendered (snapshot as of 2026-06-15 15:22):**

**Actionability Banner:**
- Overall: UNPROVEN
- Data Readiness: LIMITED
- Strategy Proof: UNPROVEN
- Signal Evidence: LIMITED (1,265 raw signals — 942 bullish / 323 bearish; quality maturity not wired into Research Hub)
- Market Environment: LIMITED (SELECTIVE)
- Trade Plan Readiness: INSUFFICIENT DATA (service unavailable)
- Calibration Readiness: LIMITED (10,514 calibrated signals, readiness UNAVAILABLE)
- Today Review Readiness: INSUFFICIENT DATA (service unavailable)

**Signal Track Record strip (last 20 trading days):**
- Bullish win rate: 56.5%, Bearish win rate: 50.6%
- Avg 20-day return: +3.0%, Sample size: 583/583
- Best signal type: CONFIRMED_VOLUME_BREAKOUT, Worst: VOLUME_BREAKOUT
- Best sector: Basic Materials, Worst: Utilities

**Research Priority Board:**
- Review Candidates: 0 (none meet proof threshold)
- Exit / Reduce Risk: 0
- Watch / Wait: 5 candidates (ABSLAMC 100, ADANIGREEN 95, ADANIPOWER 92, ATGL 92, AIAENG 89) — all "Unproven / Research Only / UNKNOWN_FROM_SNAPSHOT - HIGH, No backtest summary available"
- Avoid / Risk: 5 candidates (ADANIENT 79, AEGISLOG 59, ABB 66, ICICIBANK 62, SBIN 62) — all same UNKNOWN_FROM_SNAPSHOT / no backtest

**Strategy Proof summary:** 0 Proven, 10 Unproven (all 10 have missing backtests)

**Confirmation Layers:**
- Signal Pulse: 942 Bullish / 323 Bearish (significant bullish dominance)
- Smart Money Alignment: "No direct smart money confirmations detected"
- Sector Tailwinds: Leading: Technology, Utilities, Industrials; 63% above SMA50

**What Changed:** "No changes since the last snapshot."

### 5a. Market Pulse drilldown tab

Shows market health summary inline (from market-pulse API):
- Health score: 54, India VIX: 14.7 (CALM)
- A/D ratio: 2.86, Data through 6/15/2026
- Key indices: Nifty 50: 23,622 (+2.0%), Nifty Next 50: 70,007 (+2.4%), Nifty Midcap 100: 60,768 (+2.4%)
- Strong sectors: Private Bank, Media, Bank Nifty, Capital Markets, Financial Services
- Weak sectors: Consumer Durables, FMCG, Oil and Gas, IT, PSE

### 5b. Breadth / Participation drilldown tab

- Above SMA 50: 62.7%, Above SMA 200: 54.9%
- A/D Ratio: 3.00, 52W Highs: 43, 52W Lows: 4
- Bullish Signals: 0, Bearish Signals: 0 (breadth panel shows 0 — data gap or not persisted from signals)
- Price Universe: 360 instruments, SMA 50 Sample: 360
- Official NSE A/D: not ingested — "Official advance/decline counts from NSE are not yet part of the data pipeline"

### 5c. Sector Map drilldown tab

- 16 sectors, status READY, data through 6/15/2026
- Note: "(Stock-level map not available — sector rotation only)"
- Top: Private Bank (Strong, 79), Bank (Strong, 75), PSU Bank (Improving, 71), Media (Improving, 68)
- Bottom: Energy (Neutral, 46)

### 5d. Flow / Institutional drilldown tab

- Ownership data from institutional filings unavailable for NSE/BSE — using price-volume proxy
- Sector table: Utilities (Accumulating, 61), Energy (Accumulating, 59), Financial Services (Accumulating, 59), Industrials (Accumulating, 59)... Information Technology (Distributing, 0)

**Gaps / Issues:**
- All 10 candidates on Priority Board show "UNKNOWN_FROM_SNAPSHOT" — backtest summaries not generated, strategy proof is UNPROVEN for all.
- 0 Review Candidates — the hub is in a pre-proof state.
- Trade Plan Readiness: INSUFFICIENT DATA (service unavailable).
- Today Review Readiness: INSUFFICIENT DATA (service unavailable).
- Signal Evidence not wired into Research Hub actionability (comment in data: "Signal quality maturity evidence is not yet wired into Research Hub actionability").
- Breadth panel shows Bullish Signals: 0 / Bearish Signals: 0 — this appears to be a persisted breadth snapshot field, not the 1,265 signals reported in the signal quality summary; the discrepancy is unexplained.
- Official NSE advance/decline counts not ingested ("not yet part of the data pipeline").
- Sector Map note: "Stock-level map not available — sector rotation only" — granularity limited to sector level.

---

## 6. Console Observations

**Errors:** No JS errors observed.

**Warnings (React Router):**
- `No routes matched location "/derivatives-intelligence"` — repeated 8+ times. A link/redirect somewhere points to `/derivatives-intelligence` which does not exist in the route tree. The correct route appears to be `/derivatives`.

**Debug spam:**
- `[MarketDataFoundation] Object` and `[MarketDataFoundation] [object Object]` — 400+ debug console.log entries firing throughout the session. These should be removed before production builds.

---

## 7. API Paths Inventory

### Instrument Workspace / UnifiedStockPage
| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/instruments` | search, pagination, sortBy/sortOrder |
| GET | `/api/v1/instruments/:id` | single instrument detail |
| GET | `/api/v1/prices/:id/latest` | latest price record |
| GET | `/api/v1/prices/:id?limit=120` | price history |
| GET | `/api/v1/fundamentals/:id` | fundamentals records |
| GET | `/api/v1/corporate-actions/:id` | corporate action history |
| GET | `/api/v1/market-intelligence/instrument-context/:id` | context snapshot (regime, sector, smart money, signal) |
| GET | `/api/v1/signals/:id/history?limit=20` | signal history (returns empty) |
| GET | `/api/v1/signals/:id/outcomes?horizon=20D` | outcome track record (returns empty) |

### Stock Research Workbench
| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/research/stocks/:id/workbench?range=1Y` | full workbench snapshot |
| GET | `/api/v1/signals/:id` | 404 for RELIANCE — no signal record |
| GET | `/api/v1/strategy/:id` | strategy decision |
| GET | `/api/v1/strategy/market-gate` | market gate status |

### Research Hub
| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/research/overview` | full research hub snapshot |
| GET | `/api/v1/signals/quality/summary?horizon=20D&limit=10000&minSampleSize=0` | signal quality stats |
| GET | `/api/v1/market-intelligence/market-pulse?timeframe=1d` | market pulse |
| GET | `/api/v1/market-context/persisted-breadth` | breadth metrics |
| GET | `/api/v1/market-intelligence/sectors` | sector strength |
| GET | `/api/v1/smart-money/sectors?range=3M` | institutional flow by sector |

### Global (every page)
| Method | Path |
|---|---|
| GET | `/api/v1/auth/me` |
| GET | `/api/v1/alerts/events` |
| GET | `/api/v1/market-context/capital-posture` |

---

## 8. Summary of Notable Gaps / Issues

| # | Screen | Issue | Severity |
|---|---|---|---|
| 1 | UnifiedStockPage | `activeTab` prop declared but ignored — Overview/Prices/Fundamentals tabs render identical full-page content with no tab-level focus | Medium |
| 2 | UnifiedStockPage — Signals & History | Entirely empty for RELIANCE, TCS, INFY — no signals generated for any of these instruments | Medium |
| 3 | Stock Research Workbench | `GET /api/v1/signals/:id` returns 404 for RELIANCE — no signal record; handled gracefully but notable | Low |
| 4 | Stock Research Workbench | Price chart and Relative Strength MISSING across all range selections for RELIANCE due to data gap ("Inadequate History") | Medium |
| 5 | Stock Research Workbench | Peer Avg P/E and Peer Avg Yield all N/A — peer fundamentals not populated | Low |
| 6 | Stock Research Workbench / Fundamentals | PE Ratio, Shares Outstanding, Market Cap all N/A in fundamentals table — source PARTIAL | Low |
| 7 | Research Hub | All 10 Priority Board candidates are UNKNOWN_FROM_SNAPSHOT — backtest summaries not generated; 0 Review Candidates | Medium |
| 8 | Research Hub | Trade Plan Readiness and Today Review Readiness: INSUFFICIENT DATA (service unavailable) | Medium |
| 9 | Research Hub | Signal Evidence not wired into Research Hub actionability | Medium |
| 10 | Research Hub — Breadth | Bullish Signals: 0 / Bearish Signals: 0 in breadth panel (vs 1,265 in signal quality summary) — unexplained discrepancy | Low |
| 11 | Research Hub | Official NSE advance/decline counts not yet ingested | Low |
| 12 | Console | `No routes matched location "/derivatives-intelligence"` — stale link somewhere pointing to removed route | Low |
| 13 | Console | 400+ `[MarketDataFoundation]` debug log entries per session — should be removed/gated | Low |
| 14 | Market Context Rail — TCS | Sector strength shows "— SectorSnapshot (no rows for sector="Information Technology")" — raw debug message leaking into UI | Medium |
