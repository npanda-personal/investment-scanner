# CF-W1-CAL-01A Architecture Review

Date: 2026-05-19

Owner: Team 03 Architecture Factory

## Status

Docs-only architecture prep completed for `CF-W1-CAL-01A`.

Ready recommendation: `Ready candidate` for Team 04 QA handoff and Team 00 sequencing, not self-promoted for implementation.

This slice stays backend-only and module-local inside `signal-calibration-engine`. It is not parallel-safe with the accepted parked `CF-W1-CAL-01` parent because both reserve the same calibration files.

2026-05-19 Team 03 revalidation: `READY-CANDIDATE` remains supported after rechecking current `dev`, the active queues, open decisions, and parked parent commit `fd3d464`. This is not a Ready-for-Implementation promotion; Team 00 must still sequence the writer set after active gates.

2026-05-20 rolling-cycle refresh: Team 03 rechecked the latest Team 02 queue correction, current Team 00 routing state, and the completed `CF-W1-BT-03` architecture/QA packet. `BT-03` is already architecture-ready and awaiting Team 00 one-writer sequencing, so `CF-W1-CAL-01A` now stands as the highest current independent fallback candidate for Team 00 routing. The bounded calibration writer set, parked-parent dependency, and backend-only scope remain unchanged.

## Evidence Inspected

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

## Current Source Findings

- Current `dev` still derives `calibrationReadiness` from raw-score availability and Signal Quality sample evidence. The service does not currently fail closed on explicit Data Quality Engine blocker fields.
- Current `persistedDataQualityAdjustment(...)` applies score penalties for `UNUSABLE`, `NOT_READY`, and `ILLIQUID`, but that logic does not by itself convert the result into a first-class trust outcome.
- Missing latest DQ evaluation is currently recorded as a data gap only. It is not yet separated as a diagnostic-only trust outcome.
- `signal-calibration-engine.types.ts` already exposes `calibrationReadiness`, `downstreamInfluence`, `authoritativeScore`, and the latest DQ evaluation fields, so additive trust-state fields can remain inside the module without repository, controller, router, Prisma, or route-registry changes.
- Existing service tests cover penalty behavior, missing DQ gap behavior, low-sample behavior, and unavailable selected-horizon behavior, but they do not yet prove the full four-way split between trusted, limited, diagnostic-only, and unavailable outcomes.
- `ready-for-implementation.md` records accepted parked `CF-W1-CAL-01` commit `fd3d464` as not yet merged to current `dev`. `CF-W1-CAL-01A` therefore must stack on that parent or fold its additive trust-state fields into one single writer pass.
- Parked `CF-W1-CAL-01` commit `fd3d464` already adds parent `CalibrationTrustState`, `CalibrationTrustReasonCode`, `trustState`, `trustReasonCode`, and `trustReason` fields in the same four-file calibration writer set. It does not add the explicit `dqGateState = PASS | MISSING | BLOCKED` contract required by this child.
- The next implementation should therefore be incremental on `fd3d464`: add explicit DQ gate classification and focused blocker coverage, not reimplement the parent trust-state slice from scratch.

## Module Boundary Decision

`signal-calibration-engine` owns this requirement.

Read-only public dependencies only:

- Signal Quality Lab summary diagnostics
- Data Quality Engine latest evaluation fields
- Historical Context lookup gaps already surfaced through current calibration context

This slice must not move ownership into `signal-quality-lab`, `data-quality-engine`, `historical-context-snapshots`, `trade-plan-risk-engine`, or Lane 3 modules.

## Architecture Decision

Keep the child entirely inside the existing calibration readiness surface.

Do not create:

- a new route
- a new top-level response packet
- a Prisma/schema change
- a shared utility
- a broader API migration

Instead, extend `calibrationReadiness` with additive trust-state semantics and an explicit DQ gate classification.

Recommended additive shape:

```ts
type CalibrationTrustState =
  | 'TRUSTED'
  | 'LIMITED'
  | 'DIAGNOSTIC_ONLY'
  | 'UNAVAILABLE';

type CalibrationTrustReasonCode =
  | 'TRUSTED_EVIDENCE_BACKED'
  | 'LIMITED_LOW_SAMPLE'
  | 'LIMITED_CONTEXT_GAPS'
  | 'DIAGNOSTIC_MISSING_DQ'
  | 'UNAVAILABLE_NO_SELECTED_HORIZON_EVIDENCE'
  | 'UNAVAILABLE_RAW_SCORE_MISSING'
  | 'UNAVAILABLE_BLOCKING_DQ';

type CalibrationDqGateState = 'PASS' | 'MISSING' | 'BLOCKED';

interface CalibrationReadiness {
  status: 'USABLE' | 'LIMITED' | 'UNAVAILABLE';
  downstreamInfluence: 'NORMAL' | 'LIMITED' | 'NONE';
  authoritativeScore: 'CALIBRATED_SCORE' | 'RAW_SCORE' | 'NO_SCORE';
  trustState: CalibrationTrustState;
  trustReasonCode: CalibrationTrustReasonCode;
  dqGateState: CalibrationDqGateState;
  reasons: string[];
  blockers: string[];
}
```

Exact field names may vary slightly in implementation, but the semantics above must remain stable.

## Required Trust Mapping

- `TRUSTED`
  - sufficient selected-horizon evidence
  - DQ evaluation present
  - no blocking DQ state
  - `downstreamInfluence = NORMAL`
  - `dqGateState = PASS`

- `LIMITED`
  - evidence exists
  - DQ evaluation present
  - no blocking DQ state
  - low-sample or context-gap conditions remain
  - `downstreamInfluence = LIMITED`
  - `dqGateState = PASS`

- `DIAGNOSTIC_ONLY`
  - DQ evaluation is missing
  - evidence is otherwise present enough to inspect
  - calibration output may still be visible for inspection
  - `downstreamInfluence` must not be `NORMAL`
  - `authoritativeScore = RAW_SCORE`
  - `dqGateState = MISSING`

- `UNAVAILABLE`
  - selected-horizon evidence is absent, or raw score is absent, or DQ is explicitly blocking
  - `downstreamInfluence = NONE`
  - `authoritativeScore = RAW_SCORE` when raw score exists, otherwise `NO_SCORE`
  - `dqGateState = BLOCKED` for explicit DQ blockers

## Required DQ Fail-Closed Mapping

The first child must treat the following as explicit trust blockers, not score penalties only:

- `eligibleForCalibration = false`
- `eligibleForSignals = false`
- `signalReadinessStatus = NOT_READY`
- `coverageStatus = UNUSABLE`
- `liquidityStatus = ILLIQUID`

Missing latest DQ evaluation must map to `DIAGNOSTIC_ONLY` or `UNAVAILABLE`, never to `TRUSTED` or normal downstream influence.

## Sequencing Decision

Sequencing dependency:

- accepted parked parent: `CF-W1-CAL-01`
- parent branch: `codex/team06-strategy-signal/CF-W1-CAL-01`
- parent commit: `fd3d464`

Team 00 must choose one of these paths before implementation:

1. stack `CF-W1-CAL-01A` on top of accepted parked commit `fd3d464`; or
2. authorize one combined `signal-calibration-engine` pass from current `dev` that carries both the parent trust-state additive fields and the `01A` DQ gate semantics together inside the same reserved files.

Do not run a separate parallel writer on the same calibration files.

Team 03 recommendation after revalidation: prefer path 1. Path 2 should be used only if Team 00 intentionally wants to replay parent `CF-W1-CAL-01` from current `dev`; it creates more merge/review surface than the parked-parent stack.

## Exact Future File Reservations

Future implementation must stay inside this exact writer set:

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
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.routes.test.ts`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.repository.test.ts`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.validation.test.ts`
- all `backend/src/modules/signal-quality-lab/**`
- all `backend/src/modules/data-quality-engine/**`
- all `backend/src/modules/historical-context-snapshots/**`
- all `backend/src/modules/trade-plan-risk-engine/**`
- all `backend/src/modules/portfolio-management/**`
- all `backend/src/modules/portfolio-intelligence/**`
- all `backend/src/modules/watchlist-management/**`
- all `backend/src/modules/alerts-monitoring/**`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- all frontend source and frontend tests
- provider/live-data calls, startup/backfill changes, paid/cloud, telemetry, or broker scope

## Blocker / Split Notes

- Split required: `No`, if Team 00 sequences the child on the parked parent or authorizes one combined module-local pass.
- Blocked: `No` for the bounded child itself.
- Convert this item to blocked if implementation discovers a need for:
  - Prisma or schema changes
  - route/controller/repository/validation edits
  - shared utilities
  - package or generated-file changes
  - provider/live calls
  - startup/backfill changes
  - broader API migration
  - cross-module source edits

## QA Planning Handoff Notes

Team 04 should keep QA service-local and backend-only:

- trusted calibration with clean DQ and sufficient evidence
- limited calibration with low sample or context gaps
- diagnostic-only calibration when DQ evaluation is missing
- unavailable calibration when selected-horizon evidence is absent
- unavailable calibration for each explicit DQ blocker
- preservation of current score math, current readiness fields, and current response compatibility

No frontend, route, Prisma, or provider validation belongs in this child.

## Ready Recommendation

`Ready candidate`

Reason:

- the slice can remain backend-only and module-local
- exact file reservations are narrow and explicit
- no Prisma, route, shared utility, frontend, package, generated, provider, or startup scope is required
- the only constraint is sequencing on the accepted parked parent file set
