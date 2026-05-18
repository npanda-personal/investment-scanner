# CF-W1-CAL-01 Signal Calibration Reliability Drift Contract

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Backend-only Signal Calibration reliability-drift contract prepared. Not Ready for Implementation.

## Contract Intent

Signal Calibration must distinguish reliable calibration, limited calibration, diagnostic-only calibration, and unavailable calibration so downstream consumers do not treat weak evidence as authoritative.

Calibration remains a research-support surface. It must not look like direct advice.

## Ownership

`signal-calibration-engine` owns this behavior.

Upstream dependencies:

- Signal Quality Lab provides historical evidence diagnostics.
- Data Quality Engine provides readiness, coverage, liquidity, and eligibility inputs.

Neither upstream module should own calibration trust-state policy.

## Required Source Boundary

Implementation must stay inside `signal-calibration-engine` service/types/docs/tests and may consume existing public outputs from Signal Quality Lab and Data Quality Engine only.

Forbidden:

- SQLAB source edits;
- DQE source or export edits;
- repository/schema/route/controller/frontend/package/generated/provider scope;
- score-formula rewrites outside trust-state gating.

## Required Trust-State Metadata

Add additive metadata equivalent to:

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

interface CalibrationTrustStateDto {
  state: CalibrationTrustState;
  reasonCode: CalibrationTrustReasonCode;
  reason: string;
}
```

The exact type name may differ, but the semantics must stay stable.

## Required Mapping Rules

- `TRUSTED` requires sufficient selected-horizon evidence, successful DQ alignment, and no blocking DQ status.
- `LIMITED` means low-sample or partial-context evidence exists, and downstream influence remains limited.
- `DIAGNOSTIC_ONLY` means historical evidence exists but DQ alignment is missing; calibration must remain research-only and must not expose normal downstream influence.
- `UNAVAILABLE` means selected-horizon evidence is missing, raw score is unavailable, or DQ evidence is blocking.

## DQ Blocker Rules

The first bounded slice must fail closed for obvious existing DQ blockers inside calibration trust-state handling:

- `eligibleForCalibration = false`
- `eligibleForSignals = false`
- `signalReadinessStatus = NOT_READY`
- `coverageStatus = UNUSABLE`
- `liquidityStatus = ILLIQUID`

These may continue to contribute penalties, but they must also prevent normal downstream influence.

## Additive Compatibility Rule

- Keep current calibration score math and persisted-row shape unchanged.
- Existing `calibrationReadiness`, `downstreamInfluence`, `authoritativeScore`, `calibrationEvidence`, and warning fields remain backward-compatible.
- The new trust-state metadata is additive and must not require schema, repository, route, or query changes.

## Dependency Rule

- `CF-W1-SQLAB-01` is not a blocking prerequisite. Calibration may initially derive trust-state from existing SQLAB summary fields.
- `CF-W1-DQ-02` is not a blocking prerequisite. Calibration may initially rely on current DQ evaluation statuses, then adopt session-aware currentness later without widening this slice.

## Test Contract

Focused backend tests must prove:

- trusted calibration with strong evidence and DQ alignment;
- limited calibration with low-sample or context-gap evidence;
- diagnostic-only calibration with missing DQ alignment;
- unavailable calibration with zero selected-horizon evidence;
- unavailable calibration with blocking DQ evidence;
- additive compatibility of existing readiness/evidence fields.
