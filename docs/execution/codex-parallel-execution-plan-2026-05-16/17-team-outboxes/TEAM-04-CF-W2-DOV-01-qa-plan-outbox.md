# TEAM-04 QA Outbox - CF-W2-DOV-01

Date: 2026-05-26

Team: Team 04 - QA Factory

Mode: Docs-only QA planning refresh in main workspace

## Work Item

`CF-W2-DOV-01` - Daily Overview investor/trader-first QA refresh for frontend `/`.

## Verdict

`QA-PLAN READY`

The refreshed QA plan is ready for Team 00 Ready evaluation. It validates the Product Owner reframe: Daily Overview must read as an investor/trader daily dashboard, not an admin/developer monitoring dashboard.

No executable QA was run and no application source was modified.

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-DOV-01-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W2-DOV-01-qa-plan-outbox.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-DOV-01-daily-overview-interactive-market-dashboard-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/05-ux/CF-W2-DOV-01-daily-overview-dashboard-ux-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-DOV-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-DOV-01-daily-overview-dashboard-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W2-DOV-01-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W2-DOV-01-architecture-outbox.md`
- existing `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-DOV-01-qa-plan.md`
- existing `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W2-DOV-01-qa-plan-outbox.md`

## Key QA Acceptance Checks

- First viewport must show an investor/trader dashboard: Header Rail, `Market Pulse`, `High-Priority Review Candidates`, `Coming soon - Market Movers`, `Coming soon - FII/DII Activity`, `Watch And Blocked`, and compact `Evidence Caveats`.
- First viewport must not read as `Data Trust and Pipeline Health`, `Signal and Evidence Health`, `Drilldown Strip`, pipeline monitor, module-health console, or legacy launch-card page.
- High-priority candidates must use Today Review `groups.longReview`, `groups.shortReview`, and `groups.exitRiskReview`; Research Hub can only provide source-labeled supporting context.
- Candidate language must stay research-support oriented and avoid advice, target, reward/risk, broker, execution, guaranteed-return, and fake-ranking wording.
- `Market Movers` must remain `Coming soon - Market Movers` unless a truthful scoped market-wide movers source is approved later.
- `FII/DII Activity` must remain `Coming soon - FII/DII Activity` unless a truthful local institutional-flow source is approved later.
- Watchlist daily-change sorting must not be relabeled as market-wide movers.
- Smart Money must not be relabeled as FII/DII.
- `Evidence Caveats` must stay compact, secondary, and link outward for detail.
- No fake generated timestamp, fake atomic snapshot, fake freshness, fake progress, fake confidence, fake counts, or zero-filled placeholder chart may appear.
- Network assertions must prove only approved public read APIs are called and no provider/live/pipeline command triggers run.

## Allowed Implementation Writer Set

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

## Forbidden Writer Scope

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

## Recommended Playwright Smoke Assertions

- `/` renders the Daily Overview dashboard, not the legacy launch-card grid.
- Desktop first viewport contains `Daily Overview`, current scope, research-support disclaimer, refresh action, `Market Pulse`, `High-Priority Review Candidates`, `Coming soon - Market Movers`, `Coming soon - FII/DII Activity`, `Watch And Blocked`, and compact `Evidence Caveats`.
- First viewport does not contain admin-first identity headings such as `Data Trust and Pipeline Health`, `Signal and Evidence Health`, or `Drilldown Strip`.
- Candidate lanes reconcile to Today Review `longReview`, `shortReview`, and `exitRiskReview` mocked payloads.
- Watch/blocked/insufficient/unproven states show reasons or domain-specific empty states.
- Market Movers placeholder has no fake rows, fake counts, watchlist relabeling, provider calls, or fake freshness.
- FII/DII placeholder has no guessed values, Smart Money relabeling, provider calls, or fake freshness.
- Evidence Caveats remains secondary and links to owner pages.
- Section-local source failures do not blank the full dashboard.
- Scope changes and refresh reissue approved reads only.
- Network interception fails on any call outside the approved GET read set.
- Text scan passes for no advice/target/reward-risk/execution/fake-confidence language.

## Required Commands After Implementation

```powershell
cd frontend
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run test:ui -- daily-overview-dashboard.spec.ts --workers=1
```

Recommended broader UI regression if Team 00 requests it:

```powershell
cd frontend
npm.cmd run test:ui -- daily-overview-dashboard.spec.ts today-trade-review.spec.ts research-hub.spec.ts market-context-intelligence.spec.ts data-quality-engine.spec.ts pipeline-ops.spec.ts signal-generation-engine.spec.ts --workers=1
```

## Tests Run

- none

## Tests Skipped

- `cd frontend; npm.cmd run build`
- `cd frontend; npm.cmd run test:ui -- daily-overview-dashboard.spec.ts --workers=1`

Skipped because this was a docs-only QA planning pass and no implementation handoff exists yet.

## Blockers

No Team 04 planning blocker remains.

Executable QA remains blocked until:

- Team 00 promotes the refreshed packet to Ready;
- Team 00 reserves the allowed writer set for one implementation pass;
- implementation creates `frontend/tests/ui/daily-overview-dashboard.spec.ts`.

## Next Team 00 Action

Re-confirm Ready for `CF-W2-DOV-01` only as a frontend-only Slice 1, copy the exact allowed/forbidden file sets into the Ready record, reserve `frontend/src/app/HomePage.tsx` plus the feature-local dashboard files for one writer, and keep Market Movers plus FII/DII as placeholder-only until new truthful source contracts are separately approved.
