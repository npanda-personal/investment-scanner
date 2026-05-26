# CF-W2-DOV-01 Architecture Review

Date: 2026-05-26

Owner: Team 03 Architecture Factory

## Status

Architecture-prepared.

This is a docs-only Team 03 source-map pass. It does not self-promote the item to Ready.

## Verdict

`CF-W2-DOV-01` has a safe first slice on the current source base.

Recommended first slice:

- keep `/` owned by the existing app shell;
- replace the launch-card body in `frontend/src/app/HomePage.tsx` with a new frontend feature, `daily-overview-dashboard`;
- compose the dashboard from existing public read APIs;
- do not add a backend `daily-overview-dashboard` module in slice 1;
- ship explicit `Coming soon` placeholders where current source truth is still incomplete.

This can become a `Ready candidate` after Team 04 QA planning and Team 00 shared-file reservation for `frontend/src/app/HomePage.tsx`.

## Why This Shape Is Safest

1. It avoids backend route-registry and cross-module adapter work.
2. It avoids creating a second backend aggregator that duplicates Research Hub before performance evidence exists.
3. It respects the current one-writer risk on shared files by keeping the shared app touch to one shell file.
4. It lets the dashboard reuse existing persisted or summary read paths instead of inventing a new scoring layer.
5. It keeps unresolved calibration, outcome-follow-through, and position-follow-through truth as placeholders instead of fake summaries.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-DOV-01-daily-overview-interactive-market-dashboard-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`
- `frontend/src/app/HomePage.tsx`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/features/today-trade-review/**`
- `frontend/src/features/research-hub/**`
- `frontend/src/features/market-context-intelligence/**`
- `frontend/src/features/data-quality-engine/**`
- `frontend/src/features/signal-generation-engine/**`
- `frontend/src/features/signal-calibration-engine/**`
- `frontend/src/features/smart-money-intelligence/**`
- `frontend/src/features/backtesting-strategy-lab/**`
- `frontend/src/features/pipeline-ops/**`
- `backend/src/modules/today-trade-review/**`
- `backend/src/modules/research-hub/**`
- `backend/src/modules/market-context-intelligence/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/signal-generation-engine/**`
- `backend/src/modules/signal-calibration-engine/**`
- `backend/src/modules/smart-money-intelligence/**`
- `backend/src/modules/backtesting-strategy-lab/**`
- `backend/src/modules/pipeline-orchestration/**`
- existing Team 03 and Team 04 contracts/QA docs for `RH-01`, `MCTX-01`, `SMI-01`, `SIG-01B`, `CAL-01`, `CAL-02`, `BT-04`, and Pipeline Ops

## Current Source Reality

### Confirmed current `/` behavior

- `/` still renders `frontend/src/app/HomePage.tsx`
- `HomePage` is still a static launch-card grid
- no existing daily dashboard feature or backend summary adapter exists on the current base

### No separate Team 02 explorer summary was found

The current Team 02 requirement outbox is the operative source-map summary for this item.

### Stale or conflicting source notes

These do not block the first slice, but they matter:

1. `backend/src/modules/research-hub/research-hub.service.ts` still hard-codes unstable actionability dimensions for:
   - `calibrationReadiness`
   - `todayReviewReadiness`
   - `tradePlanReadiness`

   Result:
   - the dashboard must not treat `ResearchOverview.actionability` as the single trust authority for Daily Pulse.

2. `backend/src/modules/today-trade-review/today-trade-review.md` still documents target/reward/R:R-oriented page fields.

   Result:
   - the dashboard must ignore Trade Plan target geometry and use only research-support counts/reason summaries.

3. `market-context-intelligence` current public route is region-scoped, not asset-type-scoped.

   Result:
   - the Market Environment section is truthful now, but it must be labeled as region-level context when asset-type specificity is not proven.

4. `signal-calibration-engine` current public frontend/backed read path does not expose a truthful scoped aggregate summary.

   Result:
   - a scope-wide calibration summary must remain placeholder-only until `CF-W2-CAL-02` exists on the chosen base.

5. `backtesting-strategy-lab` current-proof freshness labels are documented in execution artifacts, but they are not present in the current repo source base.

   Result:
   - the dashboard must not rely on BT current-proof labels in slice 1.

## Section-To-Source Map

| Dashboard section | Ship now? | Primary source | Exact current source basis | Notes |
| --- | --- | --- | --- | --- |
| Header rail | Yes | local scope plus loaded timestamps | `useMarketScope()`, `TodayReview.run.finishedAt`, `ResearchOverview.generatedAt`, `MarketContextSummary.updatedAt`, `DataQualitySummary.latestEvaluationAt`, `SignalGenerationRunAudit.completedAt`, `PipelineStatusSnapshot.generatedAt` | Use the latest successfully loaded timestamp available; do not claim a single backend-generated dashboard timestamp. |
| Daily Pulse | Yes | Today Review plus Research Hub plus current review-readiness summary | `GET /api/v1/today-review/latest`; `GET /api/v1/research/overview`; `GET /api/v1/market-data/review-readiness-summary` via existing DQ feature helper | Use Today Review run status/trust/mode/counts as primary truth. Use Research Hub `marketReadiness.headline` and `nextActions`, not unstable actionability placeholders. |
| Review Candidate Summary | Yes | Today Review plus Research Hub | `TodayReviewResponse.groups`; `ResearchOverview.researchPriorities`; `ResearchOverview.nextActions` | Counts come from Today Review groups. Optional priority list comes from Research Hub. No trade-plan target/R:R fields. |
| Market Environment and Confirmation | Yes, limited | Market Context plus Research Hub confirmations | `GET /api/v1/market-context/summary`; `ResearchOverview.confirmationSummary` | Use Market Context for regime/breadth/sectors. Use Research Hub for Smart Money counts and confirmation/contradiction notes. Mark region-level limitation when assetType-specific context is not proven. |
| Signal and Evidence Health | Partial | Research Hub plus Signal Generation plus Research proof | `ResearchOverview.confirmationSummary.signalSummary`; `GET /api/v1/signals/runs/latest`; `ResearchOverview.strategyProofSummary` | Raw signal counts and latest run status are truthful now. Strategy proof and missing-backtest counts are truthful now. Calibration aggregate is not. |
| Data Trust and Pipeline Health | Yes | Data Quality plus review-readiness plus Pipeline Ops | `GET /api/v1/data-quality/summary`; `GET /api/v1/market-data/review-readiness-summary`; `GET /api/v1/pipeline/status` | Show DQ counts, readiness blockers/next action, and active/latest pipeline stage state. |
| Drilldown strip | Yes | reuse already-loaded section payloads | routes already present in `navigationMetadata.tsx` | Only show context chips when already loaded from the above section sources. |
| Coming soon - Signal Position Follow-Through | Placeholder only | none yet | depends on `CF-W2-SPL-01B` and later durable lifecycle work | Do not fake active/closed follow-through counts. |
| Coming soon - Calibration Evidence-Through Summary | Placeholder only | none yet | blocked by current source gap and `CF-W2-CAL-02` | Do not derive scope-wide calibration readiness from first row or module health. |
| Coming soon - Measured Outcome Follow-Through | Placeholder only | none yet | Signal Quality has useful page diagnostics but no stable Daily Overview summary contract | Keep placeholder-only. |

## Exact Section Guidance

### 1. Header Rail

Use:

- static page title `Daily Overview`
- current `region / assetType`
- latest successfully loaded timestamp across sections
- research-support disclaimer
- refresh button

Do not use:

- marketing hero layout
- launch cards
- claim of one canonical backend-generated dashboard snapshot

### 2. Daily Pulse

Primary authority:

- `TodayReviewResponse.run`
- `TodayReviewResponse.run.sourceSnapshot.reviewReadiness`

Secondary authority:

- `ResearchOverview.marketReadiness`
- `ResearchOverview.nextActions`
- `DataQualityReviewReadinessSummary` when Today Review has no latest run

Do not use as the pulse authority:

- `ResearchOverview.actionability.dimensions.todayReviewReadiness`
- `ResearchOverview.actionability.dimensions.calibrationReadiness`
- `ResearchOverview.actionability.dimensions.tradePlanReadiness`

Those are still placeholder-like on the current source base.

### 3. Review Candidate Summary

Truthful now:

- long review count
- exit-risk review count
- watch-only count
- blocked count
- top Today Review rows
- top Research Hub priority rows

Do not surface:

- target price
- reward/risk
- trade-plan geometry
- direct-action copy

### 4. Market Environment And Confirmation

Truthful now:

- regime
- breadth
- leading sectors
- weak sectors
- smart-money accumulation/distribution counts
- top confirmations/contradictions

Limitation:

- current Market Context public route is region-only
- for non-`STOCK` scopes, show explicit limited wording such as `Region-level context`

### 5. Signal And Evidence Health

Truthful now:

- bullish / bearish raw signal counts from Research Hub confirmation summary
- latest raw-signal generation run status / freshness from `signals/runs/latest`
- proven / unproven / missing-backtest / blocked-by-market-gate counts from Research Hub strategy-proof summary

Not truthful now:

- scope-wide calibration usable / limited / unavailable summary
- scope-wide calibration warning count
- scope-wide measured signal outcome follow-through summary

Result:

- this section should mix live rows and explicit placeholders
- it must not invent a combined confidence score

### 6. Data Trust And Pipeline Health

Truthful now:

- DQ summary counts
- review-readiness trust mode and blocker categories
- next bounded repair action
- pipeline active/latest run status
- pipeline stage warnings/failures

Do not do:

- trigger pipeline commands from the dashboard in slice 1
- hide DQ blockers behind a green candidate count

### 7. Drilldown Strip

Routes can be shipped now:

- `/today-review`
- `/research`
- `/market-context`
- `/signals`
- `/signals/calibration`
- `/data-quality`
- `/smart-money`
- `/pipeline-ops`
- `/backtests`

Context chips must remain additive-only and sourced from already loaded section payloads.

## Chosen Architecture

### First slice

Frontend-only feature composition.

Recommended new feature:

- `frontend/src/features/daily-overview-dashboard`

Recommended shell behavior:

- keep `frontend/src/app/HomePage.tsx`
- replace its launch-card contents with `<DailyOverviewDashboardPage />`
- do not create a new frontend route
- do not touch backend source

### Load strategy

Use staged loading, not one huge blocking waterfall.

#### Phase A: first viewport / critical load

Load in parallel:

1. `GET /api/v1/today-review/latest`
2. `GET /api/v1/research/overview`
3. `GET /api/v1/market-data/review-readiness-summary`

These cover:

- scope and trust headline
- Daily Pulse
- candidate counts
- next best action
- blocked/limited empty-state explanation when Today Review has no run

#### Phase B: deferred section loads

Load after Phase A resolves, or lazily when sections mount:

1. `GET /api/v1/market-context/summary`
2. `GET /api/v1/data-quality/summary`
3. `GET /api/v1/signals/runs/latest`
4. `GET /api/v1/pipeline/status`

Do not load in slice 1:

- `signals/calibration/top` for page-level aggregation
- `signals/calibration/health` as a scoped proxy
- direct Smart Money top/distribution calls
- direct Backtest run lists
- Signal Quality summary for a fake home-level rollup

Research Hub already provides the light Smart Money / strategy-proof confirmation that the dashboard needs.

### Error model

The page should use section-local error handling with `Promise.allSettled` semantics.

Rules:

- one failing section must not blank the full page
- failed sections render `Unavailable` or `Limited` states with a drill link
- refresh only refetches read APIs
- refresh does not post runs, trigger pipeline commands, or mutate data

## Why A Backend Adapter Is Deferred

### Adapter is technically possible

The repo already exposes public service classes for:

- Today Review
- Research Hub
- Market Context
- Data Quality
- Signal Generation
- Pipeline Orchestration

So a future backend `daily-overview-dashboard` module is feasible.

### Adapter is still the wrong first slice

It would immediately require:

- new backend module ownership
- `backend/src/api/routes.ts` reservation
- new controller/router/types/validation surface
- a second cross-system aggregator beside Research Hub
- new Team 00 gate handling for shared backend files

That is more churn than the first slice needs.

### Open a backend adapter only if one of these becomes true

1. measured dashboard load is slow enough to hurt the first-viewport workflow;
2. the frontend fanout grows beyond the staged summary set above;
3. the Market Context fallback-generation behavior becomes too expensive for home-page load;
4. the Product Owner later wants one canonical persisted dashboard snapshot rather than section-level live reads.

If that happens, the adapter must be a Team 00 gate and must consume public services only.

## Likely Future File Reservations

### Recommended slice-1 writer set

- `frontend/src/app/HomePage.tsx`
- `frontend/src/features/daily-overview-dashboard/index.ts`
- `frontend/src/features/daily-overview-dashboard/types.ts`
- `frontend/src/features/daily-overview-dashboard/api/dailyOverviewDashboardApi.ts`
- `frontend/src/features/daily-overview-dashboard/hooks/useDailyOverviewDashboard.ts`
- `frontend/src/features/daily-overview-dashboard/components/**`
- `frontend/tests/ui/daily-overview-dashboard.spec.ts`

### Slice-1 forbidden scope

- `backend/src/**`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/shared/components/**`
- Prisma schema / migrations
- package manifests
- generated files
- shared hooks or shared utility rewrites
- provider/live-data changes
- pipeline command surfaces
- route-registry edits

### Team 00 gate if frontend shell reservation is denied

If Team 00 does not want `HomePage.tsx` edited in the same pass, stop and escalate.

There is no truthful route-registry-free alternative other than keeping the current launcher in place.

## Ready Assessment

### Can this become Ready after QA planning?

Yes.

Current architecture verdict:

- no new backend contract is required for slice 1
- no schema, route-registry, package, shared-UI, or generated-file change is required
- the remaining gate is QA planning plus Team 00 file reservation

### What remains before Ready promotion

1. Team 04 QA plan for the frontend-only slice
2. Team 00 explicit single-writer reservation for `frontend/src/app/HomePage.tsx`
3. Team 00 confirmation that slice 1 must keep:
   - calibration aggregate as `Coming soon`
   - signal position follow-through as `Coming soon`
   - measured outcome follow-through as `Coming soon`

## Risks And Limitations

1. Research Hub actionability placeholders:
   - do not let implementers wire Daily Pulse directly to placeholder actionability dimensions.

2. Market Context asset-type gap:
   - treat Market Context as region-level until asset-type-specific truth exists.

3. Multi-endpoint refresh consistency:
   - timestamps can differ across sections; the UI must show section truth, not fake atomic consistency.

4. No calibration page summary on current base:
   - do not infer page-level readiness from first row or unscoped health.

5. Backtesting current-proof labels absent on current base:
   - do not promise them on the dashboard.

## Next Gate

1. Team 04: prepare the QA plan for the frontend-only `CF-W2-DOV-01` slice.
2. Team 00: reserve `frontend/src/app/HomePage.tsx` plus the new feature/test files and decide Ready promotion.
3. Implementer: build the feature without widening into a backend adapter unless Team 00 explicitly reopens that path.
