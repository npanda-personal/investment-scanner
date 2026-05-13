# Lead UX Roadmap - Investment Scanner Current-State Audit And Redesign Direction

Date: 2026-05-14
Mode: UX Discovery / Product Planning Mode
Role: Lead UX Designer
Artifact owner: Lead UX
Status: Initial roadmap complete; pending Lead PO product-value review before any implementation planning
Scope: current-state UX audit, redesign synthesis shell, target UX model, proposed IA direction, typography/layout rules, page transition rules, and review criteria for Associate UX artifacts

## Operating Constraints

- This document is a UX direction artifact only.
- It does not authorize production implementation.
- It does not replace Lead PO prioritization or product-value review.
- It must stay aligned with current product reality: a data-dense investment workflow for repeated use, not a marketing surface.

## Lead UX Position

The product has strong analytical coverage, but the current experience is organized around internal engines rather than the user's daily decision flow. The redesign should not start from visual polish. It should start by making the application answer three operational questions with less navigation cost:

1. What am I allowed to act on today?
2. Why is an instrument or action reviewable, blocked, or unproven?
3. What is the next best step when data, proof, or market conditions are incomplete?

The correct redesign direction is a workflow-first command surface built on the existing domain modules, not a cosmetic re-skin.

## Current-State Audit

### 1. Shell And Information Architecture Problems

| Finding | Current-state evidence | UX impact | Direction |
|---|---|---|---|
| Navigation is module-first, not workflow-first | `frontend/src/app/NavigationLayout.tsx` groups routes by internal feature buckets such as `Research`, `Intelligence Lab`, and `Portfolio` | Users must already know internal system boundaries before they can find the next task | Reframe top-level nav around decision workflow bands |
| Labels are ambiguous and internally inconsistent | `frontend/src/app/NavigationLayout.tsx` uses both `Overview`, `Strategies`, and `Strategy`; `frontend/src/app/HomePage.tsx` lists modules as separate destination cards | Similar concepts appear as separate destinations with weak differentiation | Define one canonical label per workflow and retire near-duplicate naming |
| Home is a directory, not a decision start point | `frontend/src/app/HomePage.tsx` is a grid of module launch cards | Users must decide where to go before the product frames current readiness or next actions | Replace home/dashboard role with a daily decision overview |
| Detail routes lose page context in the app bar | `frontend/src/app/NavigationLayout.tsx` resolves the title only from exact pathname matches | Drill-in pages can fall back to the generic product label instead of preserving workspace context | Add route family context and breadcrumb/back-path logic |

### 2. Screen Hierarchy And Workflow Problems

| Finding | Current-state evidence | UX impact | Direction |
|---|---|---|---|
| Decision screens carry too many stacked status surfaces before the user reaches the core list | `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx` stacks run status, coverage, warnings, summary cards, explainability, and another info alert before candidate content | High cognitive load before the primary action set is visible | Collapse diagnostics into secondary panels and keep the candidate board primary |
| Research Hub is conceptually strong but visually broad and panel-heavy | `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx` opens with multiple summary zones, side panels, and drilldowns on one screen | Users scan many containers before locating the one decision that matters | Turn it into a layered workspace with a clear primary recommendation rail |
| Operational modules rely heavily on local tabs plus dense filters | Repeated pattern across signal, quality, calibration, market data, and strategy pages from `frontend/src/shared/components/FilterBar.tsx` and `frontend/src/shared/components/DataTable.tsx` | Users repeatedly re-learn filter and tab structures across modules | Standardize workspace templates and shared control zones |
| Global market scope and page-level filtering are separated without a clear hierarchy | `frontend/src/shared/components/MarketScopeSelector.tsx` sets a global market region, while major pages also maintain their own local filter stacks | Scope changes can feel global in mechanism but local in consequences | Establish clear scope inheritance and show it in-page near the dataset title |

### 3. Typography, Layout, And Density Problems

| Finding | Current-state evidence | UX impact | Direction |
|---|---|---|---|
| Page width, padding, and header rhythm vary by module | Examples include `frontend/src/app/HomePage.tsx`, `frontend/src/features/signal-generation-engine/components/SignalsDashboardPage.tsx`, and `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx` | The app does not feel like one coherent system surface | Introduce standard page containers and width tiers |
| The product uses many cards and alert blocks for routine state | Today Review and Research Hub both rely on repeated cards, chips, and alerts for normal reading states | Important signals and secondary diagnostics compete visually | Reserve high-emphasis containers for true exceptions; use quieter data bands for routine metadata |
| Repeated large headings increase visual reset cost | Shared `PageHeader` defaults to prominent `h4` treatment across many screens in `frontend/src/shared/components/PageHeader.tsx` | Every screen behaves like a new landing section rather than part of a continuous tool | Move toward compact command-surface headings with consistent subhead rules |
| There is at least one content-quality defect in navigation copy | The Today Review nav label in `frontend/src/app/NavigationLayout.tsx` contains mojibake instead of clean punctuation | Small defects reduce trust in a product where trust is central | Add content QA to UX review gates |

### 4. Navigation And Back-Flow Problems

- Back navigation is component-local instead of system-level. `PageHeader` supports `backTo`, but the app shell does not provide persistent route lineage or breadcrumbs.
- Detail journeys are fragmented. Instrument drill-in, candidate detail, and trade-plan detail do not clearly preserve the parent workspace mode.
- The current top bar title behavior does not support workspace context for nested routes.
- Adjacent tasks are spread across separate modules even when users experience them as one flow: market readiness -> candidate review -> strategy proof -> plan review -> portfolio action.

## Redesign Principles

1. Workflow before engine: organize primary navigation by decision journey, not by backend module ownership.
2. Decision first, diagnostics second: put actionability and blockers above supporting telemetry.
3. One parent workspace per user question: each major task should have a stable landing screen plus detail drill-ins.
4. Scope clarity at all times: users should always know whether they are viewing a global market, a filtered list, or a single instrument.
5. Dense but calm: preserve data density without stacking high-emphasis containers for routine states.
6. Explainability must be actionable: every blocker or warning should answer what to do next.
7. Reuse before reinvention: stay within the current React + MUI system and extend shared patterns instead of creating a second UI language.

## Target UX Model

The target experience is a workflow command center with three stable layers:

1. orient: show market permission, trust, readiness, and next best action,
2. review: present prioritized candidates, blockers, and evidence in one parent workspace,
3. drill in: preserve workspace context while opening symbol, plan, or diagnostic detail.

This means the product should behave less like a set of separate analytical tools and more like one operating system for daily investment review.

## Navigation And Information Architecture Direction

### Primary Navigation Model

Replace the current module map with five workflow bands:

1. Daily Decision
   - Daily Overview
   - Today Review
   - Research Queue
2. Research And Market
   - Market Data
   - Instrument Workspace
   - Market Context
   - Smart Money
3. Strategy And Validation
   - Strategy Decisions
   - Strategy Framework
   - Signal Quality
   - Signal Calibration
   - Backtests
   - Historical Context
4. Portfolio And Execution
   - Portfolios
   - Trade Plans
   - Watchlists
   - Alerts
5. Platform And Settings
   - Notifications
   - Billing
   - Account
   - AI Copilot

### Screen Hierarchy

#### Level 0: Global Shell

- Persistent left navigation with workflow bands
- Top bar with current workspace, market scope, and account/session controls
- Breadcrumbs for nested detail routes

#### Level 1: Workflow Hubs

- `Daily Overview` becomes the real default landing screen
- `Today Review` becomes the operational shortlist surface
- `Research Queue` becomes the explanation-first queue for reviewable, blocked, watch, and unproven work

#### Level 2: Workspaces

- `Instrument Workspace` becomes the canonical detail view for a symbol across market data, research, signals, context, and plan evidence
- `Strategy Decisions` becomes the strategy-owned action board
- `Trade Plans` becomes the plan-and-proof review surface for actionable ideas

#### Level 3: Detail Panels

- Candidate detail
- Instrument deep dive
- Plan detail
- Execution or alert detail

These should remain inside their parent workspace context rather than feeling like detached standalone pages.

## Proposed Final Screen Roles

### 1. Daily Overview

Purpose: answer whether the user should review, wait, manage exits, or repair the system today.

Must contain:

- market permission summary
- trusted-universe readiness summary
- candidate counts by lifecycle action
- top blockers with next actions
- direct links into Today Review, Research Queue, and remediation screens

### 2. Today Review

Purpose: present the best current reviewable candidates with minimal preamble.

Should change from:

- telemetry-first stacked diagnostics

To:

- primary candidate board first
- summarized trust and readiness ribbon
- collapsible diagnostics and exclusion detail
- explicit distinction between long review, exit review, short review, and blocked/watch states

### 3. Research Queue

Purpose: explain why something is reviewable, blocked, unproven, or waiting.

This should absorb the strongest parts of the current Research Hub while reducing panel overload.

### 4. Instrument Workspace

Purpose: unify the symbol-level journey.

This should be the drill-in destination from Today Review, Strategy Decisions, Watchlists, and Market Data. The user should not have to infer which module owns the next step for a symbol.

### 5. Validation Workspaces

Signal Quality, Calibration, Backtests, and Historical Context should form a coherent validation cluster with the same shell pattern:

- compact summary strip
- filter/action band
- results table or chart area
- expandable diagnostics

## Typography And Layout Density Rules

### Typography

- Use compact page titles for operational screens; reserve large-display emphasis for the default landing view only.
- Standardize hierarchy to a small set of roles: workspace title, section title, metric label, table label, helper text, status text.
- Remove redundant uppercase and overline usage where it does not communicate structure.
- Treat content QA as part of UX quality; label defects are not cosmetic in a trust-sensitive product.

### Layout

- Define three width tiers only: dashboard hub, workspace, and detail.
- Standardize vertical rhythm across all pages.
- Keep primary actions in a stable header action zone.
- Keep filters in one predictable band directly above the primary data surface.
- Reduce alert and chip sprawl by converting routine metadata into quieter summary rows.

### Density Rules

- Preserve dense tables where comparison matters, but pair them with a clearer summary ribbon and row drill-in path.
- Use cards sparingly; routine metrics should not all become separate cards.
- Reserve alerts for errors, warnings, or blocking state changes, not for every informational sentence.
- Allow supporting diagnostics to collapse behind accordions, drawers, or secondary tabs when they are not part of the immediate decision.

## Page Transition And Back-Navigation Rules

1. Every nested route must inherit a parent workspace title and breadcrumb.
2. Browser back must return the user to the last meaningful parent state, including active tab, filter mode, and scroll position when practical.
3. Drill-ins from Today Review, Research Queue, Watchlists, and Trade Plans should open the same Instrument Workspace shell, not separate detail concepts.
4. Page transitions should prefer lateral workflow movement over hard context resets; moving from candidate to plan or plan to symbol should feel adjacent, not like entering a new app.
5. Use tabs for sibling views inside one workspace only; do not use tabs as a substitute for missing primary IA.
6. Stop using the default home screen as a module launcher grid.
7. Make market scope visible both globally and at the dataset/workspace level.

## Proposed Design-System Direction

This product does not need a new brand layer. It needs a stronger operational system.

### System Character

- Quiet, precise, dense, credible
- Dark mode supported, but with restrained emphasis colors
- Emphasis reserved for actionability, blockers, and state change

### Core UI Patterns To Standardize

1. Workspace header
   - title
   - scope
   - one primary action
   - limited secondary actions
2. Summary ribbon
   - readiness
   - trust
   - freshness
   - actionability
3. Filter/action band
   - one consistent control layout
   - clear reset behavior
4. Primary data surface
   - table, queue, or board
5. Supporting diagnostics region
   - expandable, secondary, non-blocking when possible

### Token And Component Direction

- Standard spacing scale and page container sizes
- Standard status semantics for `ready`, `limited`, `blocked`, `unproven`, `insufficient data`
- Standard empty-state pattern that explains next action
- Standard drawer, tab, chip, and alert usage rules
- Standard table affordances for density, row click behavior, sticky controls, and detail preview paths

### Anti-Patterns To Avoid

- Decorative redesign without workflow gain
- New cards for every metric
- Mixed naming for the same concept
- Multiple competing primary actions on one screen
- Diagnostic overload above the primary data surface

## Associate UX Review Criteria

Every Associate UX artifact must be reviewed against the criteria below before it is considered complete.

### Required Structure In Each Associate Artifact

Each artifact must include:

1. the user problem being solved,
2. evidence from the current product surface,
3. the proposed workflow change,
4. the screen hierarchy impact,
5. the navigation/back-flow impact,
6. the product-value rationale,
7. what stays unchanged,
8. open risks or dependencies.

Artifacts that skip current-state evidence or product-value reasoning should be returned for revision.

### Review Checklist

| Review area | Acceptance standard |
|---|---|
| Product value | Solves a real investor workflow problem, not a styling preference |
| IA alignment | Fits the lead workflow model and does not create a parallel navigation logic |
| Decision clarity | Makes reviewable, blocked, watch, and unproven states easier to distinguish |
| Back-flow | Preserves parent workspace context and return path |
| Scope clarity | Makes market scope and local filtering understandable |
| Density discipline | Improves comprehension without reducing necessary information density |
| Design-system fit | Reuses or extends shared shell patterns instead of inventing one-off layouts |
| Implementation realism | Can be built incrementally in the current React + MUI codebase |
| Content quality | Uses consistent terminology and no placeholder or broken copy |

### Reject Or Revise Conditions

Return an Associate UX artifact for revision when it:

- introduces new top-level navigation without workflow justification,
- creates a purely visual redesign without a measurable usability gain,
- ignores the Lead PO product direction,
- hides critical trust, readiness, or blocker information,
- breaks drill-in/back-flow continuity,
- increases the number of competing actions on already dense screens,
- requires a net-new design language disconnected from current implementation patterns.

### Review Outcome Labels

- `Accept`
- `Accept with revisions`
- `Revise and resubmit`
- `Blocked by product direction or dependency gap`

## Lead UX Roadmap Phases

### Phase 0 - Alignment

- lock the workflow-first IA direction
- align with Lead PO roadmap terminology
- define canonical labels and state language

### Phase 1 - Shell Reframe

- redesign global navigation, workspace titles, and detail-route context
- define the new default landing experience

### Phase 2 - Core Decision Surfaces

- redesign Daily Overview
- redesign Today Review
- reshape Research Hub into Research Queue

### Phase 3 - Unified Drill-In

- define Instrument Workspace and parent-child drill-in behavior
- standardize plan, candidate, and symbol detail patterns

### Phase 4 - Validation Cluster

- unify Signal Quality, Calibration, Backtests, and Context into a shared workspace model

### Phase 5 - Systemization

- finalize layout rules, typography roles, state semantics, and content standards

## Dependencies And Governance

- Lead PO must review the final UX direction for product value before implementation planning.
- Architecture review is required before any shell or routing changes are scheduled.
- UX approval does not override data/trust constraints already defined in PO roadmaps.
- Any future implementation proposal must explicitly map UX changes to the existing product roadmap and module ownership.

## Lead PO Product-Value Review

Lead PO review is the final gate before any implementation handoff. The redesign should be approved only when the Lead PO can confirm all of the following:

1. the new IA reduces workflow friction for daily review rather than adding visual novelty,
2. the default landing experience improves decision quality and triage speed,
3. trust, readiness, and blocker states remain visible enough for product safety,
4. the redesign supports the strategy-led product direction already defined in PO roadmaps,
5. the proposed shell can be implemented incrementally without breaking the current module roadmap,
6. no UX change implies implementation authorization by itself.

Lead PO review outcome options:

- `Approved for implementation planning`
- `Approved with product revisions required`
- `Hold for further UX refinement`
- `Rejected for insufficient product value`

## Associate UX Integration Status

Associate UX inputs have now been captured in separate audit artifacts and consolidated by the Orchestrator in [UX Associate Synthesis And Lead PO Review](2026-05-14-ux-associate-synthesis-and-po-review.md).

Completed Associate UX inputs:

1. Navigation, route context, and back-flow audit.
2. Decision workflow audit for Today Review, Research Hub, Strategy Decision, Trade Plans, Signal Quality, and Calibration.
3. Data operations audit for Market Data, Data Quality, batch progress, and long-running jobs.
4. Visual system audit for typography, density, spacing, tables, filters, dark-mode contrast, and visible copy defects.

Remaining implementation planning work:

1. convert `UX-01` into an architecture contract and QA plan,
2. keep `UX-02` dependent on Phase 0 Market Data/Data Quality contracts,
3. split later Daily Overview, Today Review, Research Queue, Instrument Workspace, and validation-cluster work into non-overlapping frontend packets.

## Lead UX Signoff

Complete for initial roadmap scope.
Recommendation: proceed with architecture and QA planning for `UX-01` only. Runtime implementation remains blocked until the specific UX packet has an architecture contract, QA plan, reserved write scope, developer owner, and Lead PO acceptance criteria tied to user value.
