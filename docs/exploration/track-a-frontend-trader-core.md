# Frontend Trader Core — Exploration Report

**Wave:** Track A (trader core)
**Date:** 2026-06-15
**Server used:** :5181 (ui-userfacing preview)
**Auth:** Already logged in as test@example.com on first load — no login gate reached.

---

## Navigation Structure (from live snapshot)

Sidebar sections:
- **Daily Decisions:** Today · Market
- **Discover:** Screener · Research Hub · Earnings · Derivatives / F&O
- **My Workspace:** Watchlists · Portfolios · Alerts · Instrument · Copilot

Global header shows: page title · Posture chip (Neutral) · Market selector (IN / STOCK) · theme toggle · Log out.

---

## Screen 1 — Home / Market Overview (`/`)

**Purpose:** Top-level market workspace — health, sectors, and events in one tabbed view.

**Key UI elements:**
- Three tabs: **Health** · **Sectors** · **Events**
- Header: Posture chip ("Posture: Neutral", tooltip explains capital posture vs health gauge)
- "IN" scope button (region selector)

### Health tab

Displays:
- **Market Pulse** card — title "Market Pulse", subtitle "IN / STOCK", freshness "Data through 15 Jun · fresh", question "Is the market healthy enough to take risk?"
- **Data status** button
- Earnings proximity banner: "No results due in next 2 weeks" (0 results from saved Earnings Intelligence data within 0–14 days)
- **Market health (data-quality weighted)** section with metrics:
  - Health Label: **Fragile**
  - Health Score: rendered as a gauge
  - Status: **Partial**
  - Data Through: 6/15/2026
  - Generated At: 6/15/2026 3:20:05 PM
  - Candidate Count: **1,820**
- India VIX: 14.7 | 5D 14.7–17.0 | Posture: Calm (as of 2026-06-12)
- A/D breadth: Advances 1,735 / Declines 606 (A/D: 2.86) as of 2026-06-15
- **Key Indices (3)** — sortable table with index rows
- Sector Intelligence section — two alert banners + full sector table

### Sectors tab

Displays:
- **Sector Rotation** — subtitle "IN / STOCK", freshness "Data through 15 Jun · fresh"
- Description: "Which sectors are money rotating into vs out of? Derived from saved sector intelligence data using relative strength score and 1M momentum."
- **Rotation Map** quadrant chart — Relative Strength (score) vs Momentum (1M return); sector chips clickable (open signal screener filtered by sector)
- **All Sectors** table — sortable by column headers; columns include 1M % (momentum axis) and Score (relative-strength axis); note about null-1M sectors

### Events tab

Displays:
- **Market Events** — "Latest data as of Tue, 16 Jun, 2026 · Generated 4:48:32 pm"
- **Days** dropdown (default: 5d)
- Inner sub-tabs: **Bulk Deals 0** · **Block Deals 0** · **Other Events 50**
  - Bulk Deals: empty ("No bulk deals in the last 5 day(s).")
  - Block Deals: empty at 5d
  - Other Events: 50 events; "Event Type" dropdown filter (default "All Other"); paginated 25/page; "Showing 25 of 50 event(s). For research purposes only."

**API calls observed on `/`:**
```
GET /api/v1/auth/me?region=IN&assetType=STOCK
GET /api/v1/market-intelligence/market-pulse?region=IN&assetType=STOCK&timeframe=1d
GET /api/v1/market-intelligence/sectors?region=IN&assetType=STOCK
GET /api/v1/market-intelligence/earnings?region=IN&assetType=STOCK
GET /api/v1/alerts/events?region=IN&assetType=STOCK
GET /api/v1/market-context/capital-posture?region=IN&assetType=STOCK
GET /api/v1/market-intelligence/sector-rotation?region=IN&assetType=STOCK
GET /api/v1/market-intelligence/event-feed?days=5&region=IN&assetType=STOCK
```

**JS errors:** None.

**Gaps / Issues:**
- Health Label is **"Fragile"** and Status is **"Partial"** — health data is partial, not full. Not a UI bug, but notable data state.
- Bulk Deals and Block Deals tabs both show 0 results for 5d (possibly no deals in that window — not a bug, but worth monitoring).
- Posture calcs show "Calm (as of 2026-06-12)" — 3 days old relative to data-through date of 2026-06-15; minor staleness in the posture snapshot.

---

## Screen 2 — Today Review (`/today-review`)

**Purpose:** Merged "Today" workspace — daily review candidates, shortlist, and overview tabs.

**Key UI elements:**
- Three tabs: **Daily Review** · **Shortlist** · **Overview**
- Header shows "Today" in page title

### Daily Review tab

Displays:
- **Today's Review** — subtitle "IN / STOCK", description "Today's research candidates, ranked. Updated daily after market close."
- Context bar: "Neutral — selective participation | Data through 6/15/2026 | 20 candidates · 10 watch · 0 excluded"
- Info alert: "Missing metadata is shown as context gap, not a hard blocker for price-action review."
- Inner sub-tabs: **Long Review (20)** · **Exit Risk / Short Review (5)** · **Watch (10)** + more
- Filter bar with: Signal type · Sector · Cap Band · Grade · "Clear filters" · "More columns" · "Export CSV" buttons
- Candidates table: 10 rows per page (1–10 of 20), clickable rows → candidate detail page
- **Signal Track Record (last 20 trading days)** panel showing:
  - Win rate: 56.5%
  - Avg hit: 50.6%
  - Avg gain: +3.0%
  - Total signals: 583 / 583
  - Best signal type: CONFIRMED_VOLUME_BREAKOUT
  - Worst signal type: VOLUME_BREAKOUT
  - Best sector: Basic Materials | Worst: Utilities
- **"How today's list was built"** accordion

**Candidate detail (`/today-review/candidates/:id`):**
- Navigating to a candidate (e.g. CUPID) shows: direction, setup type, grade, "Add to Watchlist", "Set Alert", "Refresh" buttons; Business reason, prior occurrence count (34), and full detail.

**API calls observed on `/today-review`:**
```
GET /api/v1/today-review/latest?region=IN&assetType=STOCK
GET /api/v1/alerts/events?region=IN&assetType=STOCK
GET /api/v1/market-context/capital-posture?region=IN&assetType=STOCK
GET /api/v1/signals/quality/summary?horizon=20D&limit=10000&minSampleSize=0&region=IN&assetType=STOCK
GET /api/v1/today-review/candidates/:id?region=IN&assetType=STOCK   (on row click)
```

**JS errors:** None.

**Gaps / Issues:**
- "0 excluded" — no candidates are excluded, could reflect filtering configuration or data state.
- "Exit Risk / Short Review (5)" — only 5 candidates here; sub-tab count not exercised interactively in this pass.

---

## Screen 3 — Discover Workspace (`/screener`)

**Purpose:** Merged Screener / Market Scans / Stock Interest / Index Constituents in one workspace.

**Key UI elements (outer tabs):**
- **Screener** · **Market Scans** · **Stock Interest** · **Index Constituents**

### Screener tab

Displays:
- Title: "Screener" — "Filter NSE/BSE stocks by technicals, fundamentals and signals."
- Filters panel:
  - Signal Direction (MUI Select, options not captured via automation)
  - Sector (MUI Select)
  - Cap Band (MUI Select)
  - Min Signal Score (number input)
  - Min RS Percentile (number input)
  - Min Delivery % (any) — slider, default 0%
  - Min 52W Position % (any) — slider, default 0%
  - F&O eligible only (rank by readiness) — checkbox
  - Exclude F&O Ban — checkbox
  - Limit (number input, default 50)
- Results table: 50 rows at default, paginated (25/page), columns include Symbol, Company, Signal, Score, RS %, Delivery %, etc.
- Pagination: "Rows per page: 25 | 1–25 of 50 | prev/next"

Note: At initial load the table briefly shows "No stocks match these filters" before the API returns — this is a loading race, not a persistent empty state; 50 results are returned.

**API calls observed on Screener tab:**
```
GET /api/v1/market-data/screener?limit=50&region=IN&assetType=STOCK
```
(with filters applied: adds params like `signalDirection`, `sector`, `capBand`, `minSignalScore`, `minRsPercentile`, `minDeliveryPct`, `minPositionPct`, `onlyDerivativesEligible`, `excludeFnoBan`)

### Market Scans tab

Displays:
- Title: "Market Scans" — "Daily screening scans for Indian NSE/BSE equities. Data reflects the latest stored prices."
- Inner sub-tabs: **52W Highs** · **52W Lows** · **Delivery Spikes** · **Volume Spikes**
- 52W Highs: "Stocks within 5% of their 52-week high (breakout watch)" — **30 results**; table columns: Symbol, Company, Sector, Current Price, 52W High, 52W Low, % from High, % from Low, Basis, Signal
- Volume Spikes: "Stocks with latest volume materially above recent rolling average" — **30 results**; "vs 13-day average volume"; columns: Symbol, Company, Sector, Latest…
- Note: "Prices use adjusted close where available. Proximity is to the 52-week adjusted-close high/low over ~365 calendar days…"

**API calls observed on Market Scans tab:**
```
GET /api/v1/market-data/scans/52w-high?region=IN&assetType=STOCK&limit=30
(inferred: /api/v1/market-data/scans/52w-low, /api/v1/market-data/scans/delivery-spike, /api/v1/market-data/scans/volume-spike)
```

### Stock Interest tab

Displays:
- Title: "Stock Interest Radar" — "IN / STOCK | Data through 15 Jun · fresh"
- Description: "Which stocks deserve attention now? Rows are shown in stored data order."
- "Data status" button
- Inner sub-tabs: **Today's Top Interest** · **Growth Consistency** · **Growth Acceleration** · **Sector Leaders** · **Accumulation** · **Breakouts** · **Risk / Avoid**
- Table columns: Symbol, Company, Sector, Interest Score (0–100), Direction, Reasons (tag chips), Risks (tag chips), Freshness, Data Through, Workspace (Open link)
- Sample data: ABSLAMC score 100 "bullish interest", positive reasons, no risks; ADANIPOWER score 100 "bullish interest", weak-delivery risk; AGARIND score 92, "negative-trend weak-delivery" risks

**API calls observed on Stock Interest tab:**
```
GET /api/v1/market-intelligence/stock-interest?region=IN&assetType=STOCK
```

### Index Constituents tab

Displays:
- Title: "Index Constituents" — "Scan an index's internal members — latest signal, price, and 1D move in one view."
- **Index** dropdown selector (default: Nifty 50)
- Summary line: "23 of 50 members bullish — 6 bearish — 17 neutral"
- Membership note: "curated static list as of 2026-06. Update when the index is reconstituted."
- Warning: "1 of 50 member symbols not found in catalog (may be listed under a different symbol or not yet ingested)."
- Columns: #, Symbol, Company, Price, 1D %, Signal; "Show all columns" toggle

**API calls observed on Index Constituents tab:**
```
GET /api/v1/market-intelligence/index-constituents?region=IN&assetType=STOCK
```

**JS errors across /screener workspace:** None.

**Gaps / Issues:**
- Screener shows "No stocks match these filters" transiently on load before API returns — could confuse users if API is slow. Not a crash but a potential UX issue.
- "1 of 50 member symbols not found in catalog" on Index Constituents — data-quality gap for one index member.
- MUI Select dropdowns (Signal Direction, Sector, Cap Band) could not be driven programmatically in browser automation (portal-rendered outside DOM) — filter options not inventoried in this pass; would need manual interaction or source-code read.

---

## Screen 4 — Earnings Intelligence (`/earnings-intelligence`)

**Purpose:** Earnings-driven research — upcoming results, pre-result interest, winners, disappointments, reaction history, watchlist.

**Key UI elements:**
- Title: "Earnings Intelligence" — "IN / STOCK | Data through 15 Jun · fresh"
- "Data status" button
- Six tabs: **Upcoming Results** · **Pre-Result Interest** · **Result Winners** · **Result Disappointments** · **Result Reaction History** · **Earnings Watchlist**

### Upcoming Results tab (EMPTY)

Alert: "No Upcoming Results rows in stored data."
Description: "No stocks have a result date within the next 90 days in stored data. This category populates when an official earnings calendar is available or when period-cadence estimates fall within 90 days."

### Result Winners tab

Populated with data. Sample: ADOR, result date 4/29/2026, Rev Growth +10.7%, Profit Growth +28.1%, Consistency 100. Columns include: Symbol, Result Date (with Official/Unofficial badge), Days To Result, Rev Growth, Profit Growth, Consistency, Reasons.

**API calls observed on `/earnings-intelligence`:**
```
GET /api/v1/market-intelligence/earnings?region=IN&assetType=STOCK
```

**JS errors:** None.

**Gaps / Issues:**
- **Upcoming Results is entirely empty** — no stocks with result date within 90 days in stored data. This is the most visible empty-state gap on this screen. Earnings calendar data appears absent.
- Only a single API endpoint backs all 6 tabs — the frontend filters client-side from one earnings snapshot.

---

## Screen 5 — Derivatives / F&O (`/derivatives`)

**Purpose:** NSE F&O positioning intelligence — OI buildup, option metrics, participant OI, and top F&O readiness ranking.

**Key UI elements:**
- Title: "Derivatives / F&O" — "NSE futures & options positioning intelligence — open-interest buildup from official NSE end-of-day F&O data. Updated daily; for research support only."
- **Top F&O Candidates by Readiness** widget:
  - Description: composite signal-quality score blending signal score, OI build-up, PCR, delivery, RS, 52W trend
  - Grade A/B/C badges; Breakdown bars per factor (hover for values)
  - Timestamp: "as of 5:01:22 PM"
  - Columns: #, Symbol, Readiness (score + grade), Breakdown (bar chart), Signal, RS %ile, Delivery %, OI build-up, PCR, F&O Ban
  - Sample top rows: MOTHERSON 95-A, VBL 93-A, RBLBANK 92-A, PHOENIXLTD 92-A, CUMMINSIND 92-A, OFSS 91-A, ABB 91-A, CGPOWER 91-A, SONACOMS 91-A, BANDHANBNK 90-A
  - F&O Ban column shows "—" for all visible rows (none in ban)

**API calls observed on `/derivatives`:**
```
GET /api/v1/market-data/screener?onlyDerivativesEligible=true&limit=20&region=IN&assetType=STOCK
GET /api/v1/derivatives/oi-buildup?eligibleOnly=true&limit=200&region=IN&assetType=STOCK
GET /api/v1/derivatives/option-metrics?limit=2000&region=IN&assetType=STOCK
GET /api/v1/derivatives/participant-oi?region=IN&assetType=STOCK
```

**JS errors:** None.

**Gaps / Issues:**
- Nav link in sidebar says "Derivatives / F&O" but the registered route is `/derivatives` (not `/derivatives-intelligence`). Attempting `/derivatives-intelligence` gives a React Router "No routes matched" warning and blank page. This is a nav-link/route mismatch risk for any deep-linked URL.

---

## Screen 6 — Trader Setup Radar (`/trader-setup-radar`)

**Purpose:** Actionable swing setups (breakouts, base breakouts, pullbacks).

**Observed state:** Page renders with "Trader Setup Radar data not available yet. Trader Setup Radar backend not available yet. No placeholder rows are shown. Open Stock Interest Radar (available now). Persisted backend read API capability is not implemented for this snapshot yet."

Sub-tabs shown (but empty): Breakouts · Base Breakouts · Pullbacks

**API calls observed:** Only global calls (auth/me, alerts/events, capital-posture). No data-specific endpoint fires (backend not implemented).

**Gaps / Issues:**
- **Entire screen is a stub / not yet implemented.** The empty-state message is informative ("backend not available yet") but the screen is in the live nav, reachable from `/trader-setup-radar`.

---

## Screen 7 — Compounder Radar (`/compounder-radar`)

**Purpose:** Long-term durable growth companies.

**Observed state:** "Compounder Radar data not available yet. Compounder Radar backend not available yet. No placeholder rows are shown. Open Stock Interest Radar (available now). Persisted backend read API capability is not implemented for this snapshot yet."

Sub-tabs shown (but empty): Consistent Growth · Quality + Growth · Growth + Momentum · Margin Expansion · Ownership Su…

**API calls observed:** Only global calls. No data endpoint fires.

**Gaps / Issues:**
- **Entire screen is a stub / not yet implemented.** Same pattern as Trader Setup Radar.

---

## Screen 8 — Risk Radar (`/risk-radar`)

**Purpose:** Stocks to avoid based on stored risk data.

**Observed state:** "Risk Radar data not available yet. Risk Radar backend not available yet. No placeholder rows are shown. Open Stock Interest Radar (available now). Persisted backend read API capability is not implemented for this snapshot yet."

**Gaps / Issues:**
- **Entire screen is a stub / not yet implemented.** Same pattern as Trader Setup Radar and Compounder Radar.

---

## Global / Cross-cutting Observations

### APIs that fire on every page (global layout)

```
GET /api/v1/auth/me?region=IN&assetType=STOCK         — auth session check
GET /api/v1/alerts/events?region=IN&assetType=STOCK   — events feed for posture banner
GET /api/v1/market-context/capital-posture?region=IN&assetType=STOCK  — Posture chip in header
```

### Full list of distinct API paths observed (trader core)

| Method | Path | Fires on |
|--------|------|----------|
| GET | `/api/v1/auth/me` | every page |
| GET | `/api/v1/alerts/events` | every page |
| GET | `/api/v1/market-context/capital-posture` | every page |
| GET | `/api/v1/market-intelligence/market-pulse` | Home/Health |
| GET | `/api/v1/market-intelligence/sectors` | Home/Health |
| GET | `/api/v1/market-intelligence/sector-rotation` | Home/Sectors |
| GET | `/api/v1/market-intelligence/event-feed` | Home/Events |
| GET | `/api/v1/market-intelligence/earnings` | Earnings Intelligence |
| GET | `/api/v1/market-intelligence/stock-interest` | Discover/Stock Interest |
| GET | `/api/v1/market-intelligence/index-constituents` | Discover/Index Constituents |
| GET | `/api/v1/market-data/screener` | Discover/Screener + Derivatives (filtered) |
| GET | `/api/v1/market-data/scans/52w-high` | Discover/Market Scans |
| GET | `/api/v1/market-data/scans/{type}` | Discover/Market Scans (other scan types) |
| GET | `/api/v1/today-review/latest` | Today Review |
| GET | `/api/v1/today-review/candidates/:id` | Candidate detail |
| GET | `/api/v1/signals/quality/summary` | Today Review (track record panel) |
| GET | `/api/v1/derivatives/oi-buildup` | Derivatives / F&O |
| GET | `/api/v1/derivatives/option-metrics` | Derivatives / F&O |
| GET | `/api/v1/derivatives/participant-oi` | Derivatives / F&O |

### All API calls returned HTTP 200 — no failures observed.

---

## Summary of Notable Gaps / Issues

| Screen | Gap | Severity |
|--------|-----|----------|
| `/trader-setup-radar` | Entire backend not implemented; screen shows stub state | High — screen in nav but non-functional |
| `/compounder-radar` | Entire backend not implemented; screen shows stub state | High — screen in nav but non-functional |
| `/risk-radar` | Entire backend not implemented; screen shows stub state | High — screen in nav but non-functional |
| `/derivatives-intelligence` | Route does not exist (correct path is `/derivatives`); nav link label mismatch | Medium — deep-link / external URL breaks silently |
| Earnings / Upcoming Results | Entirely empty — no earnings calendar data populated | Medium — key tab always empty |
| Home / Events | Bulk Deals and Block Deals both 0 for 5d window | Low — may be legitimate (no deals that week) |
| Home / Market Pulse | Health Label "Fragile", Status "Partial" | Informational — data state, not UI bug |
| Screener | Transient "No stocks match" state before API returns | Low — UX jitter on load |
| Index Constituents | 1 of 50 Nifty 50 members not found in catalog | Low — data-quality gap |
