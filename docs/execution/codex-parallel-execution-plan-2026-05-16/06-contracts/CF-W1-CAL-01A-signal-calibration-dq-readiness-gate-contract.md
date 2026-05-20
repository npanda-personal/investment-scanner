# CF-W1-CAL-01A Signal Calibration DQ Readiness Gate Contract

Date: 2026-05-19

Owner: Team 03 Architecture Factory

## Status

Contract prepared from current `dev` source, parent `CF-W1-CAL-01` packet, and current Ready-queue state.

Recommendation: `Ready candidate` for Team 04 QA planning and Team 00 sequencing, not self-promoted for implementation.

2026-05-19 Team 03 revalidation: contract remains `READY-CANDIDATE` after read-only inspection of current `dev`, open decisions, ready queue state, and accepted parked parent commit `fd3d464`. Team 00 still owns sequencing and Ready promotion.

2026-05-20 rolling-cycle refresh: latest Team 02 ranking still places `CF-W1-CAL-01A` immediately behind `CF-W1-BT-03`, and `BT-03` is already sequence-controlled with Team 04 QA planning complete. This contract therefore remains the next independent Lane 2 architecture packet Team 00 can route once it wants the calibration trust gap to move forward, with no boundary changes from the 2026-05-19 version.

## Contract Intent

Signal Calibration must not let blocking or missing Data Quality evidence look like normal downstream calibration trust.

This child keeps calibration visible for research inspection while making the DQ trust outcome explicit:

- `TRUSTED`
- `LIMITED`
- `DIAGNOSTIC_ONLY`
- `UNAVAILABLE`

The child must do this without rewriting score math, widening into routes or Prisma, or moving logic into upstream modules.

## Ownership

`signal-calibration-engine` owns this behavior.

Read-only dependencies only:

- Signal Quality Lab summary diagnostics
- Data Quality Engine latest evaluation fields
- Historical Context lookup gaps already consumed by calibration

No upstream module may take ownership of this trust-state policy for this slice.

## Sequencing Dependency

Accepted parked parent:

- `CF-W1-CAL-01`
- parked branch: `codex/team06-strategy-signal/CF-W1-CAL-01`
- parked commit: `fd3d464`

The child uses the same writer set. Team 00 must either:

1. stack `CF-W1-CAL-01A` on `fd3d464`; or
2. authorize one combined calibration pass from `dev` that carries both the parent trust-state additive fields and this child DQ gate behavior together.

This child is not parallel-safe with any other writer on the same calibration files.

Revalidation note: `fd3d464` already contains the parent trust-state DTO and service behavior. `CF-W1-CAL-01A` should add the missing explicit `dqGateState` semantics and DQ blocker assertions on top of that parent, unless Team 00 records an explicit combined-pass exception.

## Exact Implementation Boundary

Allowed writer set:

- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`

Forbidden:

- `backend/src/modules/signal-calibration-engine/index.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.repository.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.controller.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.router.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.validation.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.module.ts`
- all other calibration tests
- all `signal-quality-lab`, `data-quality-engine`, `historical-context-snapshots`, and `trade-plan-risk-engine` source/tests
- Prisma, migrations, generated files, route registries, shared utilities, shared UI, package manifests, frontend files, provider/live/startup scope

If implementation needs any forbidden file, the child is out of scope and must return to Team 00 as blocked or split.

## Required Additive DTO Contract

Keep the existing readiness object and extend it in place.

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

Exact names may vary, but the contract requires those semantics and placement inside `calibrationReadiness`.

Compatibility with parked parent: the parent already uses `trustState`, `trustReasonCode`, and `trustReason`. This child must preserve those parent fields and add DQ gate semantics without removing, renaming, or weakening the accepted parent trust-state fields.

## Required Trust-State Mapping Rules

### `TRUSTED`

- selected-horizon evidence is sufficient
- raw score exists
- latest DQ evaluation exists
- no explicit DQ blocker is present
- `downstreamInfluence = NORMAL`
- `authoritativeScore = CALIBRATED_SCORE`
- `dqGateState = PASS`

### `LIMITED`

- evidence exists
- raw score exists
- latest DQ evaluation exists
- no explicit DQ blocker is present
- low sample or non-blocking context gaps remain
- `downstreamInfluence = LIMITED`
- `dqGateState = PASS`

### `DIAGNOSTIC_ONLY`

- latest DQ evaluation is missing
- raw score exists
- evidence is otherwise inspectable
- the output may still show computed calibration fields for inspection
- `downstreamInfluence` must not be `NORMAL`
- `authoritativeScore = RAW_SCORE`
- `dqGateState = MISSING`

### `UNAVAILABLE`

- raw score is missing, or
- selected-horizon evidence is absent, or
- DQ is explicitly blocking

Required semantics:

- `downstreamInfluence = NONE`
- `authoritativeScore = RAW_SCORE` when raw score exists
- `authoritativeScore = NO_SCORE` when raw score does not exist
- `dqGateState = BLOCKED` when the cause is a DQ blocker

## Required DQ Fail-Closed Rules

These current DQE fields must map to an explicit blocked trust outcome, not a penalty-only outcome:

- `eligibleForCalibration = false`
- `eligibleForSignals = false`
- `signalReadinessStatus = NOT_READY`
- `coverageStatus = UNUSABLE`
- `liquidityStatus = ILLIQUID`

Each blocker must:

- suppress normal downstream influence
- prevent `TRUSTED`
- prevent `LIMITED`
- set `trustState = UNAVAILABLE`
- set `dqGateState = BLOCKED`
- add a stable blocker reason

Missing latest DQ evaluation must never produce `TRUSTED` or normal downstream influence.

`dqGateState` is mandatory for this child:

- `PASS` when a latest DQ evaluation exists and none of the explicit blockers is present.
- `MISSING` when latest DQ evaluation is absent and calibration remains inspection-only.
- `BLOCKED` when any explicit DQ blocker is present.

## Compatibility Rules

- Preserve current score math.
- Preserve current persisted-row shape.
- Preserve current top-level response fields.
- Preserve existing `calibrationReadiness.status`, `downstreamInfluence`, `authoritativeScore`, `calibrationEvidence`, `reasons`, `blockers`, warnings, and score-bearing fields.
- New DQ gate and trust-state fields must be additive only.
- Do not widen into route payload restructuring, repository mapping changes, or controller/router behavior changes.

## Explicit Non-Goals

- No Prisma or schema change
- No migration or generated-file change
- No repository/controller/router/validation change
- No `signal-quality-lab` source change
- No `data-quality-engine` source change
- No `historical-context-snapshots` source change
- No `trade-plan-risk-engine` source change
- No frontend or shared UI change
- No provider/live-market/startup/backfill work
- No broader API migration

## Test Contract

Focused backend service tests must prove:

- trusted outcome with sufficient evidence and present clean DQ
- limited outcome with low-sample evidence
- limited outcome with context gaps but non-blocking DQ
- diagnostic-only outcome when latest DQ evaluation is missing
- unavailable outcome when selected horizon has no evaluated evidence
- unavailable outcome for each explicit DQ blocker:
  - `eligibleForCalibration = false`
  - `eligibleForSignals = false`
  - `NOT_READY`
  - `UNUSABLE`
  - `ILLIQUID`
- preservation of current score math and compatibility fields

## Split / Blocked Result

- Split required: `No`
- Blocked: `No` for the bounded child itself
- Escalate to blocked if implementation needs forbidden files or broader API behavior changes
