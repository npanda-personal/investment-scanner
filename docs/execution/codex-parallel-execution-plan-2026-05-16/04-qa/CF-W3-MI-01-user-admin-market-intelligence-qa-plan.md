# User/Admin Market Intelligence QA Plan

Date: 2026-05-29
Mode: QA Planning
Owner: QA Automation / Release Auditor
Work item: Trader-facing market intelligence UX and user/admin segregation
Status: Active execution copy; first no-schema frontend slice implemented and under QA / PO / Architect gate review

## 1. Scope

Validate future implementation of:

- user/admin route segregation,
- Market Pulse,
- Indices Workspace,
- Breadth And Participation,
- Institutional Flow,
- Derivatives Context,
- Market Map,
- Daily Review market-context integration,
- Instrument Workspace market-context rail,
- Portfolio and Watchlist market-context overlays.

This QA plan began as requirements-only. Focused smoke evidence for the first no-schema frontend slice is recorded separately in `CF-W3-MI-01-user-facing-market-intelligence-ui-qa-evidence.md`.

## 2. Primary QA Rule

User-facing pages must not trigger shared data-production or analysis-generation writes.

Any user-facing route that calls a prohibited shared POST/PATCH/DELETE endpoint is a release blocker.

## 3. Static Route And Endpoint Audit

### 3.1 User routes to inspect

- `/`
- `/market-pulse`
- `/today-review`
- `/triggers`
- `/indices`
- `/breadth`
- `/institutional-flow`
- `/derivatives-context`
- `/market-map`
- `/research`
- `/research/stocks/:id`
- `/strategies`
- `/portfolios`
- `/watchlists`
- `/alerts`
- `/notifications`
- `/account`

### 3.2 Prohibited endpoint patterns on user routes

Reject if user pages call:

- `/pipeline/commands`
- `/market-data/*/repair`
- `/market-data/*/backfill`
- `/market-data/*/import`
- `/market-data/*/sync`
- `/ingestion/sync`
- `/data-quality/evaluate`
- `/signals/run`
- `/signals/quality/recalculate`
- `/signals/calibration/run`
- `/smart-money/run`
- `/context-snapshots/generate`
- `/strategy/evaluate`
- `/strategies/*/backtest`
- `/today-review/run`
- `/trade-plans/generate`
- `/signals/position-ledger/active/refresh`

Allowed user writes:

- portfolio CRUD,
- holding CRUD,
- portfolio transactions,
- watchlist CRUD,
- watchlist item CRUD,
- alert rule CRUD,
- alert event read/dismiss,
- notification preference updates,
- account profile updates.

## 4. UI Smoke Verification Matrix

### 4.1 Market Pulse

Verify:

- scope shown,
- data-through date shown,
- source/freshness shown,
- index tape shown or missing-state shown,
- breadth shown or missing-state shown,
- FII/DII shown or missing-state shown,
- derivatives context shown only if approved or explicitly unavailable,
- no production action button exists.

### 4.2 Indices Workspace

Verify:

- index selector exists,
- selected index data shows freshness/source,
- constituents table appears or missing-state explains absence,
- top contributors/detractors appear or missing-state explains absence,
- stock drill-in opens Instrument Workspace,
- no admin data-production action exists.

### 4.3 Breadth And Participation

Verify:

- advances, declines, and unchanged are visible when available,
- SMA50/SMA200 percentages include denominators,
- sector breadth excludes unknown metadata buckets from leadership ranking,
- missing samples are explicit,
- no generation action exists.

### 4.4 Institutional Flow

Verify:

- FII/FPI buy/sell/net values render when available,
- DII buy/sell/net values render when available,
- rolling 5/20-day context renders or is explicitly unavailable,
- copy says "institutional flow context",
- no buy/sell recommendation wording exists.

### 4.5 Derivatives Context

Verify:

- Product Owner approval requirement is visible when implementation is not approved,
- no options trading advice appears,
- PCR/OI/expiry fields render only when sourced,
- missing derivative data is not mislabeled as a stock research blocker unless an approved strategy requires it.

### 4.6 Market Map

Verify:

- range selector works,
- grouping selector works,
- metric selector works,
- portfolio/watchlist overlays are personal-only,
- tile drill-in opens Instrument Workspace,
- add-watchlist and alert actions are personal writes only,
- no shared data mutation action exists.

### 4.7 Daily Review

Verify:

- Market Pulse summary appears before or beside candidates,
- candidate board remains primary,
- market-supportive/narrow/risky/blocked status is visible,
- no "Run Today's Review" user action exists,
- no hidden POST to `/today-review/run` occurs.

### 4.8 Instrument Workspace

Verify:

- Market Context rail exists,
- index/sector context renders or shows explicit data gap,
- F&O eligibility renders where known,
- personal actions are available,
- master-data/provider/signal-generation actions are absent.

### 4.9 Portfolio And Watchlist

Verify:

- personal CRUD still works,
- exposure overlays render or show missing-state,
- exit-risk/invalidation warnings render when available,
- no broker execution action exists.

## 5. Content QA

Reject user-facing copy containing:

- buy now,
- sell now,
- guaranteed,
- profit target,
- price target,
- must buy,
- must sell,
- guaranteed return,
- financial advice,
- automated trade instruction,
- option strategy recommendation.

Preferred copy:

- market context,
- breadth context,
- institutional flow context,
- derivatives context,
- review candidate,
- entry trigger,
- exit trigger,
- invalidation,
- risk warning,
- source freshness,
- data quality,
- evidence.

## 6. Data QA

Every user-facing market page must show:

- `region`,
- `assetType`,
- snapshot/as-of date,
- data-through date,
- source,
- freshness or data-quality state,
- warnings or limitations when present.

Reject if:

- stale data is shown as current,
- denominator-less breadth percentages are shown,
- unknown sectors are ranked as sector leaders,
- derivatives data is shown without source/expiry context,
- FII/DII values are shown without date/source context.

## 7. Suggested Test Commands After Implementation

Frontend:

```text
cd frontend
npm.cmd run test:ui -- daily-overview-dashboard.spec.ts today-trade-review.spec.ts research-hub.spec.ts signal-position-ledger.spec.ts --workers=1 --project=chromium --reporter=list
```

Add new specs when implementation creates the routes:

```text
frontend/tests/ui/market-pulse.spec.ts
frontend/tests/ui/indices-workspace.spec.ts
frontend/tests/ui/breadth-participation.spec.ts
frontend/tests/ui/institutional-flow.spec.ts
frontend/tests/ui/derivatives-context.spec.ts
frontend/tests/ui/market-map.spec.ts
frontend/tests/ui/user-admin-route-segregation.spec.ts
```

Backend focused tests will depend on approved implementation packets and are not defined as executable commands for this requirements artifact.

## 8. Release Blockers

- User nav exposes Pipeline Ops, Market Data repair/import/sync, raw generation, calibration run, or strategy/backtest run pages as ordinary trader pages.
- User page contains a production verb action that writes shared market or analysis data.
- Personal portfolio/watchlist/alert writes are broken by segregation.
- Market Pulse lacks source/freshness information.
- Breadth percentages lack denominators.
- Institutional flow copy implies a recommendation.
- Derivatives page implies options trading advice.
- Admin pages are visually indistinguishable from user pages.

## 9. Exit Criteria

The future implementation can proceed to Product Owner acceptance only when:

- route segregation passes,
- prohibited user endpoint audit passes,
- user market pages show source/freshness/limitations,
- personal workflows pass smoke tests,
- content QA passes,
- and any derivatives implementation has explicit Product Owner approval recorded.
