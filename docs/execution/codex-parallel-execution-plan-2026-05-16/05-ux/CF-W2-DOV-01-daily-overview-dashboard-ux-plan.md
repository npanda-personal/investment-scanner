# CF-W2-DOV-01 - Daily Overview Dashboard UX Plan

Date: 2026-05-26

Owner: Team 08 - UX / Research / Copilot

Status: Superseded / reframe required after Product Owner feedback. Not implementation approval.

## Superseding Product Owner Feedback - 2026-05-26

The prior UX plan is too close to a developer/admin monitoring dashboard. The Daily Overview must feel like an investor/trader daily briefing and opportunity workspace.

Do not make these prior sections prominent first-viewport sections:

- `Data Trust and Pipeline Health`
- `Signal and Evidence Health`
- `Drilldown Strip`

They may exist only as compact secondary caveats or supporting navigation. The first viewport must focus on market opportunity, market movement, and review candidates.

The revised section direction is:

1. `Market Pulse`
   - current market regime, breadth, sector tone, notable caution signal

2. `Market Movers`
   - gainers and losers if the current database/API can prove latest movement
   - otherwise `Coming soon - Market Movers`

3. `High-Priority Review Candidates`
   - bullish review candidates
   - bearish / exit-risk candidates
   - source-ranked, not dashboard-invented

4. `Watch And Blocked`
   - watch-only, limited-evidence, blocked, invalidated, or missing-DQ setups with reason summaries

5. `Institutional Flow`
   - FII/DII activity only if a reliable local source exists
   - otherwise `Coming soon - FII/DII Activity`

6. `Evidence Caveats`
   - compact warnings: stale data, DQ blockers, pipeline failures, missing calibration/outcome evidence
   - route to Data Quality / Pipeline Ops for details

7. `Focused Drilldowns`
   - secondary navigation to Today Review, Research, Market Context, Signals, Calibration, Data Quality, Smart Money, Backtests, Pipeline Ops

Preferred wording:

- `high-priority review candidate`
- `bullish review`
- `bearish / exit-risk review`
- `market movers`
- `watch only`
- `blocked`
- `limited evidence`
- `reason summary`

Avoid:

- `high conviction trade`
- `best trade`
- `buy`
- `sell`
- `target`
- `R:R`
- `pipeline health` as a main dashboard promise
- module-health phrasing in first viewport

Downstream Team 08 must prepare a replacement UX plan before implementation resumes.

### Source Availability Update - 2026-05-26

Current source inspection confirms the replacement UX must use this truth map:

- `Market Movers`: placeholder-only for market-wide gainers/losers in slice 1. Existing watchlist daily-change sorting can support a future user-watchlist movers subsection, but not market-wide movers.
- `Institutional Flow`: placeholder-only for FII/DII in slice 1. Smart Money can be described only as price/volume behavior, not FII/DII flow.
- `High-Priority Review Candidates`: ready for slice 1 from Today Review candidate groups, with Research Hub priorities as supporting context.
- `Bearish / Exit-Risk Review`: ready for slice 1 from Today Review `shortReview` / `exitRiskReview`, with Research Hub exit candidates as supporting context.
- `Watch And Blocked`: ready for slice 1 from Today Review watch/blocked/unproven/insufficient-data groups plus reason summaries.
- `Market Pulse`: limited/lower-page from Market Context and Research Hub because Market Context is region-scoped, not fully asset-type-specific.

The first viewport should therefore be:

1. scope and daily reviewability statement,
2. bullish / bearish / exit-risk candidate lanes,
3. watch/blocked reason summary,
4. clear placeholders for Market Movers and FII/DII if shown,
5. compact evidence caveats only after the user-facing market/candidate sections.

## Scope and guardrails

- This plan is for the `/` route redesign only.
- This plan does not approve backend aggregation, new routes, shared UI rewrites, Prisma changes, package changes, or new scoring logic.
- The dashboard must reuse existing module truth where it already exists.
- Where truth is not yet stable, the page should show a clearly tagged `Coming soon` placeholder instead of invented summary metrics.
- Research-support wording is mandatory. No buy/sell advice, no price targets, no reward/risk framing, no implied execution workflow.

## Primary user goal

When the user opens `/`, they should understand the current scope, whether the scope is reviewable, what changed most recently, where candidate attention is concentrated, and which upstream trust issues need attention before deeper research.

## Primary user journey

1. Open `/`.
2. Confirm scope, freshness, and trust posture in the first viewport.
3. Read one clear daily pulse statement that answers whether review work is supported, limited, or blocked.
4. Scan candidate counts, market environment, evidence health, and data/pipeline health in descending importance.
5. Drill into the owning page for detail without losing orientation.
6. Return to `/` as the default cross-system overview surface.

## Information hierarchy

1. Header rail with scope, timestamp, refresh, and research-support disclaimer
2. Daily pulse
3. Review candidate summary
4. Market environment and confirmation
5. Signal and evidence health
6. Data trust and pipeline health
7. Drilldown strip
8. `Coming soon` dashboard placeholders

## Proposed dashboard sections in priority order

| Priority | Section | User question answered | Source basis | Initial status |
| --- | --- | --- | --- | --- |
| 1 | Header rail | What scope am I looking at, and how current is this dashboard? | Current app scope plus page-level load timestamp; no invented freshness score | Current data |
| 2 | Daily pulse | Can I trust this scope enough to review setups today, and what should I check first? | Today Review run/trust/readiness context plus Research Command Center actionability headline | Current data |
| 3 | Review candidate summary | Where are the most relevant review candidates and blocked items right now? | Today Review grouped counts plus Research Command Center priority groups where already public | Current data |
| 4 | Market environment and confirmation | Is the environment supportive, mixed, or cautionary, and what evidence agrees or disagrees? | Market Context summary plus Smart Money summary plus Research Command Center confirmation summary | Current data |
| 5 | Signal and evidence health | Are raw signals, calibration evidence, and strategy proof healthy enough to treat as useful context? | Raw Signals latest summary, calibration summary, Research Command Center strategy proof summary, backtest proof where already surfaced | Current data |
| 6 | Data trust and pipeline health | Are upstream readiness or pipeline issues undermining downstream counts? | Data Quality summary plus Pipeline Ops active/latest run context | Current data |
| 7 | Drilldown strip | Where should I go next for deeper review? | Route shortcuts with truthful chips/counts only when already exposed | Current data |
| 8 | Signal position follow-through | What active signal positions are still developing? | Depends on Signal Position Ledger maturity | `Coming soon` |
| 9 | Calibration evidence-through summary | How current is calibration evidence across the active scope? | Depends on `CF-W2-CAL-02` maturity | `Coming soon` |
| 10 | Measured outcome follow-through | Are recent signals proving reliable after forward observation? | Depends on Signal Quality / outcome read-model maturity | `Coming soon` |

## Section-by-section UX definition

### 1. Header rail

Must show:

- page title `Daily Overview`
- current `region / assetType`
- dashboard loaded/generated timestamp
- research-support disclaimer in compact always-visible form
- refresh action

Should also allow:

- one compact trust chip sourced from the daily pulse basis, not a new global score

Must not include:

- hero marketing copy
- large launch cards
- promotional imagery

### 2. Daily pulse

This is the anchor section and should dominate the first viewport.

Must summarize:

- Today Review run status
- Today Review trust status
- Research Command Center actionability or market-gate headline
- review mode
- trusted-universe count versus catalog count when available
- required data-through date
- stored/current data-through date
- primary blocker or warning
- one next-best drill action

Preferred presentation:

- one lead statement
- 4-6 supporting metrics/chips
- one blocker/warning rail when applicable
- one primary drilldown button

Copy model:

- `Review supported`
- `Review limited`
- `Review blocked`
- `Mixed evidence`

Avoid:

- `Strong buy day`
- `Trade now`
- `High conviction`

### 3. Review candidate summary

Must summarize:

- bullish review candidate count
- exit-risk review count
- watch-only count
- blocked count
- top priority candidates or next actions only when already surfaced by Today Review or Research Command Center

Interaction:

- segmented control or tabs for `Bullish review`, `Exit risk`, `Watch only`, `Blocked`
- default tab should be the most actionable trustworthy group, not necessarily the largest count
- count-first summary cards above the tab body
- row-level drill routes to Today Review or Research detail surfaces

Table/list behavior:

- desktop: compact sortable table or dense list
- mobile: stacked list with one primary metric row and one reason summary row
- default sort: strongest current review priority from the source order; do not invent a cross-module score

### 4. Market environment and confirmation

Must summarize:

- market regime
- breadth status
- leading sectors
- weak sectors
- smart-money accumulation count
- smart-money distribution count
- strongest confirmation note
- strongest contradiction note

UX rule:

- explicitly show disagreement when signals, smart money, and market context do not align
- disagreement should read as `mixed evidence` or `confirmation conflict`, not as a hidden downgrade

### 5. Signal and evidence health

Must summarize:

- bullish / bearish / neutral raw signal counts where available
- latest signal generation run freshness/status
- calibration usable / limited / unavailable state
- calibration warning count when available
- strategy-proof proven / unproven summary
- missing backtest count or market-blocked count when available

UX rule:

- keep raw signals, calibration, and proof as separate evidence lanes
- do not compress them into one confidence number

### 6. Data trust and pipeline health

Must summarize:

- DQ ready / limited / blocked state
- top blocker themes
- active pipeline run or latest completed run
- failed / blocked / warning stage counts
- direct links to Data Quality and Pipeline Ops

UX rule:

- this section should visibly explain when downstream candidate counts may be misleading because upstream data is partial or blocked

### 7. Drilldown strip

Recommended destinations:

- Today Review
- Research Command Center
- Market Context
- Raw Signals
- Signal Calibration
- Data Quality
- Smart Money
- Pipeline Ops
- Backtests

Each route tile/button may show only:

- one truthful count
- one truthful status chip
- or one freshness label

If a route has no stable summary field yet, show the route without invented status text.

### 8. `Coming soon` placeholders

Keep these lower on the page and visually framed as future dashboard value, not missing errors.

Required placeholders:

1. `Coming soon - Signal Position Follow-Through`
2. `Coming soon - Calibration Evidence-Through Summary`
3. `Coming soon - Measured Outcome Follow-Through`

Placeholder rules:

- show one short statement explaining what the section will eventually summarize
- name the dependency or missing truth basis
- do not show dummy counts, empty charts, or fake progress

## Which sections can use current data now

### Current-data sections

- Header rail
- Daily pulse
- Review candidate summary
- Market environment and confirmation
- Signal and evidence health
- Data trust and pipeline health
- Drilldown strip

### Proven current source mapping

| Section | Current source evidence |
| --- | --- |
| Header rail | `HomePage` route context can be replaced; scope context already exists app-wide |
| Daily pulse | `TodayReviewPage` run status, trust status, review mode, trusted universe, data-through dates, warnings; `ResearchOverviewPage` actionability headline and next action |
| Review candidate summary | `TodayReviewPage` group counts and tab model; `ResearchOverviewPage` priority groups and next actions |
| Market environment and confirmation | Requirement-defined current Market Context, Smart Money, and Research Command Center confirmation summaries |
| Signal and evidence health | Requirement-defined current Raw Signals, Calibration, Research proof, and Backtesting summary surfaces |
| Data trust and pipeline health | Requirement-defined current Data Quality summary plus `PipelineOpsPage` active/latest run context |
| Drilldown strip | Existing page destinations already named in requirement and current app pages |

## Which sections are `Coming soon`

- `Signal Position Follow-Through`
- `Calibration Evidence-Through Summary`
- `Measured Outcome Follow-Through`

These must remain placeholder-only until Team 03 confirms a truthful public contract for each summary.

## Interaction model

### Global filters

- inherit current app-level `region / assetType` scope; do not add a second independent scope system on the page
- scope changes must refetch all dashboard sections
- if a section cannot support the active scope, show a scope-limited state rather than stale prior-scope data

### Local filters and controls

- candidate section tabs: `Bullish review`, `Exit risk`, `Watch only`, `Blocked`
- optional secondary toggle in candidate section: `Today Review` vs `Research priorities` if Team 03 confirms both sources can coexist without confusion
- no freeform global search in slice 1 unless current source contracts already make it cheap and truthful

### Sorting

- candidate tables/lists may sort by current source order, symbol, status, or freshness
- default order should respect the source module's own priority/readiness order
- do not introduce a synthetic dashboard rank across Today Review, Research, Signals, and Calibration

### Drilldowns

- every section needs one obvious owner route
- row-level drilldowns should preserve current scope where route contracts already support it
- when a section combines more than one source, its primary drill route should point to the surface that owns the dominant decision context

### Refresh and progress indicators

- header-level refresh updates the whole dashboard
- show quiet section-level loading placeholders rather than blank cards
- refresh state may show `Refreshing dashboard` or section-level `Updating` text
- no fake progress percentage for dashboard composition
- if source modules expose run state, show their real run state text instead of a generic spinner only

## Empty, loading, and error states

### Top-level loading

- first load: skeleton rows for header metrics, daily pulse, and the first two sections
- do not block the whole page with a centered full-screen spinner unless the route shell itself cannot load

### Top-level error

- show one dashboard-level error banner when the dashboard shell cannot assemble enough content to be useful
- keep section containers visible if partial content can still render

### Section empty states

- Daily pulse: explain that no Today Review snapshot or readiness summary exists yet for the active scope, then route to Today Review or Pipeline Ops
- Candidate summary: explain that no current review candidates are published for the active scope, and show blocked/watch counts if available
- Market environment: explain that market context evidence is unavailable or partial for the active scope
- Signal/evidence health: explain whether missing evidence is due to no recent run, partial run, or missing proof data
- Data/pipeline health: explain whether no current run evidence exists or whether upstream checks are incomplete

### Partial and mixed states

- partial data must stay visibly partial
- contradictory evidence must surface as `mixed evidence`
- blocked data must explain the blocking reason before any encouraging counts

## Trust and evidence display rules

- Every section must identify its evidence basis with source-module labels or a drill route that clearly leads to the source page.
- Show timestamps only when a real source timestamp exists.
- Show warnings and blockers before positive counts when trust is limited.
- If Today Review and Research Command Center disagree, show the disagreement rather than picking one silent narrative.
- Do not invent a dashboard-wide confidence score.
- Do not hide partial, stale, blocked, or missing evidence behind green styling.
- Keep candidate summaries tied to strategy/rule/version-aware sources when those fields are later exposed in drilldown details.
- Use calm neutral styling for informative states; reserve strong error/warning treatment for true blockers or failed trust conditions.

## Mobile and desktop layout guidance

### Desktop

- first viewport: header rail plus daily pulse plus the start of candidate summary
- use a 12-column layout with dense panels, not card-inside-card nesting
- recommended pattern:
  - row 1: header rail
  - row 2: daily pulse full width
  - row 3: candidate summary 8 cols, market environment 4 cols
  - row 4: signal/evidence health 8 cols, data/pipeline health 4 cols
  - row 5: drilldown strip full width
  - row 6: `Coming soon` placeholders full width or 3-up compact tiles

### Mobile

- preserve importance order strictly
- stack sections vertically with the daily pulse first
- compress metrics into two-column chips or stat rows
- candidate lists should collapse from table to stacked rows
- drilldown strip should become a two-column button grid or stacked list

### Shared layout rules

- no oversized hero
- no launch-card home screen feel
- no decorative illustration requirements
- section headings should be operational and compact

## Implementation slice recommendation

### Slice 1 - truthful interactive dashboard baseline

Recommended first shippable slice:

- Header rail
- Daily pulse
- Review candidate summary
- Market environment and confirmation
- Signal and evidence health
- Data trust and pipeline health
- Drilldown strip
- `Coming soon` placeholders

Conditions:

- ship only sections that can be populated from current public truth
- if Team 03 finds dashboard fanout/performance too heavy for route load, prefer one bounded summary adapter over duplicated frontend orchestration logic
- if any section cannot be composed truthfully in slice 1, demote that section to `Coming soon` rather than widening scope casually

### Slice 2 - density and polish, only after slice 1 truth is stable

- richer section-level drill chips
- more detailed candidate tab switching
- improved freshness comparators where a shared truth source exists

## Explicit forbidden wording

Do not use:

- `buy`
- `sell`
- `buy now`
- `sell now`
- `profit target`
- `price target`
- `reward/risk`
- `R:R`
- `take profit`
- `stop out now`
- `must buy`
- `must sell`
- `guaranteed`
- `guaranteed return`
- `high conviction trade`
- `best trade`
- `top trade`
- `win rate today`

Preferred wording:

- `bullish review candidate`
- `bearish trigger`
- `exit-risk review`
- `watch only`
- `blocked`
- `mixed evidence`
- `research priority`
- `consider review`
- `reason summary`
- `data quality`
- `signal quality`
- `strategy proof`

## Explicit forbidden UI claims

Do not imply:

- the dashboard is an execution screen
- portfolio ownership is required to use the page
- the page knows target prices
- the page knows realized performance follow-through when that read model is not yet public
- a synthetic global confidence score
- a unified rank across unrelated source modules
- complete support for scopes or asset classes not proven by current source
- hidden freshness certainty when the timestamp basis is missing
- that a green badge means a setup should be acted on

## Acceptance-ready UX checkpoints for downstream teams

- First viewport is orientation and trust, not navigation launch cards.
- Daily pulse answers whether the current scope is reviewable, limited, or blocked.
- Candidate summary is interactive and routes to owning pages without inventing a new ranking model.
- Mixed or contradictory evidence remains visible.
- Pipeline and data trust are visible before downstream counts can be over-read.
- `Coming soon` sections are explicit and honest.
- Language remains research-support only.

## Team 03 questions this UX plan expects architecture to answer

1. Can slice 1 be composed from current public frontend APIs without excessive route-load fanout?
2. If not, what is the smallest bounded dashboard adapter that preserves source ownership?
3. Which current sections have stable enough summary DTOs for slice 1, and which must fall back to placeholder state?
4. Which routes and feature exports can be reused without widening shared UI ownership?
5. What is the safest refresh model so the dashboard stays current without implying live market streaming?
