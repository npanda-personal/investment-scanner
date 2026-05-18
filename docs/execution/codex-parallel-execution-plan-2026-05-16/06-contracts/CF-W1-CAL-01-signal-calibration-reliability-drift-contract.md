# CF-W1-CAL-01 Signal Calibration Reliability Drift Contract

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Contract refreshed from current source and requirement evidence.

Ready recommendation: `Ready candidate` for Team 04 QA handoff and Team 00 sequencing, not self-promoted for implementation.

## Contract Intent

Signal Calibration must not let weak or missing evidence look more authoritative than it is. Calibration stays a research-support surface and must distinguish:

- trusted calibration;
- limited calibration;
- diagnostic-only calibration;
- unavailable calibration.

The first child must tighten trust semantics without changing score math, persistence shape, route wiring, or upstream ownership.

## Ownership

`signal-calibration-engine` owns this behavior.

Read-only public dependencies:

- Signal Quality Lab summary diagnostics
- Data Quality Engine latest evaluation fields
- Historical Context lookup gaps already exposed through current calibration context

None of those upstream modules should own calibration trust-state policy for this slice.

## Exact Implementation Boundary

Allowed writer set:

- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`
- optional only if payload assertions are widened: `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.routes.test.ts`

Forbidden:

- `backend/src/modules/signal-calibration-engine/index.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.repository.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.controller.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.router.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.validation.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.module.ts`
- all SQLAB, DQE, and Historical Context source files
- Prisma, migrations, route registries, shared utilities, shared UI, packages, generated files, frontend files

## Required Additive DTO Contract

Keep the existing readiness object and add trust-state metadata inside it.

Preferred additive shape:

```ts
type CalibrationTrustState =
  | 'TRUSTED'
  | 'LIMITED'
  | 'DIAGNOSTIC_ONLY'
  | 'UNAVAILABLE';

type CalibrationTrustReasonCode =
  | 'TRUSTED_EVIDENCE_BACKED'
  | 'LIMITED_LOW_SAMPLE_OR_CONTEXT_GAPS'
  | 'DIAGNOSTIC_MISSING_DQ_ALIGNMENT'
  | 'UNAVAILABLE_NO_SELECTED_HORIZON_EVIDENCE'
  | 'UNAVAILABLE_BLOCKING_DQ_STATUS';

interface CalibrationReadiness {
  status: 'USABLE' | 'LIMITED' | 'UNAVAILABLE';
  downstreamInfluence: 'NORMAL' | 'LIMITED' | 'NONE';
  authoritativeScore: 'CALIBRATED_SCORE' | 'RAW_SCORE' | 'NO_SCORE';
  trustState: CalibrationTrustState;
  trustReasonCode: CalibrationTrustReasonCode;
  trustReason: string;
}
```

Exact type aliases may differ, but the semantics and field placement must remain stable.

## Required Mapping Rules

- `TRUSTED`
  - requires sufficient selected-horizon evidence;
  - requires DQ evaluation to be present;
  - requires no blocking DQ state;
  - keeps downstream influence `NORMAL`.

- `LIMITED`
  - evidence exists;
  - low-sample or non-blocking context gaps remain;
  - downstream influence stays `LIMITED`.

- `DIAGNOSTIC_ONLY`
  - historical evidence exists;
  - DQ alignment is missing;
  - downstream influence must not be `NORMAL`;
  - output is for cautionary review only.

- `UNAVAILABLE`
  - selected-horizon evidence is absent, or raw score is absent, or DQ evidence is blocking;
  - downstream influence is `NONE`;
  - raw score remains authoritative only when raw score exists and the existing compatibility contract requires it.

## Required DQ Fail-Closed Rules

The first bounded slice must treat the following current DQE fields as trust blockers rather than score penalties only:

- `eligibleForCalibration = false`
- `eligibleForSignals = false`
- `signalReadinessStatus = NOT_READY`
- `coverageStatus = UNUSABLE`
- `liquidityStatus = ILLIQUID`

Missing latest DQ evaluation must not be trusted. It should map to diagnostic-only semantics, not normal influence.

## Compatibility Rules

- Preserve existing score math.
- Preserve existing persisted row shape.
- Preserve existing `calibrationReadiness.status`, `downstreamInfluence`, `authoritativeScore`, `calibrationEvidence`, `warnings`, and score fields.
- New trust-state metadata must be additive only.
- No schema, repository, controller, router, or validation changes are allowed for the first slice.

## Dependency Rules

- `CF-W1-HCTX-01` and `CF-W1-MCTX-01` contract prep is already sufficient for this bounded calibration slice; no new context contract is needed here.
- `CF-W1-SQLAB-01` is a wording-alignment dependency only, not a blocker.
- `CF-W1-DQ-02` is a future evidence-improvement dependency only, not a blocker.

## Test Contract

Focused backend tests must prove:

- trusted calibration with strong evidence and clean DQ;
- limited calibration with low-sample or context-gap evidence;
- diagnostic-only calibration when DQ evaluation is missing;
- unavailable calibration with zero selected-horizon evidence;
- unavailable calibration with blocking DQ evidence;
- additive compatibility of existing readiness/evidence/score fields.

## Split / Blocker Result

- Split required: `No`
- Blocked: `No`
- Current Team 03 recommendation: `Ready candidate`
