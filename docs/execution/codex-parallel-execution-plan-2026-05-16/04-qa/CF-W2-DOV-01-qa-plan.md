# CF-W2-DOV-01 QA Plan

Date: 2026-05-26

Owner: Team 04 QA Factory

## Work Item

`CF-W2-DOV-01` - Daily Overview dashboard for frontend `/`.

## QA Status

`ACCEPT / READY-FOR-TEAM00-EVALUATION`

Docs-only QA planning is prepared from the requirement, architecture review, dashboard contract, work packet, UX plan, pre-architecture QA scaffold, current `HomePage.tsx`, and current frontend UI test layout. Executable QA remains blocked until Team 00 promotes one exact implementation handoff for the reserved `HomePage.tsx`, feature-local `daily-overview-dashboard` files, and one feature-owned Playwright spec only.

No Team 04 planning blocker remains. Team 00 can evaluate this packet for Ready promotion if it preserves the exact frontend-only writer set, keeps `/` on the existing route, and does not widen into backend, route registry, shared UI, Prisma, package, or generated-file scope.

## Verdict

The `CF-W2-DOV-01` QA packet is ready for Team 00 Ready evaluation as one bounded frontend-only Daily Overview dashboard slice.

Remaining Team 00 readiness work after this QA plan:

- reserve `frontend/src/app/HomePage.tsx` under one writer for the implementation pass
- copy the exact feature-local writer set from the architecture/work-packet packet into the Ready record
- keep the packet separate from any backend adapter proposal, route-registry change, shared UI rewrite, or package/schema widening

## Scope

First-slice QA for replacing the `/` launch-card surface with a truthful Daily Overview dashboard built from existing read APIs and explicit `Coming soon` placeholders.

Planned in-scope implementation surfaces, once Team 00 promotes an exact handoff:

- `frontend/src/app/HomePage.tsx`
- `frontend/src/features/daily-overview-dashboard/index.ts`
- `frontend/src/features/daily-overview-dashboard/types.ts`
- `frontend/src/features/daily-overview-dashboard/api/dailyOverviewDashboardApi.ts`
- `frontend/src/features/daily-overview-dashboard/hooks/useDailyOverviewDashboard.ts`
- `frontend/src/features/daily-overview-dashboard/components/**`
- `frontend/tests/ui/daily-overview-dashboard.spec.ts`

Out of scope for this child:

- all `backend/src/**`
- all `backend/tests/**`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/shared/components/**`
- existing feature page rewrites outside read-only imports
- Prisma schema/migrations
- package manifests
- generated files
- provider/live-data/startup/backfill/worker/queue scope

## Contract Inputs Reviewed

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-DOV-01-daily-overview-interactive-market-dashboard-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-DOV-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-DOV-01-daily-overview-dashboard-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W2-DOV-01-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/05-ux/CF-W2-DOV-01-daily-overview-dashboard-ux-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-DOV-01-pre-architecture-qa-scaffold.md`
- `frontend/src/app/HomePage.tsx`
- `frontend/tests/ui/README.md`
- current UI suite inventory under `frontend/tests/ui`

## Current Source Alignment

- `/` still renders a static launch-card grid from `frontend/src/app/HomePage.tsx`; the first QA assertion is therefore structural, not cosmetic.
- Team 03 architecture and contract agree that slice 1 must stay frontend-only and use only:
  - `GET /api/v1/today-review/latest`
  - `GET /api/v1/research/overview`
  - `GET /api/v1/market-data/review-readiness-summary`
  - `GET /api/v1/market-context/summary`
  - `GET /api/v1/data-quality/summary`
  - `GET /api/v1/signals/runs/latest`
  - `GET /api/v1/pipeline/status`
  - local scope via `useMarketScope()`
- Daily Pulse authority must come from Today Review plus review-readiness truth. Research Hub `actionability.dimensions.todayReviewReadiness`, `calibrationReadiness`, and `tradePlanReadiness` are not valid pulse authorities on the current base.
- Market Environment can ship now, but current Market Context truth is region-scoped, not proven asset-type-specific. QA must require explicit region-level limitation wording when needed.
- Signal and Evidence Health can show raw-signal and proof summaries now, but calibration aggregate and measured outcome rollups are not truthful current-source summaries and must remain `Coming soon`.
- Placeholder honesty is part of correctness, not optional UX polish. The dashboard fails QA if it borrows nearby data to make deferred areas look filled.

## Exact Acceptance Matrix

| ID | Source basis | Exact acceptance requirement | QA proof required after implementation |
| --- | --- | --- | --- |
| AC-01 | Requirement | `/` is redefined from a launch-card page into a true Daily Overview workspace dashboard. | Playwright proves `/` no longer shows the old launch-card grid as the primary surface and instead renders a dashboard header plus Daily Pulse in the first viewport. |
| AC-02 | Requirement | The page gives one dedicated area for the most important cross-system filtered information. | UI smoke proves `/` loads and renders summaries from more than one approved source module on one page without route-hopping. |
| AC-03 | Requirement + UX + Contract | The first viewport shows scope, freshness/trust context, disclaimer, and Daily Pulse rather than generic navigation cards. | Playwright proves visible `Daily Overview`, `region / assetType`, one loaded timestamp, research-support disclaimer, refresh action, and Daily Pulse status/headline/blocker content above drilldown-only content. |
| AC-04 | Requirement + UX + Contract | The dashboard includes distinct sections for Daily Pulse, Review Candidate Summary, Market Environment and Confirmation, Signal and Evidence Health, Data Trust and Pipeline Health, and Drilldown Strip. | UI smoke asserts each section label or equivalent semantic header exists and owns domain-specific content or a truthful limited/blocked state. |
| AC-05 | Requirement + Architecture + Contract | Every section uses existing truthful data or an explicit `Coming soon` placeholder. | Network assertions prove only approved reads are used. UI assertions prove deferred sections render explicit `Coming soon` copy instead of counts, charts, or inferred scores. |
| AC-06 | Requirement + UX | Research-support wording is preserved and financial-advice, target, and reward/risk wording is absent. | Playwright text scan plus reviewer inspection reject `buy`, `sell now`, `target price`, `profit target`, `reward/risk`, `R:R`, `place order`, `broker`, and similar terms on `/`. |
| AC-07 | Requirement | The dashboard does not require portfolio ownership, broker execution, or Trade Plan target semantics to feel complete. | Smoke proves the core dashboard renders meaningful sections without portfolio P/L, execution controls, order flow, target fields, or trade-plan geometry. |
| AC-08 | Requirement + UX | Empty/blocked states explain why data is absent and where the user should drill next. | Per-section blocked/empty mock scenarios show domain-specific reason text plus retry or drill-next route rather than generic empty filler or zeros. |
| AC-09 | Requirement + Work Packet | No backend, route-registry, shared UI, Prisma, package, provider/live, or startup/backfill widening is silently introduced. | Code-review gate and file-diff inspection confirm implementation stayed within the reserved frontend-only writer set. |
| AC-10 | Requirement + Contract | Header rail must show title, `region / assetType`, latest loaded timestamp, disclaimer, and refresh action. | UI smoke asserts all five are visible and refresh triggers observable refetches instead of a cosmetic spinner only. |
| AC-11 | Requirement + Contract + UX | Daily Pulse must answer whether the current scope is review-supported, limited, blocked, or mixed, with run status, trust status, review mode, data-through framing, top blocker/warning, and next bounded action. | Mocked scenarios prove Daily Pulse changes with Today Review and review-readiness payloads, preserves warnings, and never falls back to unstable Research Hub actionability dimensions as the authority. |
| AC-12 | Requirement + Contract + UX | Review Candidate Summary must show long review, exit-risk review, watch-only, and blocked counts with truthful tab/segment switching and drilldowns. | Playwright proves switching groups updates visible rows without stale counts, and row drilldowns route to approved downstream surfaces only. |
| AC-13 | Requirement + Architecture + Contract + UX | Market Environment and Confirmation must show regime, breadth, sectors, smart-money context, and confirmation/contradiction notes while preserving disagreement. | UI smoke proves mixed evidence remains visible as mixed/contradictory and non-`STOCK` limitation wording appears when asset-type-specific context is not proven. |
| AC-14 | Requirement + Architecture + Contract + UX | Signal and Evidence Health must keep raw signals, proof, and deferred evidence lanes separate. | UI smoke proves raw-signal counts and latest run status can render now, while calibration aggregate and measured outcome remain separate `Coming soon` placeholders with no combined confidence number. |
| AC-15 | Requirement + Contract + UX | Data Trust and Pipeline Health must show DQ summary, readiness blocker themes, next repair action, and pipeline status before users misread downstream counts. | Mocked blocker scenarios prove DQ/pipeline warnings stay visible even when candidate counts are non-zero. |
| AC-16 | Requirement + Contract + UX | Drilldown Strip must route to Today Review, Research, Market Context, Raw Signals, Signal Calibration, Data Quality, Smart Money, Pipeline Ops, and Backtests with additive-only truthful chips. | UI smoke proves all approved routes are present and any chip/count shown is sourced from already-loaded payloads; absent truth yields no chip or explicit unavailable wording. |
| AC-17 | Requirement + Contract + UX | `Coming soon - Signal Position Follow-Through`, `Coming soon - Calibration Evidence-Through Summary`, and `Coming soon - Measured Outcome Follow-Through` must stay honest. | UI smoke proves all three placeholders render as clearly tagged future sections with dependency/missing-truth explanations and no fake counts, charts, statuses, or percentages. |

## Required QA Assertions

- `/` remains the existing route and still resolves through `HomePage.tsx`.
- `HomePage.tsx` becomes a thin shell for the dashboard, not a second static card page.
- Phase A loads are first-viewport-critical:
  - Today Review latest
  - Research Overview
  - review-readiness summary
- Phase B loads are deferred:
  - Market Context summary
  - Data Quality summary
  - latest signal run
  - pipeline status
- The first viewport does not block on all seven reads before rendering.
- Daily Pulse uses Today Review plus review-readiness as the primary truth source.
- Research Hub unstable actionability dimensions are not used as the pulse authority.
- Market Context limitations remain visible where asset-type-specific context is not proven.
- Calibration aggregate, Signal Position Follow-Through, and Measured Outcome Follow-Through remain placeholders in slice 1.
- No section introduces target, reward/risk, direct-advice, broker, or execution semantics.

## Playwright Smoke Expectations For `/`

The dedicated smoke should live at:

- `frontend/tests/ui/daily-overview-dashboard.spec.ts`

Minimum route-level smoke expectations:

- visit `/` and prove the page is the dashboard, not the legacy launch grid
- first viewport shows:
  - `Daily Overview`
  - current `region / assetType`
  - one loaded timestamp or freshness label
  - research-support disclaimer
  - refresh action
  - Daily Pulse status/headline
- Daily Pulse shows Today Review and review-readiness-backed content before lower-priority sections
- Review Candidate Summary supports group switching without stale rows or stale counts
- drill controls navigate to:
  - `/today-review`
  - `/research`
  - `/market-context`
  - `/signals`
  - `/signals/calibration`
  - `/data-quality`
  - `/smart-money`
  - `/pipeline-ops`
  - `/backtests`
- blocked/limited/empty states are domain-specific and route the user forward
- all three `Coming soon` placeholders render exactly where truth is deferred
- page text excludes advice/target/R:R language

Recommended scenario set for the spec:

1. happy-path mixed dashboard data
2. Today Review blocked but other sections available
3. no review candidates for current scope
4. Market Context limited to region-level wording
5. DQ/pipeline blockers visible despite non-zero candidate counts
6. placeholder-only deferred evidence sections
7. scope change triggers refetch and visible content change
8. refresh button reissues approved reads

## Data Sourcing And No-Hardcode Checks

QA must prove the dashboard is sourced from existing APIs and not hardcoded, inferred, or faked.

- Intercept all dashboard requests and assert only the approved GET routes are called.
- Assert requests carry `region` and `assetType` where the source route supports those scope params.
- Change market scope and prove the dashboard refetches and visibly changes section content.
- Mutate mocked payload values between loads and prove visible timestamps, counts, warnings, and labels change accordingly.
- Verify candidate counts reconcile to Today Review group payloads and tab bodies for the same mocked data.
- Verify Daily Pulse blocker/warning text reconciles to Today Review or review-readiness payload content, not a local constant.
- Verify Research Hub `marketReadiness.headline` or `nextActions` may appear only as secondary copy, never as the sole pulse authority when Today Review truth disagrees.
- Verify smart-money counts shown in Market Environment come only from already-approved source payloads and are omitted when truthful source data is not available.
- Verify drilldown chips/counts disappear or show unavailable states when the source does not expose those values.
- Verify a changed timestamp in any loaded source can update the header freshness label; the label must not remain a hardcoded static string.
- Verify refresh causes observable network activity or state transition and not only a button spinner.

## Coming Soon Placeholder Honesty Checks

These are hard QA gates.

- `Coming soon - Signal Position Follow-Through` must not show active position counts, closed outcome counts, or synthetic performance labels.
- `Coming soon - Calibration Evidence-Through Summary` must not derive a scope-wide calibration state from `/signals/calibration/health`, first-row calibration data, or any unrelated module health.
- `Coming soon - Measured Outcome Follow-Through` must not borrow Signal Quality page copy to imply a stable dashboard rollup exists.
- Each placeholder must explicitly say the summary is not yet truthful on the current source basis.
- Each placeholder must identify the missing dependency or future requirement family in brief copy.
- Placeholder sections must not show fake graphs, fake percentages, fake status chips, or zero-filled summary cards pretending to be live.

## No Advice / No Targets / No R:R Guard

Reject the packet if `/` introduces any of the following in visible copy, tooltip copy, labels, CTA text, placeholder text, mocked smoke assertions, or section headings:

- `buy now`
- `sell now`
- `must buy`
- `must sell`
- `financial advice`
- `place order`
- `execute order`
- `broker`
- `target price`
- `price target`
- `profit target`
- `reward/risk`
- `R:R`
- `take profit`
- `stop and target`
- `guaranteed`
- `guaranteed return`

Preferred wording remains:

- `Daily Overview`
- `Daily Pulse`
- `review supported`
- `review limited`
- `review blocked`
- `mixed evidence`
- `bullish trigger`
- `bearish trigger`
- `review candidate`
- `watch only`
- `blocked`
- `data quality`
- `reason summary`
- `consider review`

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Recommended frontend build after accepted implementation and resource checks:

```powershell
cd frontend
npm.cmd run build
```

Focused Daily Overview UI smoke after implementation:

```powershell
cd frontend
npm.cmd run test:ui -- daily-overview-dashboard.spec.ts --workers=1
```

Recommended regression cluster if the final dashboard materially reuses live patterns from source pages:

```powershell
cd frontend
npm.cmd run test:ui -- daily-overview-dashboard.spec.ts today-trade-review.spec.ts research-hub.spec.ts market-context-intelligence.spec.ts data-quality-engine.spec.ts pipeline-ops.spec.ts signal-generation-engine.spec.ts --workers=1
```

Optional expanded regression when implementation surfaces already-loaded Smart Money behavior in a user-visible way:

```powershell
cd frontend
npm.cmd run test:ui -- daily-overview-dashboard.spec.ts today-trade-review.spec.ts research-hub.spec.ts market-context-intelligence.spec.ts data-quality-engine.spec.ts pipeline-ops.spec.ts signal-generation-engine.spec.ts smart-money-intelligence.spec.ts --workers=1
```

## Exact Reject Conditions

Reject the packet immediately and return it to Team 00 / Architect if implementation does any of the following:

- edits any file outside the exact reserved frontend-only writer set
- edits:
  - `backend/src/**`
  - `backend/tests/**`
  - `frontend/src/app/routes.tsx`
  - `frontend/src/app/navigationMetadata.tsx`
  - `frontend/src/shared/components/**`
  - Prisma schema or migrations
  - package manifests
  - generated files
  - provider/live/startup/backfill/worker/queue scope
- adds a backend dashboard adapter or any new dashboard-specific backend route
- performs `POST` run/refresh commands from `/`
- uses unapproved API surfaces or fanout calls beyond the contract
- treats Research Hub unstable actionability dimensions as Daily Pulse authority
- fabricates a single global confidence score or combined evidence score
- derives calibration aggregate truth from first-row calibration data, unscoped module health, or any source other than an approved future requirement
- hides DQ/pipeline blockers behind success styling or non-zero candidate counts
- removes region-level limitation wording when Market Context is not asset-type-specific
- leaves the old launch-card page as the primary `/` body with only dashboard fragments added below it
- introduces advice-like, target-like, reward/risk-like, or execution-like wording

These are rejection conditions for the bounded first child, not soft warnings.

## Stop Conditions

Stop QA and return the packet to Team 00 / Architect if:

- truthful `/` behavior cannot be delivered inside the exact reserved frontend-only writer set
- implementation requires backend changes, route-registry changes, shared UI changes, package changes, or Prisma/schema changes
- implementation needs direct Smart Money, Backtests, Calibration, or Signal Quality fanout beyond the approved read set
- implementation attempts to replace required placeholders with inferred summaries
- implementation cannot prove scope refetch or refresh truth without widening into shared hooks/utilities

## Evidence Required Later

- exact implementation handoff limited to the reserved frontend-only writer set
- Playwright evidence for:
  - dashboard-first `/` rendering
  - first viewport trust/scope/pulse content
  - candidate group switching
  - drilldown navigation
  - blocked and empty state honesty
  - region-level limitation wording
  - placeholder-only deferred sections
  - scope-change refetch
  - refresh refetch
  - no advice/no target/no R:R wording
- frontend build output
- focused `daily-overview-dashboard.spec.ts` output
- expanded regression output if Team 00 requires it for promotion or signoff
- explicit note that no forbidden scope and no hardcoded/faked summaries were introduced

## Readiness Verdict For Team 00

Recommendation: `READY FOR TEAM 00 PROMOTION` as one bounded frontend-only child.

Current blockers to executable QA, but not to Team 00 Ready evaluation:

- no implementation handoff yet exists
- `frontend/src/app/HomePage.tsx` still needs explicit Team 00 shared-file reservation
- no dedicated `frontend/tests/ui/daily-overview-dashboard.spec.ts` exists yet

Promotion blockers if Team 00 cannot hold the packet to the approved scope:

- any backend adapter proposal
- any route-registry or shared UI dependency
- any attempt to replace placeholders with inferred summaries
- any need to widen package, Prisma, generated, or provider/live scope
