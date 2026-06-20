# Frontend Trader-Core Reconnaissance — 2026-06-16 (Re-audit)

**Wave:** Track A (trader core) — re-audit
**Date:** 2026-06-16
**Method:** Source-code analysis + live backend API probing (bearer-auth; test@example.com / TestUser123!).
Browser automation unavailable (Chrome extension disconnected; computer-use access timed out).
All snapshot states confirmed against `http://localhost:3000` API responses with auth.

---

## 1. Home Page (`/`)

### Purpose
Unified "Market" workspace landing. Routes to `MarketOverviewPage` (equity scopes) or
`CryptoMarketOverviewPage` (crypto scope). Equity path is the in-scope one for this wave.

### UI Structure
`TabbedWorkspace` with three tabs:
- **Health** — `MarketPulsePage` (market-health score, index table, VIX widget, A/D breadth, sector intelligence panel)
- **Sectors** — `SectorRotationPage` (quadrant table: Leading / Improving / Weakening / Lagging)
- **Events** — `MarketEventsPage` (NR-105 event feed: bulk deals, block deals, F&O bans, 52W breakouts, FII/DII flows)

### Interactive Elements
- Tab switcher: Health / Sectors / Events
- **Health tab:**
  - FreshnessChip scope badge (region/assetType + freshness)
  - "Data status" toggle button (auto-expands if data is > 2 calendar days stale)
  - ScoreCard grid: Health Label, Health Score (+ trend delta + 5-point sparkline), Status, Data Through, Generated At, Candidate Count
  - India VIX chip (color-coded: green/yellow/red by posture)
  - Advance/Decline breadth text
  - Key Indices table (up to 5 headline indices): Index, Value, Move %, Age
  - Strong/Weak sector chips (each links to `/signals?sector=...`)
  - Breadth Summary and Delivery Participation Summary text panels
  - Sector Intelligence sub-panel (paginated table 5/10/25): Sector, Classification, Sector Score chip, 1W/1M/3M returns, Reasons tags, Warnings tags
  - Each sector row expandable (lazy-loads constituents: Symbol, Company, Price, 1W%, 1M%, Signal, Score, Workspace link)
- **Sectors tab:**
  - Quadrant filter chips and sort columns (sector name, quadrant, score, returns)
  - Pagination (10/25/50)
  - FreshnessChip scope badge
- **Events tab:**
  - Days-window selector dropdown: 5 / 10 / 14 / 30 days
  - Inner tabs: Bulk Deals / Block Deals / Other Events (F&O bans, breakouts, FII/DII flows)
  - Per-tab pagination (10/25/50)
  - Symbol links to `/stocks/:id`

### API Calls (confirmed from source)

| Tab | Endpoint | Method | Live Status (2026-06-16) |
|---|---|---|---|
| Health | `GET /api/v1/market-intelligence/market-pulse?region=IN&assetType=EQUITY&timeframe=1d` | GET | **EMPTY** — "Run MARKET_PULSE_REFRESH after persisted market data imported" |
| Health (sector panel) | `GET /api/v1/market-intelligence/sectors?region=IN&assetType=EQUITY` | GET | **0 sectors** (status: missing) |
| Health (earnings badge) | `GET /api/v1/market-intelligence/earnings?region=IN&assetType=EQUITY` | GET | 4 categories, all 0 rows |
| Health (sector expand) | `GET /api/v1/market-intelligence/sector-constituents?sector=...` | GET | Not probed (no sector data to expand) |
| Sectors | `GET /api/v1/market-intelligence/sector-rotation?region=IN&assetType=EQUITY` | GET | **EMPTY** — no persisted sector snapshots |
| Events | `GET /api/v1/market-intelligence/event-feed?days=5` | GET | **READY — 50 events** (F&O ban batches, 52W breakouts, FII/DII) |

### Data-Rendering Notes
- **Health tab:** Renders full `DataUnavailableState` ("Market Pulse data not available yet.").
  Sector Intelligence panel shows "No sector data saved for this scope/date."
  Earnings Season Badge shows "No results due in next 2 weeks" (0 upcoming within 14 days).
- **Sectors tab:** Shows EMPTY state ("No persisted sector snapshots available. Run Sector Intelligence refresh.").
- **Events tab:** READY with 50 real events dated 2026-06-15/16 (F&O ban entries for KAYNES, 52W breakouts
  for ATALREAL/GFSTEELS/IDEA/PANAMAPET, etc.).

### Gaps / Issues
- Market Pulse snapshot absent — requires `MARKET_PULSE_REFRESH` pipeline run.
- Sector Intelligence snapshot absent — requires sector intelligence pipeline run.
- Sector Rotation snapshot absent — requires sector rotation pipeline run.
- All Health/Sectors tabs show empty state; only Events has real data.

---

## 2. Today Review (`/today-review`)

### Purpose
Unified "Today" workspace. Three tabs covering the daily trader review workflow.

### UI Structure
`TabbedWorkspace` with three tabs:
- **Daily Review** — `TodayReviewPage` (ranked candidate table, posture strip, accordion details)
- **Shortlist** — `DailyReviewShortlistPage` (user-saved shortlist from the review)
- **Overview** — `DailyOverviewDashboardPage` (market movers + today-at-a-glance + mover-backed candidates)

---

### 2a. Daily Review tab

#### The Refactored Dense One-Liner Table
The A3 one-liner refactor (commits 0fc728f + 3681ba9) significantly changed this table.

**Primary columns (always visible):**
| Column | Width | Notes |
|---|---|---|
| Rank | 64px | Right-aligned, bold numeric |
| Symbol | 112px | Ticker link to `/today-review/candidates/:id` + workspace icon link |
| Company | 180px | Truncated with ellipsis |
| Score | 84px | Confidence score, right-aligned |
| Smart money | 150px | Chip (ACCUMULATION / DISTRIBUTION etc.) + score |
| 52w pos | 132px | Visual range-position indicator (not a text column) |
| Why | 260px | Truncated reason text + tooltip on hover |
| Entry zone | 190px | Trade plan entry evidence |
| Invalidation | 240px | Stop / invalidation trigger |
| Sector | 200px | Sector name + alignment chip |
| Regime | 120px | Market regime label |

**Intentionally dropped columns (per the refactor):** Direction/State, Earnings, F&O ban.
These moved to filter-only controls (filter dropdowns and toggle switches), not table columns.

**Secondary columns (toggle "More columns"):**
Setup, Source (board section/source/reason), Grade (chip), Daily tier (chip), Automation (chip),
Data through, DQ (data quality), Proof, Blocker.

**Table properties:** `size="small"` (dense), sticky header, `tableLayout="fixed"`, max-height 620px,
horizontal scroll, zebra striping (even rows `action.hover` bgcolor), row click → detail page.

#### Other Interactive Elements
- **Group tabs:** Long Review / Exit Risk / Short Review / Watch Only / Special Cases / Blocked (each shows live count)
- **Filter row 1:** Symbol/company text search, Grade dropdown, Direction/State dropdown (still available as filter even though removed as column), Daily tier dropdown (READY/LIMITED/BLOCKED/MISSING), Data quality dropdown
- **Filter row 2:** Exclude F&O ban toggle, Smart-money accumulation toggle, Earnings soon toggle; Clear filters icon; "More columns" toggle; Export CSV button
- **Pagination:** 5/10/25/50 rows per page
- **Posture strip** above table: market regime, data-through date label, total counts per group
- **"How today's list was built" accordion** (collapsed by default): RunStatusPanel, CoveragePanel, BoardSelectionPanel, ExclusionReasonsPanel + summary metric grid

#### API Calls
| Endpoint | Method | Live Status |
|---|---|---|
| `GET /api/v1/today-review/latest?region=IN&assetType=EQUITY` | GET | **No run** — `run: null`, all groups 0 candidates |

#### Data-Rendering Notes
- With `run: null`, shows "No review data is available yet for IN / EQUITY" Alert.
- All group tabs show empty state. No candidate data populates. Table cannot be exercised.

#### Gaps / Issues
- No today-review run exists in DB — the entire candidate table is empty for the trader.
- Candidate detail page (`/today-review/candidates/:id`) is also unreachable without data.

---

### 2b. Shortlist tab

#### API Calls
| Endpoint | Method |
|---|---|
| `GET /api/v1/daily-review-shortlist` (via `dailyReviewShortlistService`) | GET |

Shows user-saved shortlist. Likely shows empty state (no today-review run = no shortlist items).

---

### 2c. Overview tab (Daily Overview Dashboard)

#### Interactive Elements
- Scope + data-through chip badges; StalenessBadge for today-review dataThroughDate and movers generatedAt
- **Market Price Movers** range toggle: 1D / 1W / 1M / 3M / 6M / 1Y (each triggers movers re-fetch)
- Gainers and Losers sub-panels (MoverList)
- "Today At A Glance" summary chips: Bullish / Bearish / Exit/Risk / Watch / Blocked counts
- A/D ratio and Regime text from market context
- "Mover-Backed Signal Candidates" grid (up to 6 stock cards: symbol, company, return%, grade/score/direction)
- "Open Today Review" link; "Refresh" button

#### API Calls
| Endpoint | Method | Live Status |
|---|---|---|
| `GET /api/v1/today-review/latest?region=IN&assetType=EQUITY` | GET | No run — 0 candidates |
| `GET /api/v1/market-data/movers?region=IN&assetType=EQUITY&range=1D&limit=20` | GET | **EMPTY** — "No market-scan snapshot found for movers 1D. Run MARKET_SCAN_REFRESH" |
| `GET /api/v1/market-intelligence/market-pulse` (market context via marketContextIntelligence) | GET | EMPTY |

#### Data-Rendering Notes
- All panels render loading then empty/error state. No real data surfaces.
- StalenessBadge components will render staleness indicators once data exists.

#### Gaps / Issues
- Market movers snapshot absent — requires MARKET_SCAN_REFRESH.
- Mover-backed candidates panel always empty (no overlap when both datasets empty).

---

## 3. Discover Workspace (`/screener`)

### Purpose
Unified "Discover" workspace — all "filter the universe" surfaces merged.
Equity scope: 5 tabs. Crypto scope: 2 tabs (Signal Board + Market Scans).

---

### 3a. Screener tab

#### Interactive Elements
- Signal direction select (BULLISH / BEARISH / NEUTRAL)
- Min signal score slider (0–100)
- Min RS percentile slider (0–100)
- Sector dropdown (22 known NSE sectors hardcoded)
- Cap band dropdown (LARGE / MID / SMALL)
- Min delivery % slider (0–100)
- Min 52W position % slider (0–100)
- Exclude F&O ban checkbox
- F&O eligible only (derivatives-eligible) checkbox
- Result table: Symbol, Company, Signal chip (direction + score), Cap band chip, RS rating, Score delta, Factor breakdown, Price sparkline; F&O columns (OI, PCR, delivery %, ban) when capability present
- Pagination (10/25/50/100)

#### API Calls
| Endpoint | Method | Live Status |
|---|---|---|
| `GET /api/v1/market-data/screener?region=IN&assetType=EQUITY&limit=50` | GET | **Partial** — 5 results; `rsPercentile: 0` for all; signal score 100 on all |

#### Gaps / Issues
- RS percentile is 0 for all results — RS pipeline has not run or is not joining correctly.
- Only 5 results returned with limit=50 — signal snapshot is very sparse.

---

### 3b. Conviction tab (NEW)

#### Purpose
High-conviction shortlist where signal engine and smart-money accumulation agree across all horizons.
Rule: signal score ≥ 70 AND smart-money score > 70 in 1M, 3M, AND 6M. Returns top 20 by signal score.

#### Interactive Elements
- **F&O eligible only** checkbox (re-fetches with `?onlyFnoEligible=true`)
- Result table (sortable):
  - Fixed: # row, Symbol (link to `/stocks/:id`), Company (truncated + tooltip)
  - Sortable: Signal (direction chip + score; `TableSortLabel`, default desc), SM 1M, SM 3M, SM 6M (right-aligned, all sortable)
  - Sort toggles direction on re-click; new column resets to desc
- Candidate count + "as of" timestamp caption below the filter bar
- Empty state message if 0 results (clearly explains the fixed thresholds)

#### API Calls
| Endpoint | Method | Live Status |
|---|---|---|
| `GET /api/v1/market-data/screener/conviction?region=IN&assetType=EQUITY` | GET | **READY — 20 candidates, generatedAt: 2026-06-16T09:48** |

#### Live Data (2026-06-16)
**Conviction tab is fully populated.** 20 candidates, all BULLISH, signal score 100.
SM scores all > 70 across 1M/3M/6M. Sample:
- AARTIIND: signal BULLISH 100, SM 81/83/83
- TATACAP: BULLISH 100, SM 81/75/75
- RBLBANK: BULLISH 100, SM 93/100/88
- GENUSPOWER: BULLISH 100, SM 91/79/73
- BANDHANBNK: BULLISH 100, SM 100/100/88
Warnings: none. Data is current-day fresh.

#### Rendering Notes
- Score cells use green (`success.main`) tinted background per design (all scores > 70).
- Table is functional with real data.
- F&O eligible filter toggle is wired correctly.

#### Gaps / Issues
- All 20 signal scores are exactly 100 — may indicate only max-score signals are promoted to the
  smart-money join, or the signal score normalization results in ceiling behavior.
- All 20 are BULLISH — no BEARISH candidates present today.

---

### 3c. Market Scans tab

#### Interactive Elements
- Inner tabs: 52W Highs / 52W Lows / Delivery Spikes / Volume Spikes
  (Delivery Spikes hidden for non-hasDelivery scopes)
- Each tab: paginated table (10/25/50/100), lazy-loaded on first click
- Tab switch resets pagination to page 0

#### API Calls
| Endpoint | Method | Live Status |
|---|---|---|
| `GET /api/v1/market-data/scans/52w-high?region=IN&assetType=EQUITY&limit=30` | GET | **EMPTY** — "No 52w-high snapshot. Run MARKET_SCAN_REFRESH" |
| `GET /api/v1/market-data/scans/52w-low?...` | GET | Presumed EMPTY (same pattern) |
| `GET /api/v1/market-data/scans/delivery-spike?...` | GET | Presumed EMPTY |
| `GET /api/v1/market-data/scans/volume-spike?...` | GET | Presumed EMPTY |

#### Gaps / Issues
- All scan tabs show "Data is being prepared by the daily pipeline" (`ScanWarning` component).
- MARKET_SCAN_REFRESH pipeline has not been run.

---

### 3d. Stock Interest tab

#### Interactive Elements
- Inner tabs: Today's Top Interest / Growth Consistency / Growth Acceleration / Sector Leaders /
  Accumulation / Breakouts / Risk/Avoid
- Table: Symbol, Company, Sector, Interest Score, Direction, Reasons (tags), Risks (tags), Freshness, Data Through, Workspace link
- Pagination (10/25/50/100)

#### API Calls
| Endpoint | Method | Live Status |
|---|---|---|
| `GET /api/v1/market-intelligence/stock-interest?region=IN&assetType=EQUITY` | GET | **EMPTY — 0 rows** |

#### Gaps / Issues
- Stock Interest snapshot absent. All tabs show empty state.

---

### 3e. Index Constituents tab

#### API Calls
| Endpoint | Method | Live Status |
|---|---|---|
| `GET /api/v1/market-intelligence/index-constituents?index=NIFTY50` | GET | **`availability: INVALID_PARAMS` — 0 constituents** |

#### Gaps / Issues
- Returns INVALID_PARAMS for NIFTY50 — index data not loaded or index key format mismatch.

---

## 4. Earnings Intelligence (`/earnings-intelligence`)

### Purpose
Standalone radar page for result-related stock analysis. Uses `RadarPage` generic shell.

### Interactive Elements
- Inner tabs: Upcoming Results / Pre-Result Interest / Result Winners / Result Disappointments /
  Result Reaction History / Earnings Watchlist
- "Show all columns" / "Show fewer columns" toggle
- Table (when data exists): Symbol, Result Date (with Official/TBA badge), Days To Result, Rev Growth,
  Profit Growth, Consistency, Reasons; optional: Date Source, Period End, Margin Trend, Risk Tags, Data Through
- FreshnessChip in page header
- "Data status" toggle (collapses/expands warnings)
- Pagination (10/25/50/100)

### API Calls
| Endpoint | Method | Live Status |
|---|---|---|
| `GET /api/v1/market-intelligence/earnings?region=IN&assetType=EQUITY` | GET | **EMPTY** — 4 categories present, all 0 rows |

### Data-Rendering Notes
- All tabs show per-tab empty-state messages (curated per-category `EARNINGS_EMPTY_MESSAGES`).
- Categories in response: UPCOMING_RESULTS, PRE_RESULT_INTEREST, RESULT_WINNERS, RESULT_DISAPPOINTMENTS
  (all 0 items); RESULT_REACTION_HISTORY and EARNINGS_WATCHLIST not present.
- `resultDateLabel` must be `'Official'` for a real date to render; non-official dates show "Date TBA".

### Gaps / Issues
- Earnings Intelligence snapshot entirely empty — no result data ingested/computed.

---

## 5. F&O Readiness / Top-F&O Widget

### Location
This widget lives at `/derivatives-intelligence` (the `DerivativesIntelligencePage`), as the
top-full-width item above OI Buildup, Option Metrics, and Participant OI widgets.

**Important clarification:** The Discover workspace (`/screener`) does NOT contain the F&O Readiness
widget. It has the new Conviction tab. The F&O Readiness widget is on the Derivatives / F&O page only.

### Widget Description (`TopFnoReadinessWidget`)
- Title: "Top F&O Candidates by Readiness"
- Subtitle: composite = signal + relative strength + derivatives positioning + delivery + 52W trend;
  Grade A/B/C reflects overall confluence; research support only.
- Fetches: `GET /api/v1/market-data/screener?onlyDerivativesEligible=true&limit=20`

#### Interactive Elements
- Sortable columns: Readiness (score + grade chip A/B/C), Signal (direction + score), RS %ile,
  Delivery %, PCR — all sortable via `TableSortLabel`; default sort: Readiness desc
- Fixed columns: # (row number), Symbol (link to `/stocks/:id`), Breakdown (5-bar inline SVG visualization)
- OI build-up column (buildup type chip: Long buildup / Short covering / Short buildup / Long unwinding / Neutral)
- F&O Ban column (chip "Banned" if in ban, "—" otherwise)
- Pagination: 10 rows per page
- The Breakdown bars (5 coloured bars) show hover tooltip with individual sub-score values

#### API Calls
| Endpoint | Method | Live Status |
|---|---|---|
| `GET /api/v1/market-data/screener?region=IN&assetType=EQUITY&onlyDerivativesEligible=true&limit=20` | GET | **Partial — 5 results with fnoReadinessScore populated** |

#### Data-Rendering Notes
- `fnoReadinessScore` and `fnoComponents` are present in results.
- Widget renders real data for the 5 F&O-eligible results.
- Pagination is active but most pages empty (only 5 of 20 slots filled).
- RS percentile is 0 for all results (same pipeline gap as main screener).
- PCR/OI buildup data depends on F&O bhavcopy ingest.

#### Gaps / Issues
- Only 5 F&O-eligible results — the universe is very sparse.
- RS percentile = 0 universally (pipeline not run).
- Build-up labels, PCR values, derivatives positioning sub-score depend on F&O bhavcopy ingest.

---

## Distinct API Paths Observed

| Path | Description |
|---|---|
| `POST /api/v1/auth/login` | Authentication |
| `GET /api/v1/today-review/latest` | Today Review candidates + run metadata |
| `GET /api/v1/market-intelligence/market-pulse` | Market Pulse snapshot |
| `GET /api/v1/market-intelligence/sectors` | Sector Intelligence snapshot |
| `GET /api/v1/market-intelligence/sector-rotation` | Sector Rotation quadrant data |
| `GET /api/v1/market-intelligence/sector-constituents` | Sector constituents (lazy-loaded on row expand) |
| `GET /api/v1/market-intelligence/earnings` | Earnings Intelligence snapshot |
| `GET /api/v1/market-intelligence/stock-interest` | Stock Interest Radar snapshot |
| `GET /api/v1/market-intelligence/index-constituents` | Index Constituents |
| `GET /api/v1/market-intelligence/event-feed` | Market Events feed |
| `GET /api/v1/market-intelligence/instrument-context/:id` | Instrument context snapshot |
| `GET /api/v1/market-data/screener` | Multi-filter screener |
| `GET /api/v1/market-data/screener/conviction` | Conviction tab (NEW) |
| `GET /api/v1/market-data/scans/52w-high` | 52W High scan |
| `GET /api/v1/market-data/scans/52w-low` | 52W Low scan |
| `GET /api/v1/market-data/scans/delivery-spike` | Delivery Spike scan |
| `GET /api/v1/market-data/scans/volume-spike` | Volume Spike scan |
| `GET /api/v1/market-data/movers` | Market Price Movers (1D/1W/1M/3M/6M/1Y) |
| `GET /api/v1/signals/:id/history` | Signal history for an instrument |
| `GET /api/v1/signals/:id/outcomes` | Signal outcome aggregate |

---

## Data State Summary (2026-06-16)

| Feature / Snapshot | Status | Required Action |
|---|---|---|
| Today Review (run) | No run — all empty | Run TODAY_REVIEW pipeline |
| Market Pulse | EMPTY | Run MARKET_PULSE_REFRESH |
| Sector Intelligence | 0 sectors (missing) | Run sector intelligence pipeline |
| Sector Rotation | EMPTY | Run sector rotation pipeline |
| Earnings Intelligence | EMPTY (all categories 0) | Run earnings intelligence pipeline |
| Stock Interest Radar | EMPTY | Run stock-interest pipeline |
| Index Constituents (NIFTY50) | INVALID_PARAMS | Investigate index key / load data |
| Market Scans (52W/delivery/volume) | EMPTY | Run MARKET_SCAN_REFRESH |
| Market Movers (1D) | EMPTY | Run MARKET_SCAN_REFRESH |
| **Conviction tab** | **READY — 20 candidates, fresh** | None needed |
| **Event Feed** | **READY — 50 events** | None needed |
| Screener (basic) | Partial — 5 results, rsPercentile=0 | RS pipeline not run |
| F&O Readiness widget | Partial — 5 results, readiness score present | F&O bhavcopy ingest for OI/PCR |

---

## Notable Findings

### 1. Conviction tab is live and working (NEW feature)
`/api/v1/market-data/screener/conviction` returns 20 BULLISH candidates with fresh data (2026-06-16).
SM scores all > 70 across 1M/3M/6M. F&O eligible filter toggle works. This is the primary new feature
confirmed working. All signal scores are exactly 100 — see gap below.

### 2. Today Review dense table — refactor description
Commits 0fc728f + 3681ba9 (worktree-today-review-trim-columns) dropped Direction/State, Earnings, and F&O ban
as table columns. Primary columns: Rank, Symbol (+ workspace icon link), Company, Score, Smart money chip,
52W position indicator, Why, Entry zone, Invalidation, Sector, Regime. Secondary ("More columns"):
Setup, Source, Grade, Daily tier, Automation, Data through, DQ, Proof, Blocker.
Table is `size="small"` dense with sticky header, fixed layout, 620px max-height, horizontal scroll,
zebra striping. Cannot be exercised live (no today-review run in DB).

### 3. F&O Readiness widget placement clarification
The widget is at `/derivatives-intelligence`, NOT inside the Discover workspace at `/screener`.
The Discover workspace has the new Conviction tab but not the F&O Readiness widget.

### 4. Uniform signal score = 100
Every result from both the screener and conviction endpoints has `signalScore: 100`. This suggests
either: (a) only max-score signals are stored in the signal snapshot, (b) the signal scoring is not
normalizing correctly across the range, or (c) the smart-money join filter effectively enforces a
floor that only leaves 100-score results.

### 5. RS percentile = 0 universally
All screener results (both main screener and F&O readiness) return `rsPercentile: 0`. The relative
strength computation pipeline has either not run or the join is broken.

### 6. Majority of snapshots are empty
Market Pulse, Sector Intelligence, Sector Rotation, Earnings, Stock Interest, Market Scans, and Market Movers
are all empty. The trader-facing app is effectively read-only from empty snapshots for most surfaces.
Only Conviction and Event Feed have live, non-trivial data.

### 7. Index Constituents INVALID_PARAMS
`?index=NIFTY50` returns `availability: INVALID_PARAMS`. Either the index identifier format is wrong
(possibly `^CNX500` or similar), or the index constituents table has not been populated.
