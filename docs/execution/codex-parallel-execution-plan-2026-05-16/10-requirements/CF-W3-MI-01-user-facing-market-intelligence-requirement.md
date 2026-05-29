# User-Facing Market Intelligence Requirements

Date: 2026-05-29
Mode: Product Requirements
Owner: Product Owner / Stock Market Domain UX
Work item: Trader-facing market intelligence UX and user/admin segregation
Status: Active execution copy; first no-schema frontend slice implemented and under QA / PO / Architect gate review

## Sources Read

- `AGENTS.md`
- `docs/architecture.md`
- `docs/roadmap.md`
- `docs/ux-ui-best-practices.md`
- `docs/codex-agent-team-plan/ux-roadmaps/2026-05-14-lead-ux-redesign-roadmap.md`
- `docs/codex-agent-team-plan/ux-roadmaps/2026-05-14-ux-associate-synthesis-and-po-review.md`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/app/routes.tsx`
- `backend/prisma/schema.prisma`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.md`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.md`
- `backend/src/modules/market-data-foundation/market-data-foundation.fno-underlyings.ts`
- NSE FII/DII activity: `https://www.nseindia.com/reports/fii-dii/`
- NSE advances/declines: `https://www.nseindia.com/market-data/advance`
- NSE Indices: `https://www.nseindia.com/nse-indices`
- NSE data sharing policy list: `https://nsearchives.nseindia.com/web/sites/default/files/inline-files/Data%20list%20under%20NSE%20Data%20Sharing%20Policy%20for%20Research%20and%20Analysis_20250728.pdf`

## Source Verification Note

The Product Owner requested high-value market context including indices, FII/DII activity, derivatives, market map, and breadth. Public NSE pages confirm that NSE exposes FII/FPI and DII activity, advances/declines, NSE index context, and data-sharing categories including index, derivative, settlement, and open-interest data.

The requested claim "NSE Indices owns/manages over 490 Nifty indices as of February 28, 2026" was not confirmed from the current official page during this requirements pass. The current official NSE Indices page observed in this pass says NSE Indices manages more than 400 indices as of August 31, 2025. Implementation requirements must not hardcode the 490 figure unless the Product Owner provides the exact newer official source or a current official source confirms it.

## 1. Product Decision

The app must stop presenting a trader/investor with internal engine pages as if they are investment workflows. The next product direction is a market-intelligence cockpit that answers:

1. What is the market doing?
2. Is participation broad or narrow?
3. Are institutions supporting or pressuring the market?
4. Are derivatives conditions supportive, stretched, or risky?
5. Which sectors, indices, and stocks are leading or weakening?
6. Which rule-backed candidates deserve review today?
7. Which holdings, watchlist names, or active triggers need attention?

This is a user-facing research-support product. It must not expose backend production controls in trader pages.

## 2. User Value

The app becomes useful to a real trader/investor when it shows the market backdrop before individual candidates. A stock candidate is materially different when:

- the parent index is breaking down,
- breadth is narrow,
- FII selling is heavy,
- DII support is absorbing pressure,
- option open interest suggests crowded resistance/support,
- the sector is leading or weakening,
- the stock is in the F&O universe,
- or the user already owns/watches the instrument.

The user-facing experience must combine stock-level evidence with index, breadth, institutional flow, derivatives, sector, and portfolio/watchlist context.

## 3. Scope

This requirement began as documentation and planning scope. The first no-schema frontend slice has now been implemented and is under gate review.

Included:

- Requirements for new user-facing pages and page roles.
- Requirements for admin/data-ops segregation.
- Read-model and API-interface planning needs.
- Acceptance and QA criteria for future implementation.

Not included:

- No additional application code edits from this requirements artifact.
- No Prisma schema edits.
- No route registry edits.
- No package installation.
- No backend data ingestion implementation.
- No broker integration.
- No real-money trade execution.
- No paid data provider requirement.

## 4. User-Facing Market Intelligence Pages

### 4.1 Market Pulse

Primary daily market dashboard.

Must answer:

- Is the selected market supportive, narrow, risky, or blocked?
- Which indices are leading or weakening?
- Is participation broad or concentrated?
- Are FII/DII flows supportive or adverse?
- Are derivatives conditions adding risk or confirmation?
- Which sectors and stocks are driving the move?

Primary data:

- index tape,
- index returns by range,
- advance, decline, unchanged counts,
- breadth ratios and denominators,
- sector leadership and weakness,
- market map summary,
- FII/FPI and DII trend,
- derivatives sentiment summary,
- trusted data status and source freshness.

Rules:

- User page consumes persisted snapshots only.
- No `sync`, `run`, `fetch`, `generate`, `repair`, `backfill`, or `evaluate` buttons.
- Empty states must say whether data is missing, stale, unsupported, or waiting on admin refresh.

### 4.2 Indices Workspace

Purpose: make index context visible before stock review.

Must cover:

- Nifty 50,
- Bank Nifty,
- sector indices,
- broad-market indices,
- approved regional/global indices when data support exists.

Must show:

- index performance,
- constituent table,
- top contributors and detractors,
- breadth inside each index,
- sector weights,
- stock-to-index alignment,
- relation to user watchlists and portfolios.

Instrument pages must add index context:

- index memberships where known,
- stock versus index relative strength,
- stock versus sector relative strength,
- whether the stock is aligned with or diverging from its index/sector.

### 4.3 Breadth And Participation

Purpose: expose market internal health.

Must show:

- advances,
- declines,
- unchanged,
- advance/decline ratio,
- percent above SMA50 and SMA200,
- sample counts for every breadth denominator,
- new highs/lows where available,
- volume or turnover participation where available,
- sector breadth,
- breadth trend.

Rules:

- Denominators must be visible.
- A sample count of zero must not sit beside non-zero breadth percentages unless explicitly explained.
- Missing breadth data must render as a data gap, not `N/A` alone.

### 4.4 Institutional Flow

Purpose: expose FII/FPI and DII capital-market flow context.

Must show:

- buy value,
- sell value,
- net value,
- rolling 5-day and 20-day net flow,
- FII versus DII divergence,
- flow versus index movement,
- flow regime label.

Allowed user-facing labels:

- `FII_ACCUMULATION`,
- `FII_DISTRIBUTION`,
- `DII_SUPPORT`,
- `DII_WITHDRAWAL`,
- `MIXED_INSTITUTIONAL_FLOW`,
- `FLOW_DATA_STALE`,
- `FLOW_DATA_UNAVAILABLE`.

Copy rule:

- Say "institutional flow context".
- Do not say "institutional buy signal" or "sell recommendation".

### 4.5 Derivatives Context

Purpose: provide read-only derivatives market context, not options trading advice.

Must show when approved and data exists:

- index futures trend,
- option-chain summary,
- put-call ratio,
- open-interest change,
- top strikes by OI,
- top strikes by OI change,
- expiry proximity,
- F&O underlying flag for stocks.

Rules:

- Derivatives are an expanded market-data domain and require Product Owner approval before implementation.
- User-facing page must not recommend option trades.
- Display must be framed as context, crowding, risk, and confirmation evidence.
- Missing derivative data must not block core stock research unless an approved strategy explicitly depends on it.

### 4.6 Market Map

Purpose: show the big picture of stocks at a glance.

Must support:

- sector grouping,
- industry grouping where data is trusted,
- market-cap buckets,
- price performance ranges: 1D, 1W, 1M, 3M, 6M,
- signal density,
- trigger density,
- data-quality readiness,
- smart-money status,
- F&O eligibility,
- portfolio/watchlist overlays.

Allowed interactions:

- filters,
- drill into instrument,
- add to watchlist,
- create alert.

Not allowed:

- no shared data mutation,
- no signal run,
- no DQ evaluation,
- no pipeline action.

### 4.7 Daily Review

Purpose: combine Today Review with Market Pulse.

First screen must answer:

- Is the market supportive, narrow, risky, or blocked?
- Which candidates deserve review?
- Which exit or invalidation warnings need attention?

Must include:

- market context cards,
- index trend,
- breadth,
- FII/DII flow,
- derivatives context where approved,
- sector map,
- trusted data status,
- ranked Today Review candidates,
- active trigger summary,
- portfolio/watchlist impact.

Rule:

- Remove user-facing "Run Today's Review". If no persisted review exists, show a data-production-needed state with admin route reference only when admin access is active.

### 4.8 Instrument Workspace

Purpose: make one canonical stock page for drill-ins from candidates, triggers, watchlists, portfolios, alerts, indices, market map, and research queues.

Add a Market Context rail:

- index membership/context,
- sector breadth,
- FII/DII market backdrop,
- F&O eligibility,
- derivatives context where approved,
- stock-versus-index relative strength,
- stock-versus-sector relative strength,
- data quality and source freshness.

Personal actions allowed:

- add to watchlist,
- create alert,
- add or edit portfolio holding where the user chooses to track it.

Not allowed:

- no trade execution,
- no broker order,
- no stock master edit,
- no provider sync,
- no signal generation.

### 4.9 Portfolio And Watchlist Context

Purpose: connect user-owned lists to market conditions.

Must show:

- portfolio index exposure,
- watchlist index exposure,
- sector heatmap,
- holdings in weak or strong breadth pockets,
- FII/DII-sensitive sectors,
- F&O-enabled holdings,
- exit-risk and invalidation warnings,
- trigger overlap.

Personal writes allowed:

- portfolio CRUD,
- holdings/transactions CRUD,
- watchlist CRUD,
- watchlist notes/tags,
- alert rules and alert event lifecycle.

Not allowed:

- no broker execution,
- no automated trade action,
- no shared analysis generation from these pages.

## 5. Admin/Data-Ops Segregation

Move these out of primary user navigation into `/admin/*` or hidden operator routes:

- Market Data Foundation maintenance,
- Pipeline Ops,
- Data Quality evaluation,
- Signal generation,
- Signal calibration,
- Smart-money snapshot generation,
- Historical snapshot generation,
- Strategy evaluation and backtesting runs,
- Today Review run,
- Trade-plan generation,
- Signal Position Ledger refresh,
- catalog import, repair, backfill, provider validation.

Admin pages may use operator language:

- run pipeline,
- repair data,
- generate snapshot,
- backfill price history,
- evaluate data quality,
- refresh ledger.

User pages must use investor language:

- context,
- evidence,
- candidate,
- risk warning,
- data freshness,
- data gap,
- source status,
- review state.

First-slice Product Policy:

- `/admin/*` is an operator organization layer for localhost validation, not access control.
- Admin routes may remain visible to authenticated localhost users in this slice.
- Legacy direct operator routes may remain mounted for compatibility, but must not appear in primary trader navigation.
- Backend role enforcement or direct-route blocking is a separate future requirement.

## 6. Public Interface Needs

Future implementation will likely need these read models or equivalent API contracts:

- `MarketPulseSnapshot`
- `IndexContextSnapshot`
- `BreadthSnapshot`
- `InstitutionalFlowSnapshot`
- `DerivativesContextSnapshot`
- `MarketMapSnapshot`

Every read model must include:

- `region`,
- `assetType`,
- `snapshotDate` or `asOfDate`,
- `source`,
- `sourceUrl` or source identifier where practical,
- `sourceDownloadedAt` where practical,
- `dataThroughDate`,
- `dataQualityStatus`,
- `warnings`,
- `limitations`,
- `createdAt`,
- `updatedAt`.

## 7. Acceptance Criteria

- A trader can understand the day's market environment from one page before reviewing candidates.
- Index, breadth, FII/DII, derivatives, sector, and stock-map context are visible without exposing admin run buttons.
- Every page distinguishes persisted evidence from missing or stale data.
- User-facing pages do not imply direct financial advice, options strategy recommendations, broker execution, or guaranteed outcomes.
- Admin/data-production workflows are clearly separated from investor workflows.
- Personal portfolio/watchlist/alert workflows remain available.

## 8. Product Owner Decisions Still Required

- Approve derivatives-context implementation scope before any schema/API/code work.
- Confirm exact official index-count source if the product wants to cite "over 490 Nifty indices as of February 28, 2026".
- Decide whether `/admin/*` should be visible only to local admin users or direct-route-only during localhost validation.
- Decide whether FII/DII and advance/decline ingestion starts as manual file import, scheduled local pull, or admin-triggered local snapshot generation in a later architecture packet.

## 9. Implementation Findings Addendum

The current implementation is a first no-schema frontend slice, not the full target-state implementation.

Full target requirements remain:

- Market Pulse
- Indices Workspace
- Breadth and Participation
- Institutional Flow
- Derivatives Context
- Market Map
- Daily Review
- Instrument Workspace market-context rail
- Portfolio/Watchlist context overlays
- Clear trader/admin segregation

First slice implemented:

- Trader navigation reframed around market intelligence and personal workflows.
- Admin/data-production navigation grouped under `/admin/*`.
- `/` now opens Market Pulse.
- Added first read-only user pages for Market Pulse, Indices, Breadth, Institutional Flow, Derivatives Context, and Market Map.
- Daily Review no longer exposes user-facing run controls.
- Instrument Workspace no longer exposes market-data sync.
- Research Hub no longer links users into signal/strategy/operator dashboards.
- Signal Position Ledger was removed from trader navigation because its current read path is not safe as a persisted-only user read.

Specific data gaps:

- Index catalog rows may exist, but there is no persisted index membership, constituent weight, contributor/detractor, or index breadth model.
- Breadth is partially available through market-context-style calculations, but official advances, declines, unchanged counts, denominators, and source-attributed freshness are not persisted.
- FII/FPI and DII institutional flow is not modeled or exposed through a read API.
- Derivatives context is not modeled beyond existing F&O eligibility flags on instruments.
- Market Map can be approximated from instruments and movers, but a performant persisted read model is needed for sector, industry, market cap, performance, DQ readiness, trigger density, smart-money status, and F&O overlays.

User-page API policy:

- User pages may call persisted/read-only evidence APIs only.
- User pages must not call endpoints that run, generate, evaluate, calibrate, sync, repair, import, backfill, or refresh shared market/analysis data.
- Personal writes remain allowed: portfolios, holdings, transactions, watchlists, alerts, notes, preferences.
- Alert evaluation is user-owned but should remain carefully worded as "Check Alerts", not system/pipeline evaluation.

Validation findings:

- Frontend build passed.
- Focused Playwright smoke passed for Market Pulse, Daily Review, Research Hub, and user/admin route segregation.
- Lint is blocked because ESLint 9 expects `eslint.config.*`, which the repo does not currently provide.
- Backend build/tests were not run because no backend code changed in this slice.
