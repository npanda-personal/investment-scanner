# CF-W2-DOV-01 QA Plan

Date: 2026-05-26

Owner: Team 04 - QA Factory

Mode: Docs-only QA planning refresh. No application source, tests, package manifests, route registries, Prisma/schema/migrations/generated files, shared UI, backend/frontend source, or implementation worktrees were modified.

## Work Item

`CF-W2-DOV-01` - Daily Overview investor/trader-first dashboard refresh for frontend `/`.

## QA Verdict

`QA-PLAN READY`

Team 04 accepts the refreshed investor/trader-first requirement, UX plan, architecture review, contract, and work packet as QA-plannable for one bounded frontend-only Slice 1.

Executable QA remains pending until Team 00 promotes one exact implementation handoff and reserves the allowed writer set. This QA plan does not approve implementation by itself.

## QA Position

The prior Daily Overview QA framing is superseded where it validated an admin/developer monitoring layout around `Daily Pulse`, `Signal and Evidence Health`, `Data Trust and Pipeline Health`, or a first-viewport drilldown strip.

Slice 1 QA must validate that `/` reads as an investor/trader daily dashboard:

1. first viewport anchors on `Market Pulse` and `High-Priority Review Candidates`;
2. candidate lanes use Today Review / Research truth without advice wording;
3. `Market Movers` remains placeholder-only unless a truthful source exists;
4. `FII/DII Activity` remains placeholder-only unless a truthful source exists;
5. `Evidence Caveats` stays compact and secondary;
6. no fake freshness, progress, confidence, market-wide, or institutional-flow claims appear;
7. no backend, provider/live, pipeline command, route-registry, Prisma, package, generated, or shared-UI scope is introduced.

## Contract Inputs Reviewed

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-DOV-01-daily-overview-interactive-market-dashboard-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/05-ux/CF-W2-DOV-01-daily-overview-dashboard-ux-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-DOV-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-DOV-01-daily-overview-dashboard-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W2-DOV-01-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W2-DOV-01-architecture-outbox.md`
- existing `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-DOV-01-qa-plan.md`
- existing `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W2-DOV-01-qa-plan-outbox.md`

## Implementation Scope QA Will Accept

Allowed writer set for the implementation pass:

- `frontend/src/app/HomePage.tsx`
- `frontend/src/features/daily-overview-dashboard/index.ts`
- `frontend/src/features/daily-overview-dashboard/types.ts`
- `frontend/src/features/daily-overview-dashboard/api/dailyOverviewDashboardApi.ts`
- `frontend/src/features/daily-overview-dashboard/hooks/useDailyOverviewDashboard.ts`
- `frontend/src/features/daily-overview-dashboard/components/DailyOverviewDashboardPage.tsx`
- `frontend/src/features/daily-overview-dashboard/components/MarketPulsePanel.tsx`
- `frontend/src/features/daily-overview-dashboard/components/ReviewCandidatesPanel.tsx`
- `frontend/src/features/daily-overview-dashboard/components/WatchBlockedPanel.tsx`
- `frontend/src/features/daily-overview-dashboard/components/ComingSoonPanel.tsx`
- `frontend/src/features/daily-overview-dashboard/components/EvidenceCaveatsPanel.tsx`
- `frontend/src/features/daily-overview-dashboard/components/SupportingNavigationPanel.tsx`
- `frontend/src/features/daily-overview-dashboard/components/**` for additional feature-local components only
- `frontend/tests/ui/daily-overview-dashboard.spec.ts`

Allowed reporting docs after Team 00 Ready promotion:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-CF-W2-DOV-01-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-DOV-01-developer-handoff.md`

Forbidden writer scope:

- `backend/src/**`
- `backend/tests/**`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/shared/**`
- `frontend/src/contexts/**`
- existing feature pages outside read-only imports
- existing feature API/hook/type files outside read-only imports
- Prisma schema, migrations, and generated files
- `package.json`, `package-lock.json`, and package manifests
- provider/live-data files
- startup, scheduler, backfill, worker, queue, and pipeline command files
- route registries
- root `AGENTS.md`
- `docs/AGENTS.md`
- `docs/codex-agent-team-plan/**`

QA must reject the implementation handoff if any forbidden file becomes necessary or modified.

## Approved Read Contract

Allowed Slice 1 reads:

- `GET /api/v1/today-review/latest`
- `GET /api/v1/research/overview`
- `GET /api/v1/market-data/review-readiness-summary`
- `GET /api/v1/market-context/summary`
- `GET /api/v1/data-quality/summary`
- `GET /api/v1/signals/runs/latest`
- `GET /api/v1/pipeline/status`
- `useMarketScope()`

Forbidden Slice 1 calls:

- new backend `daily-overview-dashboard` API
- POST run, refresh, scan, sync, import, backfill, worker, or pipeline command endpoints
- provider/live calls
- direct Smart Money fanout for FII/DII
- direct Backtesting fanout
- direct Signal Quality fanout
- calibration aggregate inference from calibration health/top/row endpoints
- watchlist daily-change or signal-row sorting relabeled as market-wide movers

QA must intercept network activity in the Playwright smoke and fail on any unapproved call from `/`.

## Acceptance Matrix

| ID | Area | Required QA acceptance | Proof required after implementation |
| --- | --- | --- | --- |
| AC-01 | First viewport identity | `/` must read as an investor/trader daily dashboard, not an admin, pipeline-monitor, signal-health, or launch-card surface. | Screenshot or Playwright viewport assertions show `Daily Overview`, scope, `Market Pulse`, `High-Priority Review Candidates`, `Coming soon - Market Movers`, `Coming soon - FII/DII Activity`, `Watch And Blocked`, and compact `Evidence Caveats` in the first viewport on desktop. |
| AC-02 | Header rail | Header shows `Daily Overview`, active `region / assetType`, research-support disclaimer, refresh action, and a truthful loaded/source timestamp only when available. | UI smoke asserts all required header elements and verifies refresh triggers approved read refetches only. |
| AC-03 | Market Pulse | `Market Pulse` uses Today Review, review-readiness, Research Overview market readiness, and limited Market Context truth; it labels `limited`, `blocked`, or `mixed evidence` when applicable. | Mocked scenarios prove reviewability changes with Today Review/review-readiness payloads and Market Context is labeled region-level where asset-type specificity is not proven. |
| AC-04 | High-Priority Review Candidates | Bullish, bearish, and exit-risk lanes use Today Review `groups.longReview`, `groups.shortReview`, and `groups.exitRiskReview` with source-owned ordering and reason summaries. | UI smoke verifies rows/counts reconcile to mocked Today Review groups and Research Hub context appears only as supporting context, not reordering authority. |
| AC-05 | Advice-safe candidates | Candidate copy uses research-support language such as `high-priority review candidate`, `bullish review`, `bearish / exit-risk review`, and `reason summary`. | Text scan and reviewer inspection prove no advice, execution, target, reward/risk, or synthetic ranking language is visible. |
| AC-06 | Market Movers placeholder | `Market Movers` is placeholder-only unless a truthful scoped market-wide movers source is explicitly approved later. | UI smoke proves `Coming soon - Market Movers` renders with no rows, fake counts, fake charts, fake freshness, provider calls, or watchlist/signal relabeling. |
| AC-07 | FII/DII placeholder | `FII/DII Activity` is placeholder-only unless a truthful local institutional-flow source is explicitly approved later. | UI smoke proves `Coming soon - FII/DII Activity` renders with no guessed inflow/outflow, no Smart Money relabeling, no fake freshness, and no provider/live calls. |
| AC-08 | Watch And Blocked | `Watch And Blocked` shows watch-only, blocked, insufficient-data, and unproven groups with reasons before any drill action. | Mocked scenarios prove each state renders reason text or a domain-specific empty state and routes only to approved owner pages. |
| AC-09 | Evidence Caveats | `Evidence Caveats` stays compact, visually secondary, and links outward for detail; it does not become a first-viewport `Data Trust and Pipeline Health` or `Signal and Evidence Health` console. | Desktop and mobile smoke checks verify the caveat area is smaller/quieter than `Market Pulse` and candidates and contains only concise warnings/statuses. |
| AC-10 | No fake freshness/progress/confidence | The dashboard must not invent atomic snapshot consistency, fake generated timestamps, fake percent progress, fake confidence scores, or zero-filled placeholder values. | Mocked payload timestamp changes update visible source/loaded labels; missing timestamps render no fake date. Text scan rejects `confidence`, `% complete`, or similar invented progress unless source-owned. |
| AC-11 | Section-local failures | One failed supporting source must not blank the full page. | Network failure scenarios prove affected sections show `Limited` or `Unavailable` while header, placeholders, and available critical sections remain visible. |
| AC-12 | Scope behavior | The dashboard uses the app market scope and refetches when scope changes. | UI smoke changes `region / assetType` where supported and verifies approved reads refire with scope params where the source route supports them and visible content/limited state changes. |
| AC-13 | Supporting navigation | Supporting navigation is secondary and uses only approved routes and already-loaded context chips. | UI smoke verifies links to `/today-review`, `/research`, `/market-context`, `/signals`, `/signals/calibration`, `/data-quality`, `/smart-money`, `/pipeline-ops`, and `/backtests`, with chips omitted or marked unavailable where no truth exists. |
| AC-14 | File boundary | Implementation remains within the allowed frontend-only writer set. | Code review and `git diff --name-only` evidence show no forbidden source, test, package, Prisma, route-registry, shared UI, backend, provider, or generated-file edits. |
| AC-15 | Placeholder honesty for optional future sections | If Signal Position Follow-Through, Calibration Evidence-Through Summary, or Measured Outcome Follow-Through appear, they must be below primary sections and placeholder-only. | UI smoke proves these optional sections, if present, are explicitly `Coming soon` with no counts, percentages, graphs, or inferred statuses. |

## Recommended Playwright Smoke Assertions

The dedicated smoke must live at:

- `frontend/tests/ui/daily-overview-dashboard.spec.ts`

Required assertions:

- `page.goto('/')` renders a dashboard body and does not render the old launch-card grid as the primary surface.
- First viewport contains `Daily Overview`, active scope, research-support disclaimer, refresh action, `Market Pulse`, and `High-Priority Review Candidates`.
- First viewport does not contain first-identity sections named `Data Trust and Pipeline Health`, `Signal and Evidence Health`, or `Drilldown Strip`.
- First viewport visual order on desktop prioritizes `Market Pulse` and `High-Priority Review Candidates` before caveats/navigation.
- `High-Priority Review Candidates` renders bullish review rows from `groups.longReview`, bearish review rows from `groups.shortReview`, and exit-risk rows from `groups.exitRiskReview`.
- Candidate rows show source-owned reason summaries, strategy/version context where available, and approved drill routes only.
- Candidate tab/segment switching does not leave stale rows or stale counts.
- `Watch And Blocked` renders watch-only, blocked, insufficient-data, and unproven reasons or domain-specific empty states.
- `Coming soon - Market Movers` renders with required missing-source explanation and no rows/counts/charts.
- `Coming soon - FII/DII Activity` renders with required missing-source explanation and no guessed values or Smart Money wording presented as FII/DII.
- `Evidence Caveats` remains compact, secondary, and links to owner pages rather than becoming the page identity.
- Section-local API failures show `Limited` or `Unavailable` without blanking the whole page.
- Scope change refetches approved reads and visibly changes content or limited-state wording.
- Refresh button reissues approved reads only.
- Network interception fails the test on any call outside the approved GET read set.
- Page text excludes prohibited advice/target/reward-risk/execution wording.

Recommended scenario set:

1. happy-path mixed evidence with bullish, bearish, and exit-risk candidates;
2. Today Review blocked while Research and Market Context are available;
3. no candidates for the active scope;
4. Market Context present but region-level only;
5. DQ or pipeline caveat visible while candidate counts are non-zero;
6. Market Movers and FII/DII placeholders only;
7. supporting source failure;
8. scope change and refresh refetch.

## Forbidden Language Guard

Reject if `/`, tooltips, labels, placeholder text, test mocks, or CTA copy include:

- `buy now`
- `sell now`
- `must buy`
- `must sell`
- `target price`
- `price target`
- `profit target`
- `reward/risk`
- `R:R`
- `best trade`
- `high conviction trade`
- `place order`
- `execute order`
- `broker`
- `guaranteed`
- `guaranteed return`
- `financial advice`

The standalone words `buy` and `sell` should not appear as user-facing recommendation labels. If existing source text contains these terms, implementation must map display language to `bullish review`, `bearish review`, `exit-risk review`, or similarly safe research-support wording.

Suggested scan after implementation:

```powershell
rg -n "buy now|sell now|must buy|must sell|target price|price target|profit target|reward/risk|R:R|best trade|high conviction trade|place order|execute order|broker|guaranteed|guaranteed return|financial advice" frontend/src/app/HomePage.tsx frontend/src/features/daily-overview-dashboard frontend/tests/ui/daily-overview-dashboard.spec.ts
```

## Required Validation Commands After Implementation

Check laptop memory before build or UI smoke per root performance rules.

Required frontend build:

```powershell
cd frontend
npm.cmd run build
```

Required focused UI smoke:

```powershell
cd frontend
npm.cmd run test:ui -- daily-overview-dashboard.spec.ts --workers=1
```

Recommended regression cluster if Team 00 requests broader evidence:

```powershell
cd frontend
npm.cmd run test:ui -- daily-overview-dashboard.spec.ts today-trade-review.spec.ts research-hub.spec.ts market-context-intelligence.spec.ts data-quality-engine.spec.ts pipeline-ops.spec.ts signal-generation-engine.spec.ts --workers=1
```

No backend build, Prisma command, migration command, or provider/live validation is required for the approved frontend-only slice. If backend scope is introduced, QA must stop and return the packet to Team 00 / Team 03.

## Exact Reject Conditions

Reject the implementation handoff immediately if any of the following occur:

- edits outside the allowed writer set;
- backend adapter, backend route, route-registry, shared UI, shared hook, package, Prisma/schema/migration/generated, provider/live, startup/backfill/scheduler/worker/queue, or pipeline command scope appears;
- `/` remains primarily a launch-card page;
- first viewport reads as a data-quality, pipeline, signal-health, or module-monitoring console;
- Market Movers shows anything other than an honest placeholder without an approved truthful market-wide movers source;
- FII/DII Activity shows anything other than an honest placeholder without an approved truthful institutional-flow source;
- Smart Money is relabeled as FII/DII;
- watchlist or signal-row sorting is relabeled as market-wide movers;
- Research Hub actionability dimensions become the primary Market Pulse authority over Today Review / review-readiness truth;
- fake global confidence, fake freshness, fake progress, fake generated timestamp, fake placeholder rows, or zero-filled charts are introduced;
- advice, target, reward/risk, broker, execution, or guaranteed-return wording appears;
- section failure blanks the full page;
- scope/refetch behavior cannot be proven without changing shared market-scope code.

## Evidence Required From Future Developer Handoff

- exact files changed and inspected;
- section-to-source mapping used;
- API calls made and explicitly skipped;
- confirmation that Market Movers and FII/DII stayed placeholder-only;
- confirmation that no provider/live/pipeline command triggers were added;
- build output for `npm.cmd run build`;
- UI smoke output for `daily-overview-dashboard.spec.ts`;
- forbidden-language scan output;
- screenshot or Playwright trace proving first-viewport hierarchy;
- skipped checks with reasons;
- known limitations and follow-up blockers.

## Tests Run In This QA Planning Pass

- none

## Tests Skipped In This QA Planning Pass

- `cd frontend; npm.cmd run build`
- `cd frontend; npm.cmd run test:ui -- daily-overview-dashboard.spec.ts --workers=1`

Skipped because this was a docs-only QA planning pass and no implementation handoff exists yet.

## Blockers

No Team 04 planning blocker remains.

Executable QA blockers:

- Team 00 has not yet promoted the refreshed packet to Ready.
- Team 00 has not yet reserved the allowed writer set for a single implementation pass.
- `frontend/tests/ui/daily-overview-dashboard.spec.ts` does not exist yet and must be created in the implementation pass.

## Next Team 00 Action

Re-confirm Ready only if the packet remains a frontend-only Slice 1, copy the exact allowed/forbidden file sets into the Ready record, reserve `frontend/src/app/HomePage.tsx` and the feature-local dashboard files for one writer, and instruct the implementer to preserve Market Movers and FII/DII as placeholder-only surfaces.
