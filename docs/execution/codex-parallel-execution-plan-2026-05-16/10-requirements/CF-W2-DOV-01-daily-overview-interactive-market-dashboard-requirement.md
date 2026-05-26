# CF-W2-DOV-01 - Daily Overview Interactive Market Dashboard Requirement

Date: 2026-05-26

Owner: Team 02 - Product / Requirement Factory

Status: Paused / Product reframe required. The earlier dashboard implementation direction is not acceptance-ready.

## Superseding Product Owner Direction - 2026-05-26

The Daily Overview must read as an investor/trader daily dashboard, not an admin/developer monitoring dashboard.

This direction supersedes lower sections in this document wherever they conflict.

The first viewport should answer:

- What is happening in the market today?
- Which areas of the market are moving?
- Which stocks deserve review attention now?
- Which bullish, bearish, exit-risk, watch-only, or blocked candidates are credible enough to inspect?
- What important market or institutional-flow evidence is missing?

Preferred investor/trader-oriented sections:

1. `Market Pulse`
   - broad regime, breadth, sector leadership, notable caution signals
   - source: Market Context / Research Hub confirmation where truthful

2. `Market Movers`
   - gainers and losers for the active scope
   - ship only if current Market Data / Signal / Research APIs can prove latest price-change rows without provider/live calls
   - otherwise keep as `Coming soon - Market Movers`

3. `High-Conviction Review Candidates`
   - bullish review candidates and bearish/exit-risk candidates using Today Review / Research Hub source ordering
   - use research-support wording such as `high-priority review candidate`, not `best trade`, `buy`, or `sell`

4. `Watchlist And Blocked Setups`
   - watch-only, limited-evidence, blocked, and invalidated candidates with reasons
   - helps the user avoid over-reading weak data

5. `Institutional Flow`
   - FII/DII activity if a reliable local source exists
   - if no current source exists, render only `Coming soon - FII/DII Activity` with no invented values

6. `Evidence And Data Caveats`
   - concise warnings only, not an operations dashboard
   - link to Data Quality and Pipeline Ops for details

Do not make sections like `Data Trust and Pipeline Health`, `Signal and Evidence Health`, or `Drilldown Strip` prominent first-viewport product sections. Those may become secondary caveats or navigation aids, but the page must not feel like a backend module health console.

### Source Availability Update - 2026-05-26

Team 00 source audit found:

- Market-wide gainers/losers: no truthful public market-wide movers API/hook exists on the current base. Closest current truth is user-owned watchlist sorting by `dailyChangeDesc` / `dailyChangeAsc`, which must not be labeled as market gainers/losers. Slice 1 should use `Coming soon - Market Movers`.
- FII/DII activity: no route, DTO, hook, or provider exists. Smart Money is a price/volume proxy and must not be labeled as FII/DII. Slice 1 should use `Coming soon - FII/DII Activity`.
- Bullish review candidates: Today Review `groups.longReview` is the primary source; Research Hub `researchPriorities.tradeCandidates` can be supporting context.
- Bearish / exit-risk review candidates: Today Review `groups.shortReview` and `groups.exitRiskReview` are primary; Research Hub exit candidates and bearish counts are supporting context only.
- Watch-only / blocked candidates: Today Review `watchOnly`, `blocked`, `insufficientData`, `unproven`, `scanFunnel`, and explainability are ready for slice 1.
- Market overview / regime / sector leadership: Market Context and Research Hub provide truth, but this should be lower-page / limited because Market Context is region-scoped and not fully asset-type-specific.

Slice 1 should therefore center on Today Review plus Research Overview plus review-readiness, with Market Context lower on the page and Market Movers/FII-DII as explicit placeholders.

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

- which names deserve review attention right now;
- whether the current scope supports bullish review, bearish review, exit-risk review, or only watch/blocked follow-up;
- which expected investor/trader views are still unavailable and therefore shown only as `Coming soon`;
- what the current market backdrop roughly implies, without overstating asset-type precision;
- which caveats could make the visible candidates less trustworthy.

## Primary User Journey

1. Open `/`.
2. Read one top-level scope and daily reviewability summary.
3. Scan bullish, bearish, and exit-risk candidate lanes before anything that looks like operations telemetry.
4. Drill into the most relevant next surface:
   - Today Review
   - Research Command Center
   - Market Context
   - Data Quality or Pipeline Ops only when caveats force a trust check
5. Return to `/` and keep the dashboard as the primary daily orientation surface.

## Information Hierarchy

Order matters. The page should surface user value and truth in this sequence:

1. Scope and daily reviewability summary
2. High-priority bullish review, bearish review, and exit-risk review candidates
3. Watch-only, blocked, limited-evidence, or insufficient-data setups with reasons
4. Expected investor/trader sections that are not truthful yet:
   - `Coming soon - Market Movers`
   - `Coming soon - FII/DII Activity`
5. Limited market pulse / context summary lower on the page
6. Evidence and data caveats in a compact supporting area
7. Focused drilldowns as secondary navigation, not the dashboard centerpiece

## Required Dashboard Sections

### 1. Header Rail

Must show:

- page title `Daily Overview`
- current `region / assetType`
- latest dashboard generated/loaded timestamp if available
- visible research-support disclaimer
- refresh action

Must not look like a marketing hero or static launch page.

### 2. Daily Review Board

This is the most important first-viewport section.

Use existing truthful read-side evidence from Today Review and Research Command Center to show:

- one daily reviewability statement
- bullish review candidate lane from Today Review `groups.longReview`
- bearish review lane from Today Review `groups.shortReview`
- exit-risk lane from Today Review `groups.exitRiskReview`
- top reason summaries or next-action cues where current source already exposes them
- visible trust/blocker messaging when candidate quality is limited

Supportive context may include:

- Today Review run status
- trust status
- review mode
- trusted-universe count versus catalog count where available
- required data-through date
- stored/current data-through date

This section should answer: `Which stocks deserve review now, and is that review supported, limited, or blocked?`

Do not frame the section as a signal-health console.

### 3. Watch And Blocked Setups

Use current filtered outputs from Today Review and Research Hub to show:

- Watch-only count
- Blocked count
- insufficient-data count
- unproven / limited-evidence count where current source already exposes it
- top blocker or caution reasons
- top research-priority follow-ups only when the source already exposes them truthfully

Interactive behavior:

- segmented/tabbed switching between watch/blocked/insufficient-data/unproven groupings
- row-level drill routes to Today Review or Research/stock detail

Do not surface Trade Plan target, target price, reward/risk, or execution-like copy in this section.

### 4. Coming Soon - Market Movers

Slice 1 must not label watchlist sorting as market-wide movers.

This placeholder must say:

- market-wide gainers/losers are not yet available from a truthful public stored-data summary
- the missing source basis is a scoped market-wide movers API/hook backed by stored market data
- current watchlist daily-change sorting is not the same as market movers and must not be relabeled as such

### 5. Coming Soon - FII/DII Activity

Slice 1 must not label Smart Money as FII/DII.

This placeholder must say:

- no current route, DTO, hook, or provider exposes truthful FII/DII activity
- the missing source basis is a dedicated local institutional-flow source and contract
- price/volume proxy summaries are not an acceptable substitute for FII/DII labeling

### 6. Market Pulse And Context

Use Market Context plus Research Hub confirmation summaries to show, in a limited lower-page section:

- region-level market regime
- breadth status
- leading sectors
- weak sectors
- strongest confirmation notes
- strongest contradiction notes
- explicit limited wording when the context is region-scoped rather than asset-type-proven

This section should help the user decide whether the day is broadly supportive, mixed, or cautionary without presenting itself as the first-viewport centerpiece.

### 7. Evidence Caveats

Use Data Quality, Market Data readiness context, Pipeline Ops, and other already-public evidence summaries only as compact caveats/support:

- DQ ready / limited / blocked summary
- key DQ blocker themes if available
- latest pipeline active run or latest completed run
- major stage warnings / failed stage count / blocked stage count where available
- clear missing-evidence notes for calibration / follow-through summaries that remain unshippable
- direct links to Data Quality and Pipeline Ops details

This section must stay compact, below the investor/trader sections, and visibly separate from the main candidate-review workflow.

### 8. Focused Drilldowns

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

Do not require drilldowns to occupy the first viewport or read as a launcher grid.

## `Coming soon` Placeholders

Use clearly tagged `Coming soon` sections only where the user would reasonably expect the information but the current source does not yet provide a stable truthful dashboard summary.

Recommended placeholders:

1. `Coming soon - FII/DII Activity`
   - depends on a reliable local institutional-flow source
   - do not scrape, call live providers, or invent FII/DII values in this dashboard slice

2. `Coming soon - Market Movers`
   - only if current source inspection proves there is no truthful latest gainer/loser read model
   - should eventually show scoped latest gainers/losers from stored market data, not live provider calls

3. `Coming soon - Signal Position Follow-Through`
   - depends on `CF-W2-SPL-01B` plus the later durable closed-history/lifecycle child
   - should eventually summarize active signal positions and later closed follow-through, but must not be faked now

4. `Coming soon - Calibration Evidence-Through Summary`
   - depends on `CF-W2-CAL-02`
   - current calibration surfaces show useful row-level evidence/readiness, but the dashboard should not imply a truthful scope-wide evidence-through basis until that requirement lands

5. `Coming soon - Measured Outcome Follow-Through`
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

- `/` is redefined from a launch-card page into a Daily Overview workspace that reads like an investor/trader daily dashboard rather than an admin/developer monitoring console.
- The first viewport is anchored on scope plus daily reviewability plus candidate attention, not on `Data Trust and Pipeline Health`, `Signal and Evidence Health`, or a drilldown launcher strip.
- The first slice must include a primary `Daily Review Board` driven by Today Review candidate groups:
  - bullish review from `groups.longReview`
  - bearish review from `groups.shortReview`
  - exit-risk review from `groups.exitRiskReview`
- The first slice must include a `Watch And Blocked Setups` section that uses truthful watch/blocked/insufficient-data/unproven evidence and reason summaries.
- `Market Movers` must ship only as `Coming soon - Market Movers` unless a truthful scoped market-wide movers source exists; watchlist sorting must not be relabeled as market-wide movers.
- `FII/DII Activity` must ship only as `Coming soon - FII/DII Activity` unless a truthful local institutional-flow source exists; Smart Money must not be relabeled as FII/DII.
- `Market Pulse And Context` may ship only as a limited supporting section using current Market Context / Research Hub evidence with explicit region-scoped limitation where asset-type-specific truth is not proven.
- Evidence, data-trust, pipeline, signal-health, and drilldown content may appear only as compact caveats or supporting navigation and must not define the page's primary product feel.
- Every visible section uses existing truthful data or an explicit `Coming soon` placeholder that names the missing source basis.
- The page preserves research-support language and avoids financial-advice, target, reward/risk, and direct-execution wording.
- The dashboard does not require portfolio ownership, broker execution, or Trade Plan target semantics to feel complete.
- Empty/blocked states explain why data is absent, limited, or placeholder-only and where the user should drill next.
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

Team 08 must replace the superseded UX plan with an investor/trader-first Daily Overview UX refresh that matches this requirement.

Team 03 must then refresh the architecture review so the first-slice section-to-source map matches the revised investor/trader-first shape and keeps unsupported sections as placeholders.

Team 04 QA planning only after the Team 08 UX refresh and Team 03 architecture refresh are complete.

Do not move this requirement to Ready or implementation from the requirement lane until Team 08 UX and Team 03 architecture refreshes land.
