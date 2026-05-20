# CF-W1-CAL-01A Work Packet

Date: 2026-05-19

## Work Item

Signal Calibration DQ readiness gate as a bounded trust-state child.

## State

Docs-only architecture packet completed.

Recommendation: `Ready candidate` for Team 04 QA planning and Team 00 sequencing. Team 03 does not self-promote to implementation.

2026-05-19 Team 03 revalidation: `READY-CANDIDATE` is still supported. Current `dev` lacks explicit DQ gate semantics, while accepted parked parent `fd3d464` already carries the parent trust-state metadata. Team 00 must sequence this after active gates and before any Team 06 implementation handoff.

2026-05-20 rolling-cycle refresh: `CF-W1-BT-03` is already architecture-ready and QA-plan ready but remains under Team 00 sequencing control. That leaves `CF-W1-CAL-01A` as the highest current independent fallback packet in the direct-value stack. File reservations, parked-parent base `fd3d464`, and backend-only scope remain unchanged.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 06 Strategy / Signals / Risk
- Lane: Lane 2
- Module: `signal-calibration-engine`

## Sequencing Instruction

Accepted parked parent:

- parent item: `CF-W1-CAL-01`
- parent branch: `codex/team06-strategy-signal/CF-W1-CAL-01`
- parent commit: `fd3d464`

Preferred future implementation path:

- new branch: `codex/team06-strategy-signal/CF-W1-CAL-01A`
- base commit: `fd3d464`
- new worktree: `../investment-scanner-worktrees/team06-CF-W1-CAL-01A`

Fallback only if Team 00 explicitly authorizes it:

- one combined calibration pass from current `dev` that carries both the parent additive trust-state fields and this child DQ gate logic together inside the same reserved writer set

Do not run this child in parallel with any other writer on the same calibration files.

Preferred sequencing rationale: the parked parent already added `trustState`, `trustReasonCode`, and `trustReason`; the child should add explicit `dqGateState` behavior and focused tests, not reopen parent trust-state design.

## Exact File Reservations

Reserved writer set for the first implementation pass:

- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`

## Exact Forbidden Files

All other files are forbidden for this child, especially:

- `backend/src/modules/signal-calibration-engine/index.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.repository.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.controller.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.router.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.validation.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.module.ts`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.routes.test.ts`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.repository.test.ts`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.validation.test.ts`
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

## Required Behavior

Future implementation must:

- keep the child fully inside the reserved calibration files
- preserve current score math and current persisted-row compatibility
- extend `calibrationReadiness` with additive trust-state semantics
- expose a stable four-way trust outcome:
  - `TRUSTED`
  - `LIMITED`
  - `DIAGNOSTIC_ONLY`
  - `UNAVAILABLE`
- expose an explicit DQ gate classification:
  - `PASS`
  - `MISSING`
  - `BLOCKED`
- preserve the accepted parent trust-state fields already present on `fd3d464`
- fail closed for these explicit DQ blockers:
  - `eligibleForCalibration = false`
  - `eligibleForSignals = false`
  - `signalReadinessStatus = NOT_READY`
  - `coverageStatus = UNUSABLE`
  - `liquidityStatus = ILLIQUID`
- treat missing latest DQ evaluation as diagnostic-only or unavailable, never as trusted or normal downstream influence
- preserve research-support wording

## Required Preserved Behavior

Future implementation must not change:

- current score calculation math
- current persisted-row schema or repository mapping
- current route wiring
- current controller behavior
- current batch behavior
- current public response fields outside additive readiness metadata

## QA Focus

Team 04 should verify:

- trusted outcome with sufficient evidence and present clean DQ
- limited outcome with low-sample evidence
- limited outcome with non-blocking context gaps
- diagnostic-only outcome when DQ evaluation is missing
- unavailable outcome when selected horizon has no evaluated evidence
- unavailable outcome for each explicit DQ blocker
- no score-math drift
- no file-scope expansion beyond the reserved writer set

Focused validation guidance after Team 00 promotion and implementation handoff:

```powershell
cd backend
npm.cmd test -- signal-calibration-engine.service.test.ts --runInBand
npm.cmd run build
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- Prisma or schema work
- repository, controller, router, validation, or index edits
- route-registry or broader API migration
- shared utility or shared UI work
- package or generated-file changes
- provider/live-market/startup/backfill changes
- upstream module source edits in SQLAB, DQE, Historical Context, Trade Plan, or Lane 3 modules

## Next Gate

Team 04 QA planning against this packet, then Team 00 Ready evaluation and sequencing on the parked `CF-W1-CAL-01` parent file set.
