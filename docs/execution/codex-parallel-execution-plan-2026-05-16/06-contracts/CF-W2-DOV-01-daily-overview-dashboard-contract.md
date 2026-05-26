# CF-W2-DOV-01 Daily Overview Dashboard Contract

Date: 2026-05-26

Owner: Team 03 Architecture Factory

## Status

Draft contract for the safest first slice.

Architecture verdict: this can become a Ready candidate after Team 04 QA planning and Team 00 shared-file reservation.

## Contract Intent

Turn `/` into a real Daily Overview workspace without creating a new backend summary layer, without hiding source disagreement, and without inventing calibration, follow-through, or confidence rollups that current source truth does not support.

The first slice is frontend-only.

## Ownership

Frontend ownership:

- new feature `daily-overview-dashboard`
- existing app shell file `frontend/src/app/HomePage.tsx`

Upstream data ownership remains unchanged:

- Today Review owns review-run truth
- Research Hub owns research-priority and light cross-pillar triage truth
- Market Context owns regime/breadth/sector truth
- Data Quality owns readiness and blocker truth
- Signal Generation owns latest raw-signal run truth
- Pipeline Ops owns pipeline ledger truth

The dashboard consumes those truths. It must not redefine them.

## Exact Allowed Read Surfaces

Use only these existing public frontend/API surfaces in slice 1:

- `GET /api/v1/today-review/latest`
- `GET /api/v1/research/overview`
- `GET /api/v1/market-data/review-readiness-summary`
- `GET /api/v1/market-context/summary`
- `GET /api/v1/data-quality/summary`
- `GET /api/v1/signals/runs/latest`
- `GET /api/v1/pipeline/status`
- local scope via `useMarketScope()`

Allowed feature-local wrappers:

- `dailyOverviewDashboardApi.ts`
- `useDailyOverviewDashboard.ts`

Forbidden in slice 1:

- new backend adapter calls
- `POST` run/refresh commands
- direct calibration aggregate reads from `signals/calibration/health` or `signals/calibration/top`
- direct Smart Money fanout calls
- direct Backtests run-list fanout calls
- direct Signal Quality summary fanout for a home-level rollup

## File Boundary

Allowed future writer set:

- `frontend/src/app/HomePage.tsx`
- `frontend/src/features/daily-overview-dashboard/index.ts`
- `frontend/src/features/daily-overview-dashboard/types.ts`
- `frontend/src/features/daily-overview-dashboard/api/dailyOverviewDashboardApi.ts`
- `frontend/src/features/daily-overview-dashboard/hooks/useDailyOverviewDashboard.ts`
- `frontend/src/features/daily-overview-dashboard/components/**`
- `frontend/tests/ui/daily-overview-dashboard.spec.ts`

Forbidden:

- all backend source/tests
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/shared/components/**`
- package manifests
- Prisma schema/migrations
- generated files
- shared hooks/utilities rewrites
- other feature page rewrites

## Required Load Contract

### Phase A: critical load

The dashboard must first load:

1. Today Review latest
2. Research Overview
3. Review-readiness summary

Those three calls own the first viewport.

### Phase B: deferred sections

After Phase A settles, load:

1. Market Context summary
2. Data Quality summary
3. Signal latest run
4. Pipeline status

The page must not block first render on all seven sources.

## Required Section Contract

### Header Rail

Must show:

- `Daily Overview`
- current `region / assetType`
- latest loaded timestamp available from current section payloads
- visible research-support disclaimer
- refresh action

Rules:

- do not invent a single dashboard snapshot timestamp
- do not use marketing or launch-card composition

### Daily Pulse

Primary fields must come from Today Review and review-readiness truth:

- Today Review run status
- trust status
- review mode
- trusted-universe count
- catalog count where available
- required data-through date
- stored/current data-through date
- top blocker or warning
- next bounded action

Allowed secondary copy:

- `ResearchOverview.marketReadiness.headline`
- `ResearchOverview.nextActions`

Forbidden pulse source:

- `ResearchOverview.actionability.dimensions.todayReviewReadiness`
- `ResearchOverview.actionability.dimensions.calibrationReadiness`
- `ResearchOverview.actionability.dimensions.tradePlanReadiness`

Those dimensions are not stable enough on the current base.

### Review Candidate Summary

Required counts:

- long review
- exit-risk review
- watch-only
- blocked

Allowed detail rows:

- Today Review top rows
- Research Hub top research-priority rows

Forbidden fields:

- target
- reward/risk
- target price
- trade-plan geometry
- direct-action wording

### Market Environment And Confirmation

Required fields:

- regime
- breadth status
- leading sectors
- weak sectors
- smart-money accumulation count
- smart-money distribution count
- strongest confirmations
- strongest contradictions

Required limitation rule:

- if asset-type-specific market context is not proven, label the section as region-level context rather than pretending full asset-type specificity.

### Signal And Evidence Health

Allowed now:

- raw bullish / bearish counts
- latest raw-signal run freshness/status
- proven / unproven / missing-backtest / blocked-by-market-gate counts

Required placeholder behavior:

- calibration aggregate must render as `Coming soon`
- measured outcome follow-through must render as `Coming soon`

Forbidden:

- one combined evidence score
- scope-wide calibration readiness derived from first row
- scope-wide calibration readiness derived from unscoped module health

### Data Trust And Pipeline Health

Required fields:

- DQ summary counts
- review-readiness trust status
- blocker categories when available
- next bounded repair action when available
- active pipeline run or latest pipeline run
- failed / blocked / warning stage visibility

Rules:

- data trust problems must remain visible even when candidate counts are non-zero
- this section is read-only in slice 1

### Drilldown Strip

Routes:

- Today Review
- Research Command Center
- Market Context
- Raw Signals
- Signal Calibration
- Data Quality
- Smart Money
- Pipeline Ops
- Backtests

Context chips:

- only from already-loaded payloads
- omitted when truthful context is not available

## Required Placeholder Contract

The first slice must include clearly tagged placeholders for:

1. `Coming soon - Signal Position Follow-Through`
2. `Coming soon - Calibration Evidence-Through Summary`
3. `Coming soon - Measured Outcome Follow-Through`

These placeholders are required product honesty, not optional polish.

## Error And Mixed-Evidence Contract

Rules:

- section errors are local; the whole page must not fail because one source fails
- disagreement between sources must render as `mixed evidence`, warning copy, or side-by-side tension
- the page must not silently choose one source and hide the contradiction
- refresh must refetch reads only

## Product Language Contract

Prefer:

- review
- candidate
- trust
- readiness
- data quality
- evidence
- blocker
- limited
- mixed evidence
- reason summary

Avoid:

- buy
- sell
- target
- reward/risk
- action now
- automated trade
- guaranteed
- confidence score as a cross-system summary

## Explicit Non-Goals

- no backend `daily-overview-dashboard` module in slice 1
- no backend route
- no shared UI rewrite
- no navigation rewrite
- no portfolio or broker workflow
- no signal-position lifecycle summary
- no calibration evidence-through rollup
- no measured-outcome rollup

## Escalation Rule

Stop and escalate to Team 00 if implementation requires any of:

- backend changes
- route-registry changes
- shared UI changes
- package changes
- schema or generated-file changes
- direct calibration aggregate logic
- Smart Money or Backtests fanout beyond the approved read set

## Ready Note

This contract is sufficiently bounded for Team 04 QA planning.

Ready promotion should require:

1. Team 04 QA plan acceptance
2. Team 00 shared-file reservation for `HomePage.tsx`
3. explicit confirmation that placeholders remain placeholders in slice 1
