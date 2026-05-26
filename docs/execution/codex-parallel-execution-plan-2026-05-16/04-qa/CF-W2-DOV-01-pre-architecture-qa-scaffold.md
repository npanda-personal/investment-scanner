# CF-W2-DOV-01 Pre-Architecture QA Scaffold

Date: 2026-05-26

Owner: Team 04 - QA Factory

Status: Requirement-aligned pre-architecture QA scaffold only. Not Ready for implementation or executable QA.

## Work Item

`CF-W2-DOV-01` - Daily Overview interactive market dashboard redesign for frontend `/`.

## Purpose

Prepare a docs-only QA scaffold before Team 03 architecture signoff defines:

1. whether `/` can compose the first truthful slice from existing frontend read-side APIs;
2. whether a bounded backend dashboard summary adapter is required; and
3. which dashboard sections ship as truthful summaries versus explicit `Coming soon` placeholders.

This scaffold defines the future QA bar without pre-approving route, module, shared-component, schema, package, or test-file decisions.

## Current Baseline Observed

Current repository state from the required reads:

- `frontend/src/app/HomePage.tsx` is still a launch-card page, not a dashboard.
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx` already exposes truthful trust, readiness, warnings, candidate grouping, and drilldown patterns.
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx` already exposes actionability, confirmation, proof, what-changed, and drilldown patterns.
- `frontend/tests/ui/today-trade-review.spec.ts` and `frontend/tests/ui/research-hub.spec.ts` already enforce research-support wording, scope propagation, and domain-specific empty or blocked states.

This means Team 04 should expect the redesign to reuse existing truths, not invent a second confidence layer.

## Current QA Posture

This item is not Ready because the requirement itself says:

- Team 03 architecture prep is required first.
- No route-registry, shared UI, package, Prisma, provider/live, or startup/backfill changes are pre-approved.
- The first slice must decide section-to-source ownership before executable QA can be finalized.

Until architecture and file reservations exist, this packet is a coverage and rejection template only.

## Acceptance Test Matrix

The future implementation QA plan should map at least the following coverage to the requirement acceptance criteria.

| ID | Requirement acceptance criterion | QA expectation |
| --- | --- | --- |
| AC-01 | `/` is redefined from a launch-card page into a true Daily Overview workspace dashboard. | First viewport must stop behaving like generic navigation cards. At minimum it must show dashboard header plus daily pulse content before drilldown-only cards. |
| AC-02 | The page gives one dedicated area for the most important cross-system filtered information. | Dashboard must aggregate multiple existing source truths on one page and show scoped summaries from more than one module. |
| AC-03 | The first viewport shows scope, freshness/trust context, and daily pulse rather than generic navigation cards. | Visible scope chip or equivalent, freshness timestamp if available, research-support disclaimer, trust/readiness headline, and a meaningful next action or blocker summary must be present above the fold on common desktop viewports. |
| AC-04 | The dashboard includes distinct sections for daily pulse, review candidate summary, market environment/confirmation, signal/evidence health, data trust/pipeline health, and drilldowns. | Each required section must exist with clear section labeling and route ownership. Missing truthful data is allowed only through explicit placeholder or blocked/limited state. |
| AC-05 | Every section uses existing truthful data or an explicit `Coming soon` placeholder. | No invented confidence score, fake counts, or silent fallback to decorative filler. Sections without source truth must say `Coming soon` and explain the dependency or unsupported status. |
| AC-06 | The page preserves research-support language and avoids financial-advice, target, and reward/risk wording. | UI body text, chips, buttons, tooltips, tables, API labels, and smoke assertions must exclude financial-advice and trade-plan target semantics. |
| AC-07 | The dashboard does not require portfolio ownership, broker execution, or Trade Plan target semantics to feel complete. | No portfolio P/L, broker, execution, order, or target/reward framing appears in core dashboard completion states. |
| AC-08 | Empty/blocked states explain why data is absent and where the user should drill next. | Every no-data or blocked section must provide a domain-specific reason plus a corrective drill route or refresh action. |
| AC-09 | No requirement text assumes Prisma/schema, package, provider/live, startup/backfill, or shared-UI changes are pre-approved. | Future handoff must show approved file reservations and architecture contract before QA treats any widened scope as valid. |

## Section-Level UI Smoke Expectations

Future Playwright coverage should prove section behavior, not just headings.

### Header rail

- Shows `Daily Overview`.
- Shows current `region / assetType`.
- Shows dashboard freshness or loaded timestamp when the source contract exposes one.
- Shows a visible research-support disclaimer.
- Shows a refresh action.
- Must not resemble a marketing hero or launch-card grid.

### Daily pulse

- Shows Today Review run status or equivalent current review status.
- Shows trust status and actionability or market-gate headline.
- Shows review mode when available.
- Shows trusted-universe versus catalog counts when exposed.
- Shows required and current/stored data-through dates when exposed.
- Shows a top warning or blocker summary without collapsing it into success styling.
- Shows a next-best drill route.
- If the source is blocked or limited, the section must explain that truth directly.

### Review candidate summary

- Shows at least the candidate group summaries approved by architecture, likely long review, exit-risk review, watch-only, and blocked.
- Segmented control or tabs switch groups without route-breaking or stale counts.
- Row-level or item-level drill routes go to approved downstream surfaces only.
- Empty candidate group states explain whether there are no candidates, blocked candidates, or unsupported summary truth.

### Market environment and confirmation

- Shows market regime and breadth state when exposed.
- Shows leading and weak sectors when exposed.
- Shows smart-money accumulation/distribution context when exposed.
- Shows strongest confirmation and contradiction notes when exposed.
- Mixed evidence must remain visible as mixed, not flattened into a bullish or bearish recommendation.

### Signal and evidence health

- Shows raw bullish, bearish, and neutral signal context only if the source already exposes it.
- Shows latest signal run freshness or status when exposed.
- Shows calibration usable, limited, or unavailable status.
- Shows strategy-proof or backtest proof context separately from raw signal counts.
- Must not collapse raw signals, calibration, and proof into one invented score.

### Data trust and pipeline health

- Shows DQ ready, limited, or blocked summary.
- Shows visible blocker themes where available.
- Shows latest or active pipeline run state when available.
- Shows failed, blocked, or warning stage context if exposed.
- Must make trust problems visible before candidate or confirmation sections can be misread as fully trustworthy.

### Drilldown strip

- Shows fast routes to approved downstream surfaces.
- Each route carries only truthful count, status, or freshness context already exposed upstream.
- Drilldown controls stay usable even when some source modules are empty or blocked.

### `Coming soon` placeholders

- Placeholder sections must be explicitly tagged `Coming soon`.
- Placeholder copy must explain why the summary is not yet truthful or which requirement family owns it.
- Placeholder sections must not show fake counts, percentages, or synthetic statuses.

## Empty, Error, Limited, And Progress State Expectations

Team 04 should require visible domain-specific states for:

- dashboard initial loading;
- dashboard refresh in progress;
- per-section loading if sections fetch independently;
- no trustworthy review data for the current scope;
- no candidates for the current scope;
- stale freshness or partial source data;
- blocked data-quality or pipeline conditions;
- per-section fetch failure without collapsing the entire page into fake zeros;
- unsupported section summary that must remain `Coming soon`.

Required state behavior:

- loading must not briefly render success summaries with zero values;
- blocked and limited states must be visually distinct from success;
- error states must offer retry or clear drill-next guidance where appropriate;
- progress indicators must be truthful and bounded if refresh or aggregation takes noticeable time;
- empty states must say whether the absence is `no qualifying data`, `not trustworthy`, `not yet summarized`, or `fetch failed`.

## Data Correctness Checks

Future QA must prove the dashboard is not fake or hardcoded.

- Scope-dependent requests must include `region` and `assetType`, matching current frontend patterns.
- A scope change must refetch and update visible section summaries rather than leaving stale values on screen.
- Dashboard counts must reconcile to source-module responses or explicit placeholder states.
- Freshness, data-through, trusted-universe, and warning values must be traceable to upstream source payloads rather than duplicated constants.
- Candidate group totals shown in the dashboard must match the visible group-switch results or downstream drill surfaces for the same mocked dataset.
- Mixed-module disagreements must remain visible as disagreement, warning, or `mixed evidence`, never silently overwritten.
- A refresh action must cause observable request or state change, not only a cosmetic spinner.
- If a section shows latest run or loaded timestamps, those values must change with mocked payload changes and must not be hardcoded.
- Drilldown badges, counts, or chips must disappear or show unavailable states when the source does not expose that truth.
- `Coming soon` sections must remain static placeholders even when nearby sections are populated; they must not borrow unrelated data.

## Wording Guardrails

Team 04 should reject any future trusted surface, DTO label, tooltip, test copy, or section heading containing:

- `buy now`
- `sell now`
- `guaranteed`
- `financial advice`
- `place order`
- `execute order`
- `live trade`
- `broker`
- `target price`
- `price target`
- `profit target`
- `reward/risk`
- `R:R`
- `take profit`
- `stop and target`
- `must buy`
- `must sell`

Preferred wording remains:

- daily overview
- daily pulse
- bullish trigger
- bearish trigger
- entry trigger
- exit trigger
- invalidation trigger
- review candidate
- watch only
- blocked
- trust status
- data quality
- reason summary
- strategy version
- rule version
- mixed evidence
- consider review

## Focused Commands Likely Needed After Implementation

These are recommendations only. Team 04 should refresh them after architecture signoff and file reservations.

### Frontend build gate

```text
cd frontend
npm.cmd run build
```

### Focused UI smoke candidates

If a dedicated dashboard spec is introduced:

```text
cd frontend
npm.cmd run test:ui -- daily-overview-dashboard.spec.ts --workers=1
```

If `/` reuses Today Review and Research Hub flows in the first slice:

```text
cd frontend
npm.cmd run test:ui -- daily-overview-dashboard.spec.ts today-trade-review.spec.ts research-hub.spec.ts --workers=1
```

If Market Context, Data Quality, Pipeline Ops, Smart Money, Calibration, or Signals truth is surfaced materially in the first slice, the likely regression set expands to:

```text
cd frontend
npm.cmd run test:ui -- daily-overview-dashboard.spec.ts today-trade-review.spec.ts research-hub.spec.ts market-context-intelligence.spec.ts data-quality-engine.spec.ts pipeline-ops.spec.ts smart-money-intelligence.spec.ts signal-calibration-engine.spec.ts signal-generation-engine.spec.ts --workers=1
```

### Backend build gate if a summary adapter is added

```text
cd backend
npm.cmd run build
```

### Focused backend candidates if Team 03 introduces a dashboard adapter

```text
cd backend
npm.cmd test -- daily-overview-dashboard.service.test.ts daily-overview-dashboard.controller.test.ts --runInBand
```

Likely upstream regressions depending on actual reuse:

```text
cd backend
npm.cmd test -- today-trade-review.service.test.ts data-quality-engine.service.test.ts strategy-decision-engine.service.test.ts --runInBand
```

### Language guard

Run against eventual changed files only:

```text
rg -n "buy now|sell now|guaranteed|financial advice|place order|execute order|live trade|broker|target price|price target|profit target|reward/risk|R:R|take profit|must buy|must sell" frontend/src backend/src frontend/tests backend/tests
```

## QA Rejection Conditions

Reject the future implementation handoff if any of the following occur:

- `/` remains primarily a launch-card shell with only cosmetic dashboard labels;
- the first viewport still prioritizes generic navigation over scope, trust, and daily pulse;
- any section shows fake or hardcoded counts, timestamps, or statuses;
- a new global confidence score is invented instead of reusing source-module truth;
- mixed upstream evidence is silently collapsed into one directional conclusion;
- dashboard copy introduces advice, broker, target, or reward/risk semantics;
- drilldowns route users to unapproved or misleading surfaces;
- empty or blocked states fall back to generic zeros without reason;
- refresh or progress UI is fake and does not correspond to actual request activity;
- scope changes do not refetch data by `region` and `assetType`;
- route-registry, shared UI, package, Prisma, provider/live, startup, or generated-file scope widens without explicit approval and reservation.

## Readiness Blockers Until Architecture Exists

- Team 03 has not yet defined whether the first slice is frontend composition only or needs a backend dashboard adapter.
- Exact source-to-section mapping is not approved.
- Exact file reservations for `/`, any new dashboard feature, any shared UI, and any supporting tests are not approved.
- Team 00 has not reserved any shared files for route shell or homepage ownership.
- No approved API contract exists yet for dashboard-level freshness, aggregation, or placeholder behavior.
- No approved first-slice decision exists for which sections are truthful now versus placeholder-only.

## Next Gate

Team 03 architecture review and Team 00 file-reservation sequencing.

After that, Team 04 should convert this scaffold into an executable QA plan tied to:

- exact files;
- exact routes;
- exact contract fields;
- exact UI smoke assertions;
- exact regression commands;
- exact reject criteria for the approved first slice.
