# CF-W1-SQLAB-01 Signal Quality Outcome Confidence Contract

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Backend-only Signal Quality Lab outcome-confidence contract prepared. Not Ready for Implementation.

## Contract Intent

Signal Quality Lab must distinguish readiness-backed historical evidence from research-only or unsupported evidence so the lab does not overstate confidence.

The module remains a research-support surface. It must not present outcome summaries as direct advice.

## Required Source Boundary

Implementation must stay inside `signal-quality-lab` service/types/docs/tests and may consume Data Quality Engine public evaluations only.

Allowed direction:

- `signal-quality-lab` service/types/docs/tests
- Data Quality Engine public evaluation reads already used by the module

Forbidden:

- DQ scoring or readiness duplication inside Signal Quality Lab;
- Prisma/schema, repository, route, controller, frontend, package, generated, or provider scope;
- new query parameters or route behavior for the first slice.

## Required Outcome-Confidence Metadata

Add additive metadata equivalent to:

```ts
type SignalQualityOutcomeConfidenceState =
  | 'TRUSTED'
  | 'LIMITED'
  | 'DIAGNOSTIC'
  | 'UNTRUSTED';

type SignalQualityOutcomeConfidenceReasonCode =
  | 'TRUSTED_READY_EVIDENCE'
  | 'LIMITED_PARTIAL_SELECTED_HORIZON'
  | 'DIAGNOSTIC_DQ_OPTIONAL_OR_MISSING'
  | 'UNTRUSTED_NO_SELECTED_HORIZON_EVIDENCE'
  | 'UNTRUSTED_DQ_LOOKUP_FAILED';

interface SignalQualityOutcomeConfidence {
  state: SignalQualityOutcomeConfidenceState;
  reasonCode: SignalQualityOutcomeConfidenceReasonCode;
  reason: string;
}
```

The exact type name may differ, but the semantics must stay stable.

## Required Mapping Rules

- `TRUSTED` requires selected-horizon evidence to be usable and DQ support to be present for the evaluated sample without hard blocker statuses.
- `LIMITED` means selected-horizon evidence exists, but it is partial or low-sample and should not be treated as strong readiness-backed proof.
- `DIAGNOSTIC` means selected-horizon evidence exists, but DQ coverage is optional or missing for the evaluated sample, so the measurement is research-only.
- `UNTRUSTED` means selected-horizon evidence does not exist or DQ lookup failed, so the module must not imply a reliable quality conclusion.

## Additive Compatibility Rule

- Existing `evidenceUsability`, `evaluationDiagnostics`, grouped metric statuses, `recommendedAction`, and warnings stay backward-compatible.
- The new confidence metadata is additive and must not remove or rename current fields.
- Existing grouped statuses such as `SMALL_SAMPLE` or `INSUFFICIENT_FUTURE_DATA` remain maturity diagnostics, not replacements for outcome-confidence state.

## Forbidden Behavior

- Do not label optional/missing DQ coverage as `TRUSTED`.
- Do not map zero selected-horizon evaluated samples to `LIMITED` or `DIAGNOSTIC`.
- Do not alter DQ filters so they become required by default in this slice.
- Do not edit validation/controller/router just to expose the additive confidence fields.

## Test Contract

Focused backend tests must prove:

- trusted confidence when evaluated evidence is usable and DQ-backed;
- limited confidence when evaluated evidence is partial or low-sample;
- diagnostic confidence when DQ evaluations are missing or optional;
- untrusted confidence when no selected-horizon evidence exists;
- untrusted confidence when DQ lookup fails;
- additive compatibility of existing summary/group response fields.
