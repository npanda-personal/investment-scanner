# CF-W2-DOV-01 - Daily Overview Interactive Market Dashboard Requirement

Date: 2026-05-26

Owner: Team 02 - Product / Requirement Factory

Status: New requirement draft. Not Ready for Implementation. Team 03 architecture prep required first.

Primary route affected:

- frontend `/` currently labeled `Daily Overview`

Suggested feature/module path:

- Frontend feature: `daily-overview-dashboard`
- Backend module only if Team 03 proves a dashboard summary adapter is needed: `daily-overview-dashboard`

## Product Goal

Redesign the current Daily Overview page into an interactive market overview dashboard that gives a real user one dedicated place to understand the most important investor/trader information from filtered system data.

Today the `/` page is only a launch-card surface. The user now has thousands of data points spread across Today Review, Research Command Center, Market Context, Data Quality, Raw Signals, Signal Calibration, Smart Money, Backtests, and Pipeline Ops. The dashboard should reduce that navigation burden without pretending to know more than the current source can prove.

This page is a research-support workspace, not a landing page and not a direct-action trading screen.

## Current Source Baseline

Current `/` page:

- `frontend/src/app/HomePage.tsx`
- shows only five launch cards and no cross-system summary

Current reusable summary surfaces already exist in source:

- Today Review run status, trust status, trusted-universe counts, grouped candidate counts, warnings
- Research Command Center actionability, market-readiness, research priorities, strategy-proof summary, confirmation summary, what-changed, next actions
- Market Context regime, breadth, sector leadership, region strength, macro status
- Data Quality summary and per-use-case readiness context
- Raw Signals counts and latest run context
- Signal Calibration summary counts and readiness/influence/evidence context
- Smart Money accumulation/distribution and sector view
- Backtesting run summaries and strategy proof context
- Pipeline Ops active/latest run and stage status

The dashboard should reuse those truths where they already exist instead of inventing a second scoring layer.

## User Goal

When the user opens the app, they should immediately know:

- whether the current market scope is trustworthy enough for review;
- whether there are meaningful review candidates or only warnings/blockers;
- what the market environment and confirmation layers currently imply;
- whether upstream data/pipeline issues are undermining trust;
- where to drill next for actionability, diagnostics, or deeper research.

## Primary User Journey

1. Open `/`.
2. Read one top-level scope and trust summary.
3. Scan the most important market/review state changes.
4. Drill into the most relevant next surface:
   - Today Review
   - Research Command Center
   - Market Context
   - Data Quality
   - Raw Signals
   - Signal Calibration
   - Smart Money
   - Pipeline Ops
5. Return to `/` and keep the dashboard as the primary orientation surface.

## Information Hierarchy

Order matters. The page should surface user value and truth in this sequence:

1. Global scope + freshness + trust header
2. Daily market pulse and reviewability status
3. Review candidate and research-priority summary
4. Market environment and confirmation layers
5. Signal/evidence health summary
6. Data trust and pipeline health
7. Drilldown shortcuts
8. Clearly tagged `Coming soon` placeholders for valuable but not yet truthful summary areas

## Required Dashboard Sections

### 1. Header Rail

Must show:

- page title `Daily Overview`
- current `region / assetType`
- latest dashboard generated/loaded timestamp if available
- visible research-support disclaimer
- refresh action

Must not look like a marketing hero or static launch page.

### 2. Daily Pulse

This is the most important section.

Use existing truthful read-side evidence from Today Review and Research Command Center to show:

- Today Review run status
- trust status
- market gate / actionability headline
- review mode
- trusted-universe count versus catalog count where available
- required data-through date
- stored/current data-through date
- top warning or blocker summary
- next best action/drill route

This section should answer: `Can I trust the current scope enough to review setups today, and what is the first thing I should check?`

### 3. Review Candidate Summary

Use current filtered outputs from Today Review and Research Hub to show:

- Long review candidate count
- Exit-risk review count
- Watch-only count
- Blocked count
- top research-priority candidates or top next actions where current source already exposes them

Interactive behavior:

- segmented/tabbed switching between candidate groups or priority groups
- row-level drill routes to Today Review or Research/stock detail

Do not surface Trade Plan target, target price, reward/risk, or execution-like copy in this dashboard summary.

### 4. Market Environment And Confirmation

Use Market Context plus Smart Money plus Research Hub confirmation summaries to show:

- market regime
- breadth status
- leading sectors
- weak sectors
- smart-money accumulation count
- smart-money distribution count
- strongest confirmation notes
- strongest contradiction notes

This section should help the user decide whether the day is broadly supportive, mixed, or cautionary without giving advice language.

### 5. Signal And Evidence Health

Use existing Raw Signals, Calibration, and Strategy/Research proof summaries where public truth already exists to show:

- bullish / bearish / neutral raw signal counts
- latest signal generation run freshness/status where available
- calibration usable / limited / unavailable summary
- calibration evidence warning count where available
- strategy-proof proven / unproven summary
- missing backtest or blocked-by-market-gate counts where available

This section should stay evidence-oriented. It must not collapse raw signals, calibrated evidence, and strategy proof into one invented confidence number.

### 6. Data Trust And Pipeline Health

Use Data Quality, Market Data readiness context, and Pipeline Ops to show:

- DQ ready / limited / blocked summary
- key DQ blocker themes if available
- latest pipeline active run or latest completed run
- stage warnings / failed stage count / blocked stage count where available
- direct link to Pipeline Ops and Data Quality details

This section must make trust and freshness problems visible before the user misreads downstream candidate counts.

### 7. Drilldown Strip

Provide fast routes into:

- Today Review
- Research Command Center
- Market Context
- Raw Signals
- Signal Calibration
- Data Quality
- Smart Money
- Pipeline Ops
- Backtests

Each route should carry a small amount of truthful context, such as a count, status chip, or freshness label, only when that source already exposes it.

## `Coming soon` Placeholders

Use clearly tagged `Coming soon` sections only where the user would reasonably expect the information but the current source does not yet provide a stable truthful dashboard summary.

Recommended placeholders:

1. `Coming soon - Signal Position Follow-Through`
   - depends on `CF-W2-SPL-01B` plus the later durable closed-history/lifecycle child
   - should eventually summarize active signal positions and later closed follow-through, but must not be faked now

2. `Coming soon - Calibration Evidence-Through Summary`
   - depends on `CF-W2-CAL-02`
   - current calibration surfaces show useful row-level evidence/readiness, but the dashboard should not imply a truthful scope-wide evidence-through basis until that requirement lands

3. `Coming soon - Measured Outcome Follow-Through`
   - depends on Signal Quality / outcome read-model maturity
   - should eventually summarize whether recent signals have enough measured follow-through evidence to trust the current regime, but must remain placeholder-only until a stable summary source exists

## UX Requirements

The Daily Overview redesign must behave like a working dashboard:

- dense but readable
- scrollable in importance order
- interactive filters/tabs where they reduce page-hopping
- clear drilldown ownership for every section
- visible empty, limited, and blocked states
- no decorative launch-grid feel
- no oversized hero composition
- no direct financial-advice wording

## Trust Rules

- Reuse source module truth; do not invent a new global confidence score.
- If two modules disagree, show the disagreement as a warning or `mixed evidence` state instead of silently choosing one.
- Every section must identify its source basis or visibly route to the source page.
- Stale, missing, partial, or blocked evidence must remain visible.
- Signals remain research-support evidence only.
- Targets, reward/risk, realized P/L, and execution framing must stay out of this dashboard.

## Acceptance Criteria

- `/` is redefined from a launch-card page into a true Daily Overview workspace dashboard.
- The page gives one dedicated area for the most important cross-system filtered information.
- The first viewport shows scope, freshness/trust context, and daily pulse rather than generic navigation cards.
- The dashboard includes distinct sections for daily pulse, review candidate summary, market environment/confirmation, signal/evidence health, data trust/pipeline health, and drilldowns.
- Every section uses existing truthful data or an explicit `Coming soon` placeholder.
- The page preserves research-support language and avoids financial-advice, target, and reward/risk wording.
- The dashboard does not require portfolio ownership, broker execution, or Trade Plan target semantics to feel complete.
- Empty/blocked states explain why data is absent and where the user should drill next.
- No requirement text assumes Prisma/schema, package, provider/live, startup/backfill, or shared-UI changes are pre-approved.

## Non-Goals

- No broker/execution surface
- No portfolio-performance dashboard
- No Trade Plan target or reward/risk summary cards
- No cross-system score that overrides source-module truth
- No cloud/paid/telemetry dependency
- No hidden provider/live fetches from the dashboard
- No promise of signal-position lifecycle summaries until the ledger path is truthful

## Dependencies

- Today Review persisted run/candidate summaries
- Research Command Center overview contract
- Market Context summary
- Data Quality summary and readiness context
- Raw Signals latest run/list summary
- Signal Calibration summary/readiness context
- Smart Money summary
- Pipeline status summary
- strategy/backtest proof summaries where already public

## Explicit Forbidden Scope

Do not assume this requirement automatically approves:

- Prisma/schema/migrations
- route-registry changes
- shared frontend component rewrites
- shared backend utility rewrites
- package manifest changes
- generated-file changes
- provider/live-data aggregation work
- startup/backfill/scheduler changes
- portfolio, broker, or Trade Plan target/R:R expansion

## Recommended Team 03 Architecture Questions

1. Can the first truthful dashboard slice be composed from existing public frontend APIs, or is a bounded backend summary adapter needed to avoid excessive page-load fanout?
2. If a backend adapter is needed, should it live in a new `daily-overview-dashboard` module that consumes only public exports from Today Review, Research Hub, Market Context, Data Quality, Raw Signals, Calibration, Smart Money, Backtesting, and Pipeline Ops?
3. Which sections can ship in the first slice with current public truth, and which should be explicit `Coming soon` placeholders rather than fake summaries?
4. Can the first slice avoid route-registry and shared-component widening, or does Team 00 need to reserve specific shared files?
5. What is the safest ownership line between the app-level `/` route shell and any new dashboard feature/module so the page does not become a second Research Hub or second Today Review?

## Next Gate

Team 03 architecture review for a bounded Daily Overview dashboard slice, including section-to-source mapping and exact file-reservation guidance.

Team 04 QA planning only after Team 03 defines the first-slice architecture/contract/work-packet path.

Do not move this requirement to Ready from the requirement lane.
