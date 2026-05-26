# TEAM-04 QA Outbox - CF-W2-DOV-01

Date: 2026-05-26

## Work Item

`CF-W2-DOV-01` - Daily Overview dashboard for frontend `/`.

## Verdict

`QA-PLAN READY`

Team 04 completed the executable QA plan for the bounded Daily Overview dashboard packet. No executable QA was run. The packet is ready for Team 00 Ready evaluation only if implementation stays inside the exact frontend-only writer set and preserves the frontend-only slice defined by the architecture and contract docs.

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-DOV-01-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W2-DOV-01-qa-plan-outbox.md`

## Files Inspected

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

## Scope Summary

The QA plan is aligned to one bounded frontend-only Daily Overview slice that must deliver:

- replacement of the `/` launch-card surface with a dashboard-first first viewport
- approved read-only composition from Today Review, Research Overview, review-readiness, Market Context, Data Quality, latest signal run, and Pipeline Ops
- distinct sections for Daily Pulse, Review Candidate Summary, Market Environment and Confirmation, Signal and Evidence Health, Data Trust and Pipeline Health, and Drilldown Strip
- explicit `Coming soon` placeholders for:
  - Signal Position Follow-Through
  - Calibration Evidence-Through Summary
  - Measured Outcome Follow-Through
- scope-aware refetch and refresh behavior
- research-support wording with no advice, no target, and no reward/risk framing

Current source evidence supports the packet shape:

- `frontend/src/app/HomePage.tsx` is still the legacy launch-card page, so the implementation must make a structural `/` replacement
- Team 03 architecture and contract already constrain slice 1 to existing public read APIs and frontend-only files
- current source does not support truthful dashboard-wide calibration aggregate or measured outcome rollups, so placeholder honesty is a hard QA gate
- current Market Context truth is region-scoped, so QA requires explicit limitation wording when asset-type specificity is not proven

## Recommended Commands

Recommend, but do not run in this planning pass:

```powershell
cd frontend
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run test:ui -- daily-overview-dashboard.spec.ts --workers=1
```

```powershell
cd frontend
npm.cmd run test:ui -- daily-overview-dashboard.spec.ts today-trade-review.spec.ts research-hub.spec.ts market-context-intelligence.spec.ts data-quality-engine.spec.ts pipeline-ops.spec.ts signal-generation-engine.spec.ts --workers=1
```

Optional if Smart Money behavior becomes materially visible in the final slice:

```powershell
cd frontend
npm.cmd run test:ui -- daily-overview-dashboard.spec.ts today-trade-review.spec.ts research-hub.spec.ts market-context-intelligence.spec.ts data-quality-engine.spec.ts pipeline-ops.spec.ts signal-generation-engine.spec.ts smart-money-intelligence.spec.ts --workers=1
```

## Exact Reject Conditions

Reject the future implementation handoff if any of the following is true:

- scope widens outside:
  - `frontend/src/app/HomePage.tsx`
  - `frontend/src/features/daily-overview-dashboard/index.ts`
  - `frontend/src/features/daily-overview-dashboard/types.ts`
  - `frontend/src/features/daily-overview-dashboard/api/dailyOverviewDashboardApi.ts`
  - `frontend/src/features/daily-overview-dashboard/hooks/useDailyOverviewDashboard.ts`
  - `frontend/src/features/daily-overview-dashboard/components/**`
  - `frontend/tests/ui/daily-overview-dashboard.spec.ts`
- any backend, route-registry, shared UI, Prisma, package, generated, or provider/live/startup/backfill scope is touched
- `/` remains primarily a launch-card page with dashboard fragments added secondarily
- unapproved API fanout or a new backend adapter is introduced
- Daily Pulse authority comes from unstable Research Hub actionability dimensions instead of Today Review plus review-readiness truth
- calibration aggregate or measured outcome rollups are inferred instead of kept as `Coming soon`
- DQ/pipeline trust problems are visually hidden behind candidate counts
- the page introduces advice language, target semantics, reward/risk wording, broker/execution wording, or fake confidence scores

## Blockers

- No Team 04 planning blocker remains.
- Executable QA remains blocked until Team 00 promotes one exact implementation handoff.
- `frontend/src/app/HomePage.tsx` still requires explicit Team 00 shared-file reservation.
- The dedicated `frontend/tests/ui/daily-overview-dashboard.spec.ts` does not exist yet and must be part of the implementation handoff.

## Tests Run

- none

## Tests Skipped

- `npm.cmd run build` in `frontend`
- `npm.cmd run test:ui -- daily-overview-dashboard.spec.ts --workers=1`
- `npm.cmd run test:ui -- daily-overview-dashboard.spec.ts today-trade-review.spec.ts research-hub.spec.ts market-context-intelligence.spec.ts data-quality-engine.spec.ts pipeline-ops.spec.ts signal-generation-engine.spec.ts --workers=1`

## Skipped-Test Reason

- docs-only QA planning pass; no implementation handoff exists and the assignment explicitly restricted work to active execution docs only

## Next Gate For Team 00

- evaluate `CF-W2-DOV-01` for Ready promotion as one bounded frontend-only child
- copy the exact reserved writer set into the Ready record
- reserve one writer for `frontend/src/app/HomePage.tsx` and the feature-local dashboard files in a single pass
- keep the packet out of Ready if implementation requires backend scope, route-registry/shared UI/package/Prisma/generated widening, or tries to replace placeholders with inferred summaries

## Ready Recommendation

`READY FOR TEAM 00 PROMOTION` provided the packet remains frontend-only and preserves placeholder honesty.
