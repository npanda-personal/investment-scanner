# Market Pulse, Indices, Breadth, Flow, And Derivatives UX Requirements

Date: 2026-05-29
Mode: UX Requirements
Owner: UX / Product Owner
Work item: Trader-facing market intelligence surfaces
Status: Active execution copy; first no-schema frontend slice implemented and under QA / PO / Architect gate review

## 1. UX Objective

The user should start from a market cockpit, not a module directory. The product should feel like a serious local research terminal for repeated daily use:

1. market backdrop,
2. participation and breadth,
3. institutional flow,
4. derivatives context where approved,
5. sector and stock map,
6. rule-backed candidates,
7. portfolio/watchlist impact,
8. instrument-level drill-in.

The UX must keep diagnostics available without burying the daily answer.

## 2. Navigation Model

### User navigation

Recommended primary groups:

- Daily
  - Market Pulse
  - Daily Review
  - Active Triggers
- Market
  - Indices
  - Breadth And Participation
  - Institutional Flow
  - Derivatives Context
  - Market Map
- Research
  - Research Queue
  - Instrument Workspace
  - Strategy Library
- Personal
  - Portfolios
  - Watchlists
  - Alerts
- Account
  - Notifications
  - Account

### Admin navigation

Admin/data-ops pages move to an operator area:

- Market Data Ops
- Pipeline Ops
- Data Quality Ops
- Signal Ops
- Strategy/Backtest Ops
- Snapshot Ops
- Local Product Admin

The user navigation must not include data-production verbs.

## 3. Page Requirements

### 3.1 Market Pulse

User goal:

- Decide whether the market is supportive, narrow, risky, or blocked before reviewing stocks.

Information hierarchy:

1. Market state ribbon: supportive/narrow/risky/blocked, data freshness, scope.
2. Index tape: major indices and sector indices.
3. Breadth strip: advances, declines, unchanged, breadth ratio, SMA breadth.
4. Institutional flow: FII/FPI net, DII net, rolling 5/20-day trend.
5. Derivatives sentiment: PCR, OI change, expiry proximity, crowding warning.
6. Sector leadership and market map preview.
7. Candidate and trigger summary.

Empty states:

- `No persisted market pulse snapshot for IN / STOCK.`
- `Institutional flow snapshot is missing. Admin data refresh required.`
- `Derivatives context is not approved for this scope.`

Forbidden:

- no run/generate/sync/refresh-pipeline button.

### 3.2 Indices Workspace

User goal:

- Understand what the index structure says before trusting stock-level candidates.

Information hierarchy:

1. Index selector and scope.
2. Index performance table.
3. Constituents and weights.
4. Top contributors/detractors.
5. Internal breadth for selected index.
6. Sector composition.
7. User exposure: holdings/watchlist names inside the index.

Detail path:

- Stock row opens Instrument Workspace.

Acceptance notes:

- If constituent data is missing, the page still shows available index tape and states that constituent attribution is unavailable.

### 3.3 Breadth And Participation

User goal:

- Know whether the market move is broad or narrow.

Information hierarchy:

1. Breadth verdict.
2. Advance/decline/unchanged counts.
3. Percent above SMA50/SMA200 with denominators.
4. New highs/lows where available.
5. Volume/turnover participation where available.
6. Sector breadth ranking.
7. Breadth trend chart.

Rules:

- Denominators are required.
- Unknown or zero sample states must be explicit.
- Missing sector metadata must be separated from real sector ranks.

### 3.4 Institutional Flow

User goal:

- Understand whether institutional money is adding support, pressure, or mixed signals.

Information hierarchy:

1. Flow regime label.
2. FII/FPI buy, sell, net.
3. DII buy, sell, net.
4. Rolling 5/20-day net flow.
5. Flow divergence versus index movement.
6. Sector sensitivity notes when available.
7. Source and data-through date.

Copy constraints:

- Use "institutional flow context".
- Avoid "buy signal", "sell signal", "must act", or options-style advice.

### 3.5 Derivatives Context

User goal:

- Use derivatives data as context for market crowding, risk, and confirmation.

Implementation status:

- Requires Product Owner approval before runtime implementation.

Information hierarchy:

1. Approval/status banner.
2. Index futures trend.
3. Option-chain summary.
4. Put-call ratio.
5. Open-interest change.
6. Top OI and OI-change strikes.
7. Expiry proximity.
8. F&O underlying flag on instrument rows.

Rules:

- No options trade recommendations.
- No "write/sell option" workflow.
- No broker or execution language.

### 3.6 Market Map

User goal:

- See which parts of the market are hot, weak, data-ready, signal-dense, or trigger-heavy.

Controls:

- range: 1D, 1W, 1M, 3M, 6M,
- grouping: sector, industry, market cap,
- metric: performance, signal density, trigger density, DQ readiness, smart-money, F&O eligibility,
- overlay: portfolio, watchlist.

Interactions:

- drill into Instrument Workspace,
- add to watchlist,
- create alert.

Visual rules:

- It should be dense and work-focused.
- Do not use decorative charts that hide labels or state.
- Missing metadata buckets must not be ranked as business sectors.

### 3.7 Daily Review

User goal:

- Review candidates in context.

First viewport:

- market state ribbon,
- ranked candidate board,
- exit/invalidation summary,
- data freshness/trust state.

Supporting panels:

- breadth,
- institutional flow,
- derivatives context,
- sector map,
- trusted data status,
- exclusion reasons.

Important change:

- The user page must not run Today Review. It consumes the latest persisted Today Review. Admin/data-ops owns generation.

### 3.8 Instrument Workspace

User goal:

- Understand a stock's setup in market context.

Primary sections:

- stock header and latest trusted price,
- price chart,
- active trigger/history,
- Today Review state,
- strategy proof,
- data quality,
- index/sector relative strength,
- institutional/market backdrop,
- F&O eligibility and derivatives context where approved,
- smart-money context,
- portfolio/watchlist/alert context.

Allowed personal actions:

- add to watchlist,
- create alert,
- add/edit holding.

Forbidden:

- stock master edits,
- provider sync,
- signal generation,
- trade execution.

### 3.9 Portfolio And Watchlist Context

User goal:

- See how personal exposure maps to market conditions.

Required overlays:

- index exposure,
- sector heatmap,
- holdings/watchlist names in weak or strong breadth pockets,
- FII/DII-sensitive sectors,
- F&O-enabled holdings,
- exit-risk and invalidation warnings,
- active trigger overlap.

Allowed actions:

- personal CRUD for portfolios/watchlists/alerts.

Forbidden:

- shared analysis runs,
- broker execution,
- automated trade action.

## 4. Shared UX Rules

- Every market page shows `region`, `assetType`, data-through date, source, and freshness.
- Every stale/missing source has a specific empty state.
- User pages must not expose production verbs: run, generate, sync, repair, backfill, ingest, evaluate, calibrate.
- Admin links, if shown to admin users, must be visually separated and labeled as data operations.
- Research-support language is mandatory.
- No direct financial advice wording.

## 5. First Implementation Slice Recommendation

First user-facing slice after architecture approval:

1. Create user/admin route classification and nav separation.
2. Convert home into `Market Pulse` shell that consumes available persisted read models and renders missing-state placeholders for not-yet-built read models.
3. Remove run/generation controls from user-facing Today Review and Signal Position Ledger.
4. Add market context rail requirements to Instrument Workspace.

This slice creates immediate product clarity without requiring derivatives or FII/DII ingestion to be implemented first.

## 6. UX Acceptance Criteria

- A user can identify market regime, breadth, flow, sector leadership, and candidate count from the first screen.
- Candidate and trigger workflows are visually connected to market context.
- User-facing pages do not contain admin production controls.
- Personal workflows remain available and clearly personal.
- Missing data explains what is missing and which admin/data source owns resolution.
