# TEAM-03 CF-W2-DOV-02 Architecture Outbox

Date: 2026-05-26

Team: Team 03 - Architecture Factory

Mode: docs-only architecture readiness in shared workspace

## Verdict

`SPLIT REQUIRED`

This is not a consent blocker.

Reasons:

- the bounded child itself stays frontend-only and additive to Daily Overview;
- the currently inspected shared base does not contain the accepted `CF-W2-DOV-01` dashboard feature files;
- the currently inspected shared base also does not expose the accepted `CF-W2-CAL-02A` evidence-basis fields in the calibration frontend contract;
- implementing from this base would silently widen scope into DOV-01 shell work or re-invent calibration truth.

## Assignment

Prepare docs-only architecture readiness for `CF-W2-DOV-02` Daily Overview calibration evidence-through summary.

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-DOV-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-DOV-02-daily-overview-calibration-evidence-summary-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W2-DOV-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/next-contracts-to-prepare.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W2-DOV-02-architecture-outbox.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-03-current-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-DOV-02-daily-overview-calibration-evidence-through-summary-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-DOV-01-daily-overview-interactive-market-dashboard-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-DOV-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-DOV-01-daily-overview-dashboard-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W2-DOV-01-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-CAL-02-signal-calibration-evidence-basis-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W2-CAL-02A-ready-promotion.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/active-work-board.md`
- `frontend/src/app/HomePage.tsx`
- `frontend/src/features/signal-calibration-engine/types.ts`
- `frontend/src/features/signal-calibration-engine/api/signalCalibrationEngineService.ts`
- `frontend/src/features/signal-calibration-engine/hooks/useSignalCalibrationEngine.ts`
- `frontend/src/features/signal-calibration-engine/components/SignalCalibrationEnginePage.tsx`
- `frontend/tests/ui/signal-calibration-engine.spec.ts`
- repo searches for:
  - `daily-overview-dashboard`
  - `Calibration Evidence-Through Summary`
  - `latestMeasurablePriceDate`
  - `nextEvaluableDate`
  - `fetchCalibrationHealth`

Missing expected file:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W2-CAL-02A-implementation-evidence.md`

## Architecture Decision

Chosen:

- keep DOV-02 as a frontend-only consumer child;
- keep it inside the accepted `daily-overview-dashboard` feature only;
- drive the section from accepted `CF-W2-CAL-02A` scoped page-summary truth only;
- add one feature-local calibration summary panel below primary candidate-review content.

Rejected:

- reopening `HomePage.tsx` shell work from this child
- any signal-calibration-engine source/test changes
- module-health fallback
- first-row proxy logic
- backend adapter or route widening

## Exact Future File Reservation

Open implementation only on a base that already includes accepted `CF-W2-DOV-01` and accepted `CF-W2-CAL-02A`.

Allowed writer set:

- `frontend/src/features/daily-overview-dashboard/types.ts`
- `frontend/src/features/daily-overview-dashboard/api/dailyOverviewDashboardApi.ts`
- `frontend/src/features/daily-overview-dashboard/hooks/useDailyOverviewDashboard.ts`
- `frontend/src/features/daily-overview-dashboard/components/DailyOverviewDashboardPage.tsx`
- `frontend/src/features/daily-overview-dashboard/components/CalibrationEvidenceSummaryPanel.tsx`
- `frontend/tests/ui/daily-overview-dashboard.spec.ts`

Optional only if the accepted parent currently uses a feature-local placeholder component for this section:

- `frontend/src/features/daily-overview-dashboard/components/ComingSoonPanel.tsx`

Forbidden writer scope:

- `frontend/src/app/HomePage.tsx`
- all `frontend/src/features/signal-calibration-engine/**`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- all `frontend/src/shared/**`
- all `frontend/src/contexts/**`
- all `backend/src/**`
- all `backend/tests/**`
- Prisma/schema/migrations/generated files
- package manifests and lockfiles
- provider/live/startup/backfill/scheduler/worker/queue files
- route registries

## QA Handoff Notes

Team 04 should verify:

- visible scope and horizon labels are correct
- evidence-through date is distinct from calibration row generation time
- waiting state appears only for horizon-limited maturity
- unavailable state stays explicit when evidence basis is missing
- section-local failure does not trigger module-health fallback
- no first-row proxy is used anywhere
- placeholder truthfulness is preserved if dependencies are missing on the chosen base
- no target/reward/risk/Trade Plan-first wording appears

Required future validation after Team 00 promotion:

```text
cd frontend
npm.cmd run build
npm.cmd run test:ui -- daily-overview-dashboard.spec.ts --workers=1
```

No tests, builds, servers, Prisma commands, or application code were run by Team 03 in this docs-only pass.

## Risks

- execution docs show accepted DOV-01 and CAL-02A branches, but the inspected shared base still lacks their source changes
- future implementers may try to shortcut with `signals/calibration/health`
- the local horizon default must stay visibly labeled to avoid overclaiming

## Next Gate

1. Team 04 QA planning for the bounded child.
2. Team 00 verification that the implementation base already includes accepted `CF-W2-DOV-01` and accepted `CF-W2-CAL-02A`.
3. Only then may Team 00 promote DOV-02 for implementation.
