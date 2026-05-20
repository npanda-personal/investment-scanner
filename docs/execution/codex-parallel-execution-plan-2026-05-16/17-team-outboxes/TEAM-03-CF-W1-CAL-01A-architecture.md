# TEAM-03 CF-W1-CAL-01A Architecture

Date: 2026-05-19

Team: Team 03 - Architecture Factory

Work item: `CF-W1-CAL-01A` signal calibration DQ readiness gate

Status: ACCEPT / READY-CANDIDATE

2026-05-19 revalidation status: ACCEPT / READY-CANDIDATE remains supported. Team 03 does not promote this item to Ready; Team 00 must sequence it after active gates and stack it on parked `CF-W1-CAL-01` unless Team 00 records a combined-pass exception.

2026-05-20 rolling-cycle refresh: `CF-W1-BT-03` is already architecture-ready and QA-ready, but still waiting on Team 00 one-writer backtesting sequencing. Based on the latest Team 02 queue correction, `CF-W1-CAL-01A` is now the highest current independent fallback candidate for Team 00 routing. No file-boundary or dependency change was found in this refresh.

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-CAL-01A-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-CAL-01A-signal-calibration-dq-readiness-gate-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-CAL-01A-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-CAL-01A-architecture.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-CAL-01A-signal-calibration-dq-readiness-gate-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-CAL-01-signal-calibration-reliability-drift-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-CAL-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-CAL-01-signal-calibration-reliability-drift-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-CAL-01-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-CAL-01-qa-plan.md`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`

## Exact Evidence

- Current `dev` still treats blocking DQ statuses as penalty inputs and missing DQ as a data gap. It does not yet expose a first-class trust-state split for DQ-blocked versus DQ-missing calibration.
- Current calibration types already expose `calibrationReadiness`, `downstreamInfluence`, `authoritativeScore`, and DQ evaluation fields, so the child can stay additive and module-local.
- Existing service tests already cover penalty and missing-DQ behavior, so the child can be validated with service-local assertions rather than route, Prisma, or frontend changes.
- `ready-for-implementation.md` shows accepted parked parent `CF-W1-CAL-01` commit `fd3d464` is not yet merged into current `dev`. The child therefore shares the same writer set and must stack on that parent or fold the parent additive fields into one combined pass.
- Read-only parked-parent inspection confirms `fd3d464` already added parent `trustState`, `trustReasonCode`, and `trustReason` behavior in the same four calibration files. `CF-W1-CAL-01A` should add explicit `dqGateState` semantics and DQ blocker assertions on top of that baseline.

## Exact Future File Reservations

- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`

## Exact Forbidden Files

- `backend/src/modules/signal-calibration-engine/index.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.repository.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.controller.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.router.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.validation.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.module.ts`
- all other calibration tests
- all `backend/src/modules/signal-quality-lab/**`
- all `backend/src/modules/data-quality-engine/**`
- all `backend/src/modules/historical-context-snapshots/**`
- all `backend/src/modules/trade-plan-risk-engine/**`
- all Lane 3 backend modules and tests
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- all frontend source and tests
- provider/live-data calls, startup/backfill changes, paid/cloud, telemetry, or broker scope

## Sequencing Result

Recommended future implementation sequence:

- base branch: `codex/team06-strategy-signal/CF-W1-CAL-01`
- base commit: `fd3d464`
- next branch: `codex/team06-strategy-signal/CF-W1-CAL-01A`
- next worktree: `../investment-scanner-worktrees/team06-CF-W1-CAL-01A`

Fallback only with Team 00 approval:

- one combined calibration pass from current `dev` that carries both the parent trust-state additive fields and this child DQ gate semantics together

Do not open a separate parallel writer on the same `signal-calibration-engine` file set.

Team 03 preference: stack on `fd3d464`. A combined pass from current `dev` remains possible only with Team 00's explicit sequencing decision because it would replay the parent trust-state work and widen review surface.

## QA Recommendation

Team 04 should keep the first child backend-only and service-local, with focus on:

- explicit `TRUSTED`, `LIMITED`, `DIAGNOSTIC_ONLY`, and `UNAVAILABLE` outcomes
- explicit DQ gate states for `PASS`, `MISSING`, and `BLOCKED`
- one test each for `eligibleForCalibration = false`, `eligibleForSignals = false`, `NOT_READY`, `UNUSABLE`, and `ILLIQUID`
- preservation of current score math and compatibility fields
- rejection of any expansion into Prisma, routes, shared utilities, frontend, package/generated files, provider/live calls, startup/backfill, or upstream module edits

No executable QA, build, or runtime checks were run in this docs-only pass.

## Next Gate

Team 04 QA planning, then Team 00 Ready evaluation and sequencing.

2026-05-20 Team 03 recommendation to Team 00: keep `BT-03` in sequencing control, but treat `CF-W1-CAL-01A` as the next isolated Lane 2 promotion candidate because it is already architecture-ready, QA-ready, backend-only, and does not share source files with the backtesting packet.
