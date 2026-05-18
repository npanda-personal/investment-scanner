# CF-W1-CAL-01 Architecture Review

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Docs-only architecture refresh completed for `CF-W1-CAL-01`.

Ready recommendation: `Ready candidate` for Team 04 QA handoff and Team 00 sequencing, not self-promoted for implementation.

This slice stays backend-only and module-local. It refines calibration trust semantics without opening Prisma, routes, providers, shared utilities, frontend, or package scope.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-CAL-01-signal-calibration-reliability-drift-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-CAL-01-qa-plan.md`
- `backend/src/modules/signal-calibration-engine/index.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.validation.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.routes.test.ts`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.validation.test.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md`

## Current Source Findings

- `signal-calibration-engine` already owns calibration scoring, evidence decoration, readiness framing, and downstream influence decisions.
- Current readiness is derived only from raw-score availability and Signal Quality sample evidence. The service builds `calibrationReadiness(...)` from evidence/sample inputs and does not accept DQ blocker flags directly.
- Persisted DQ evaluation currently affects score penalties and response projection, but not fail-closed readiness. `UNUSABLE`, `NOT_READY`, and `ILLIQUID` are penalized in `persistedDataQualityAdjustment(...)`, while missing DQ only adds a data gap.
- Current types expose only `USABLE`, `LIMITED`, and `UNAVAILABLE`. There is no explicit trust vocabulary for trusted or diagnostic-only output.
- Existing service tests prove current penalty behavior and sample-size readiness behavior, but they do not yet prove the new direct-value trust semantics requested by Team 02 and the Product Owner correction.
- Upstream context-prep concern is no longer a blocker for this packet. `CF-W1-HCTX-01` and `CF-W1-MCTX-01` already have prepared contract paths, so calibration can consume their existing public outputs without inventing new provenance storage.

## Module Boundary Decision

`signal-calibration-engine` owns this requirement.

Reasons:

- the module already chooses when calibrated vs raw output is authoritative;
- the module already projects calibration evidence and readiness into DTOs;
- the trust drift problem is in calibration interpretation, not in SQLAB, DQE, or Historical Context ownership.

Signal Quality Lab, Data Quality Engine, and Historical Context Snapshots remain read-only evidence providers for this slice.

## Architecture Decision

Keep the first child entirely inside `signal-calibration-engine` and add trust-state metadata inside the existing `calibrationReadiness` surface instead of creating a new route, schema field, or cross-module contract.

Preferred additive type shape:

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
  // existing fields preserved
}
```

Rationale:

- this keeps additive compatibility on the existing response shape;
- controller and router code can stay unchanged because service DTOs already flow through;
- backend tests can stay focused on service logic, with route assertions optional only if payload snapshots are expanded.

## Required Trust Mapping

- `TRUSTED`: sufficient selected-horizon evidence, DQ evaluation present, no blocking DQ status, and normal downstream influence.
- `LIMITED`: evidence exists but is low-sample or has non-blocking context gaps; downstream influence remains limited.
- `DIAGNOSTIC_ONLY`: historical evidence exists but DQ alignment is missing; output remains research-only and must not present normal downstream influence.
- `UNAVAILABLE`: selected-horizon evidence is absent, raw score is unavailable, or blocking DQ evidence must fail closed.

## Exact Future File Reservations

One-writer implementation set:

- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`

Optional only if additive response assertions are explicitly added:

- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.routes.test.ts`

## Forbidden Files

Everything outside the reserved writer set is forbidden for the first slice, especially:

- `backend/src/modules/signal-calibration-engine/index.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.repository.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.controller.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.router.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.validation.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.module.ts`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.validation.test.ts`
- all `backend/src/modules/signal-quality-lab/**`
- all `backend/src/modules/data-quality-engine/**`
- all `backend/src/modules/historical-context-snapshots/**`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- all frontend source and frontend tests

## Blocker / Split Notes

- Split required: `No`.
- Architectural blocker: `None` inside the bounded slice.
- Non-blocking semantic dependency: `CF-W1-SQLAB-01` should align trust wording if it lands first, but CAL-01 can proceed against current SQLAB summary fields.
- Non-blocking semantic dependency: `CF-W1-DQ-02` may later improve session-aware currentness evidence, but CAL-01 can already fail closed on current DQE blocker fields without widening scope.
- Shared-file conflict note: do not run any other writer on the reserved calibration service/types/doc/test set in the same pass.

## QA Planning Handoff Notes

Team 04 should keep validation focused on service-local trust-state behavior:

- trusted evidence with normal downstream influence;
- limited evidence with low-sample or context-gap reasons;
- diagnostic-only behavior when DQ alignment is missing;
- unavailable behavior for zero selected-horizon evidence;
- unavailable behavior for blocking DQ states, including `eligibleForCalibration=false`, `eligibleForSignals=false`, `NOT_READY`, `UNUSABLE`, and `ILLIQUID`;
- additive compatibility of existing readiness, evidence, and score fields.

Route-level checks are optional. They are only needed if the implementation expands explicit payload assertions in the existing route test.

## Ready Recommendation

`Ready candidate`

Reason:

- requirement is source-supported;
- write scope is exact and module-local;
- no schema, route, provider, frontend, or shared-file expansion is required;
- Team 04 QA planning already exists and only needs to validate the bounded trust-state path.
