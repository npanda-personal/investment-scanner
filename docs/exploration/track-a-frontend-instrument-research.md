# Frontend Audit: Instrument & Research Screens

**Audit date:** 2026-06-16
**Method:** Source-code analysis + live API probes (authenticated, `test@example.com`). Computer-use / Chrome extension unavailable during this run — observations are derived from source code and backend API responses rather than rendered screenshots.

---

## 1. Instrument Workspace Landing (`/instrument-workspace`)

**Component:** `InstrumentWorkspaceLandingPage` in `frontend/src/features/market-intelligence/components/MarketIntelligencePages.tsx:314`
**Route:** `market-intelligence/routes.tsx` → `{ path: 'instrument-workspace', element: <InstrumentWorkspaceLandingPage /> }`

### UI Elements
- `PageHeader` with dynamic subtitle derived from `instrumentWorkspaceSubtitle(scope)`.
- A single `Paper` card (max-width 680px) containing:
  - "Open a stock" heading + explanatory copy.
  - `InstrumentSearchSelect` autocomplete — calls `GET /api/v1/instruments?search=<query>&...` on every keystroke; navigates to `/stocks/:id` on selection.
  - Bullet list of what the workspace shows once opened (Market regime, sector strength, relative strength, optionally institutional flow + F&O ban if `profile.capabilities.hasInstitutionalFlow`, latest signal).

### API Calls
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/instruments?search=&page=1&pageSize=20&sortBy=symbol&sortOrder=asc` | Search / list instruments for autocomplete |

### Data Notes
- Instruments list returns 20 items per page; total count field is `null` in the response (no pagination metadata exposed).
- Default sort `asc` by symbol — first page begins with `20MICRONS`, `21STCENMGM`, `360ONE`.
- `price_readiness` is present on each item: many return `READY`; notable symbols (RELIANCE, TCS, INFY) return `INADEQUATE_HISTORY` despite having 2,400–2,800 price bars.

### Gaps / Issues
- No issues with the landing page itself. It is a simple search-and-redirect shell.

---

## 2. UnifiedStockPage — `/stocks/:id` (deep link: `/instrument-workspace/:symbol → /stocks/:id`)

**Component:** `frontend/src/features/market-data-foundation/components/UnifiedStockPage.tsx`
**Deep-link resolver:** `InstrumentWorkspaceSymbolRedirect` (same file) — calls `GET /api/v1/instruments?search=<symbol>` to resolve symbol → id, then redirects to `/stocks/:id`.

### Tabs
The page renders five tabs via `?tab=<value>` query parameter:
| Tab | `value` | Renders |
|-----|---------|---------|
| Overview | `overview` (default) | `InstrumentDetailPage` (activeTab='overview') + `MarketContextRail` |
| Research | `research` | `StockResearchWorkbenchPage` (embedded) |
| Prices | `prices` | `InstrumentDetailPage` (activeTab='prices') + `MarketContextRail` |
| Fundamentals | `fundamentals` | `InstrumentDetailPage` (activeTab='fundamentals') + `MarketContextRail` |
| Signals & History | `signals-history` | `SignalsHistoryTab` / `EquitySignalsHistoryTab` |

### API Calls (all tabs combined)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/instruments/:id` | Instrument record (for `derivativesEligible`) |
| GET | `/api/v1/prices/:id?limit=250` | Historical price series (120 bars requested by InstrumentDetailPage) |
| GET | `/api/v1/prices/:id/latest` | Latest price record |
| GET | `/api/v1/fundamentals/:id` | Fundamentals records |
| GET | `/api/v1/corporate-actions/:id` | Corporate actions |
| GET | `/api/v1/market-intelligence/instrument-context/:id` | Market Context Rail |
| GET | `/api/v1/signals/:id/history?limit=20` | Signals & History tab — signal list |
| GET | `/api/v1/signals/:id/outcomes?horizon=20D` | Signals & History tab — track record aggregate |

---

### 2a. Overview tab + Market Context Rail

**InstrumentDetailPage (activeTab='overview', 'prices', 'fundamentals')**

The `activeTab` prop is **declared in the component's `InstrumentDetailPageProps` interface but never destructured or used inside the function body** (`const InstrumentDetailPage: React.FC<InstrumentDetailPageProps> = () => {`). All three tab values (Overview, Prices, Fundamentals) render the complete page layout — price summary cards, data-coverage row, historical chart, price table, fundamentals table, corporate actions — regardless of the `activeTab` value passed.

**Prior finding: `activeTab` prop ignored / all three tabs render identical layouts → CONFIRMED STILL PRESENT.**

**Data observed for RELIANCE (cmo2xk6uj000kw5og9smyrvys):**
- Latest price: 1307 (date 2026-06-15) — `data_status: COMPLETE`
- Price history: 250 bars returned (limit=250), oldest 2024-05-29; chart gets 120 bars.
- `price_readiness: INADEQUATE_HISTORY` on the instrument record even though 2,811 bars are stored and latest date matches expected. The "Freshness" chip on the page will show "Inadequate History" — a confusing mismatch vs. the COMPLETE data_status on the actual price rows.
- Fundamentals: 11 records (latest: QUARTERLY 2024-12-31, eps 6.44).
- Corporate actions: 15 records (most recent: dividend 2026-06-05, value 6).

**Market Context Rail (RELIANCE):**
- Market regime: `NEUTRAL` (score 53) — present
- Sector strength (Energy): `WEAK` (sectorScore 32, 1W -1.34%, 1M -3.18%) — present
- Relative strength: `absent: true` — no 63d relative return computed. Shows "—" chip.
- Smart Money: `absent: false` — status present.
- F&O ban: `absent: false` — data present.
- Latest signal: `absent: true`, value null — no signal generated for RELIANCE yet.

**Market Context Rail (TCS):**
- Sector strength: `absent: true` — source field exposes raw DB error string `"SectorSnapshot (no rows for sector="Information Technology")"`.
- **Prior finding: raw backend error string leaking into Market Context Rail for TCS → CONFIRMED STILL PRESENT.**
  - The `source` field of `sectorStrength` contains the internal error message. This is used as the `sub` prop in `ContextRow` which renders it as small text under the sector chip, visible to the trader.
- Latest signal: `absent: true`.

---

### 2b. Prices tab

Renders the same `InstrumentDetailPage` layout (see above — `activeTab` prop is ignored). Displays historical chart (Recharts `LineChart`, 120-bar window, date/close only, no volume). Price table shows up to 20 rows with Date/Open/High/Low/Close/Adj.Close/Volume/Source columns. Range band is derived from loaded price array (not a true 52-week field). SMA overlays are absent from this chart (SMA overlays only appear in the Research/Workbench tab chart).

**Gap:** Historical chart is limited to 120 bars (~6 months) for the simple Prices view. There is no range selector here — unlike the workbench which has 1W/1M/3M/6M/YTD/1Y/3Y/5Y/MAX toggle buttons.

---

### 2c. Fundamentals tab

Renders the same `InstrumentDetailPage` layout. Fundamentals table shows Period/Period End/Revenue/EPS/Net Income/PE/Dividend Yield/Shares/Market Cap/Currency/Source/Status columns. `hasFundamentals` capability gates the section (India NSE equity: shown; crypto: hidden).

**Data — RELIANCE:** 11 fundamentals records present. Latest quarterly row: eps 6.44, 2024-12-31.

---

### 2d. Signals & History tab

**Component:** `EquitySignalsHistoryTab` in `UnifiedStockPage.tsx`

**Data status (RELIANCE, TCS, INFY — all three):**
- `GET /api/v1/signals/:id/history?limit=20` → `{ items: [] }` (0 signals)
- `GET /api/v1/signals/:id/outcomes?horizon=20D` → `{ items: [], aggregate: null }`

**Prior finding: Signals & History tab EMPTY, GET /api/v1/signals/:id returned 404 → UPDATED STATUS.**
- The 404 from a prior run is gone — the endpoints now return HTTP 200 with an empty items array and no error.
- The tab renders three panels: "Latest Signal" (shows "No signals available for this stock yet."), "Track Record (20-day horizon)" (shows "No completed signal outcomes yet…"), "Recent Signals" (shows "No signal history available.").
- Root cause confirmed: no signal generation pipeline has been run. Backend message when probing `/api/v1/signals/quality-summary`: `"No persisted signal found for this instrument. Run signal generation via POST /signals/run to populate."`
- This is not a bug — it is a data/pipeline state issue. The UI handles the empty-state correctly with informational copy.

---

### 2e. Research tab (StockResearchWorkbenchPage embedded)

This tab embeds `StockResearchWorkbenchPage` (same component as `/research/stocks/:id`). See Section 3 below for full details.

---

## 3. Stock Research Workbench (`/research/stocks/:id`)

**Component:** `frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx`
**Route:** `{ path: 'research/stocks/:id', element: <StockResearchWorkbenchPage /> }`
**API base:** `GET /api/v1/research/stocks/:id/workbench?range=<range>`

### UI Elements
- Back button to `/research`.
- Overview header: company name, symbol/exchange/country/currency, sector/industry, cap-tier badge (Large/Mid/Small + indicative circuit limit), 52-week range, latest price + daily change, data_status chip.
- Watchlist add icon + alert create icon (read-only safe — dialogs, no auto-submit).
- Signal widget (`SignalWidget`) and Strategy decision widget (`StrategyDecisionWidget`).
- Calibration strip: calibrated score + direction (or "Calibration pending" if absent).
- Price chart with SMA-50 / SMA-200 overlays + volume bars + corporate action reference lines. Range toggle: 1W/1M/3M/6M/YTD/1Y/3Y/5Y/MAX.
- Performance section (selected-range return + 1D/1W/1M/YTD/1Y/3Y CAGR/max drawdown/volatility).
- Fundamental Snapshot (revenue/EPS/net income/P-E/dividend yield/shares/market cap/period).
- Valuation Context (stock vs peer P-E, dividend yield, market cap rank).
- Relative Strength (stock return vs benchmark + peers for selected range).
- Peer Comparison (grid of clickable peer cards).
- Corporate Actions list.
- Signal Evidence / Track Record section.

### API Calls
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/research/stocks/:id/workbench?range=<range>` | All workbench data (assembled snapshot) |

### Data Observed (RELIANCE, range=MAX)
- Symbol: RELIANCE, latest_price: 1307, data_status: COMPLETE, trust.source: NSE_UDIFF_CM_BHAVCOPY
- `chart.prices: 1`, `chart.insufficient_range_bars: true` — only 1 price bar returned for all range values including MAX. This triggers the `insufficient_range_bars` warning banner.
- `chart.adjusted_close_fallback: true` — adjusted_close unavailable; fallback to close.
- `performance.return_1y: -10.68%`, `performance.return_1w: -8.17%` — computed despite chart having only 1 price bar (backend uses stored data, not chart slice for performance).
- `relative_strength.stock_return: null` (data_status: MISSING) — stock return is null, triggering the "Insufficient price history" alert in the Relative Strength section.
- `signalEvidence.status: NO_TRACK_RECORD`, `outcomeDepth: null` — signal evidence section shows "No outcome track record yet" info alert, which is accurate.
- `peers: 10 peers` — peer comparison grid renders.
- `corporate_actions: 15 records` — corporate actions section renders.

**Prior finding: price chart limited to 1-day / "insufficient history" → CONFIRMED STILL PRESENT.**
- The workbench snapshot has only 1 price bar in its `chart.prices` array for ALL range values, for RELIANCE, TCS, and INFY.
- Root cause: the workbench snapshot is assembled live (HTTP 200 not 202, so it is not a NOT_YET_COMPUTED case). The backend workbench service is only returning 1 bar regardless of range. This causes the chart to be effectively blank and `relative_strength.stock_return` to be null.
- The "Data is being prepared by the daily pipeline" NOT_YET_COMPUTED state is not being triggered — the backend returns 200 with real (though data-thin) results.

### TCS Workbench (1Y / MAX)
- Same pattern: chart.prices = 1, insufficient_range_bars = true, relative_strength.stock_return = null.

---

## 4. Research Hub (`/research`)

**Component:** `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx`
**Route:** `researchHubRoutes → { path: '/research', element: <ResearchOverviewPage /> }`
**API:** `GET /api/v1/research/overview?region=IN&assetType=EQUITY`

### UI Elements (layout as rendered)
- `PageHeader` with "Reload Snapshot" button.
- Sticky "As of <timestamp>" banner (when `generatedAt` present).
- **Actionability Summary** — outer Paper card with overallStatus chip, canReviewActionableSetups chip, headline text, grid of 7 `ActionabilityDimensionTile`s (Market Environment / Data Readiness / Signal Evidence / Calibration Readiness / Strategy Proof / Today Review Readiness / Trade Plan Readiness).
- **Market Readiness Hero** — left-bordered card with gate icon (OPEN/CLOSED/UNKNOWN), market gate text, allowed action chips, blockers box, recommended next actions buttons.
- **Signal Track Record Panel** — calls `GET /api/v1/signals/quality-summary?horizon=20D`.
- **Research Priority Board** (4 cards in 2x2 grid):
  - Review Candidates (tradeCandidates)
  - Exit / Reduce Risk (exitCandidates)
  - Watch / Wait (watchCandidates)
  - Avoid / Risk (avoidCandidates)
- **Strategy Proof Panel** (proven/unproven/missing backtest/market blocked counts).
- **Confirmation Layers** (Signal Pulse / Smart Money Alignment / Sector Tailwinds).
- **What Changed Panel** (new candidates / dropped / improved / weakened + stale indicator).
- **Drilldown Analysis Tabs** (Market Pulse / Breadth / Sector Map / Flow).

### API Calls
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/research/overview` | All overview data |
| GET | `/api/v1/signals/quality-summary?horizon=20D` | SignalTrackRecordPanel |
| GET | `/api/v1/market-intelligence/market-pulse?region=IN&assetType=EQUITY&timeframe=1d` | Drilldown: Market Pulse tab |
| GET | `/api/v1/market-context/breadth?region=IN` | Drilldown: Breadth tab |
| GET | `/api/v1/market-intelligence/sectors?region=IN&assetType=EQUITY` | Drilldown: Sector Map tab |
| GET | `/api/v1/smart-money/sectors?window=3M&region=IN&assetType=EQUITY` | Drilldown: Flow tab |

### Data Observed (2026-06-16, IN / EQUITY)

**Overview endpoint:**
- `generatedAt: 2026-06-16T10:09:19Z`
- `dataGaps: ["Research overview snapshot is not ready yet. Run the backend pipeline to materialize this dashboard."]`
- `tradeCandidates: 0`, `watchCandidates: 0`, `exitCandidates: 0`, `avoidCandidates: 0`
- `marketGate: UNKNOWN`
- `strategyProofSummary.provenCandidateCount: 0`, `unprovenCandidateCount: 0`

The page shows the `isNotYetComputed` alert banner: "Data is being prepared by the daily pipeline. The Research Hub snapshot hasn't been computed yet."

**Signal Track Record Panel:**
- `GET /api/v1/signals/quality-summary` returns error: "No persisted signal found for this instrument." — panel shows warning alert.

**Drilldown — Market Pulse tab:**
- `availability: EMPTY` — info alert renders: "Market Pulse snapshot is not available for this scope."

**Drilldown — Sector Map tab:**
- `status: missing`, 0 sector rows — info alert renders.

**Prior finding: Research Hub Priority Board — how many review candidates now (was 0)?**
- **STILL 0.** tradeCandidates, watchCandidates, exitCandidates, avoidCandidates all return empty arrays. The `isNotYetComputed` guard fires because the dataGaps contains "not ready yet."
- Empty-state copy now includes snapshot timestamp and stale indicator (when snapshot age > 1 day).

---

## Summary of Re-Audit Focus Items

| Prior Finding | Current Status | Detail |
|---|---|---|
| Signals & History EMPTY, GET /api/v1/signals/:id returned 404 | PARTIALLY RESOLVED | 404 is gone (HTTP 200 returned). Items array is still empty (no signals generated). UI shows correct empty-state copy. |
| Price chart limited to 1-day / "insufficient history" | CONFIRMED STILL PRESENT | `chart.prices: 1` for RELIANCE/TCS/INFY on all range values including MAX. `insufficient_range_bars: true` warning shown. `relative_strength.stock_return: null`. |
| `activeTab` prop ignored (Overview/Prices/Fundamentals render identical layouts) | CONFIRMED STILL PRESENT | `InstrumentDetailPage` declares the prop in its interface but never destructures or uses it. All three tabs render the full page layout identically. |
| Raw backend error string leaking into Market Context Rail for TCS | CONFIRMED STILL PRESENT | `sectorStrength.source = "SectorSnapshot (no rows for sector=Information Technology)"` rendered as sub-label text under the sector chip. |
| Research Hub Priority Board — 0 review candidates | STILL 0 | Snapshot not yet materialized; `isNotYetComputed` alert fires correctly. |

---

## Notable Empty / Data-State Issues

1. **Chart price series = 1 bar across all instruments and range values** — the workbench backend assembles a snapshot with only 1 price bar regardless of `range` parameter. This makes the price chart effectively a single-point line (invisible) and breaks relative-strength calculation. Needs investigation in `stock-research-workbench` backend snapshot builder.

2. **`price_readiness: INADEQUATE_HISTORY` on RELIANCE/TCS/INFY** — instruments show this status on the instrument record despite having 2,400–2,800 stored bars and `data_status: COMPLETE` on the price rows. The Freshness chip on `InstrumentDetailPage` renders "Inadequate History" which may confuse traders.

3. **`relative_strength.stock_return: null` for all instruments** — always null in workbench data because the chart has only 1 bar; the Relative Strength section shows the "Insufficient price history for the 1Y range" alert. Appears to be a downstream consequence of issue 1.

4. **No signals anywhere** — `GET /api/v1/signals/:id/history` returns 0 items for all tested instruments. Signal generation pipeline has never been run on this environment. Signals & History tab and Signal Evidence in workbench both correctly show "no signals yet" states.

5. **Market Pulse, Sector Map, Breadth all EMPTY** — none of the market-intelligence pipelines have been run. Drilldown tabs on Research Hub all render info-alert empty states. This is a data/pipeline issue, not a UI bug.

6. **Raw internal DB/service error exposed in Market Context Rail (TCS sectorStrength)** — the `source` string `SectorSnapshot (no rows for sector="Information Technology")` is an internal diagnostic message, not a trader-facing label. It leaks through the `ContextRow sub` prop render path.
