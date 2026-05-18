# CF-W1-CAL-01 Architecture Review

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Backend-only Signal Calibration reliability-drift packet prepared. Not Ready for Implementation.

This packet is intentionally module-local. It must refine calibration trust-state behavior without opening Prisma, route, frontend, provider, or shared-utility scope.

## Evidence Inspected

- `AGENTS.md`
- `10-requirements/CF-W1-CAL-01-signal-calibration-reliability-drift-requirement.md`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.validation.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.routes.test.ts`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.validation.test.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`

## Current Source Findings

- `signal-calibration-engine` already owns `calibrationReadiness`, `downstreamInfluence`, `authoritativeScore`, evidence warnings, and passthrough behavior.
- The module already consumes Signal Quality Lab summary diagnostics and latest Data Quality Engine evaluation inputs through public services.
- Current readiness semantics are `USABLE`, `LIMITED`, and `UNAVAILABLE`; there is no explicit diagnostic-only or trusted state vocabulary.
- Current DQ penalty logic treats `NOT_READY`, `UNUSABLE`, `ILLIQUID`, and missing evaluation as penalties or gaps, but not always as hard trust blockers inside `calibrationReadiness(...)`.
- Historical context gaps are surfaced as data gaps, but the current readiness layer can still read more authoritative than the evidence justifies.

## Module Boundary Review

`signal-calibration-engine` owns this requirement.

Reasons:

- calibration already owns downstream influence decisions;
- calibration already decides when raw score stays authoritative;
- calibration already combines SQLAB evidence, DQ evaluation, and context gaps into a calibration-specific readiness surface.

Signal Quality Lab and Data Quality Engine remain upstream evidence providers. They should not own calibration reliability-drift policy.

## Architecture Decision

Prepare `CF-W1-CAL-01` as a bounded `signal-calibration-engine` slice that refines calibration trust-state semantics while preserving current score math and additive DTO compatibility.

The first implementation should add stable states equivalent to:

```ts
type CalibrationTrustState =
  | 'TRUSTED'
  | 'LIMITED'
  | 'DIAGNOSTIC_ONLY'
  | 'UNAVAILABLE';
```

With stable reasons equivalent to:

```ts
type CalibrationTrustReasonCode =
  | 'TRUSTED_EVIDENCE_BACKED'
  | 'LIMITED_LOW_SAMPLE_OR_CONTEXT_GAPS'
  | 'DIAGNOSTIC_MISSING_DQ_ALIGNMENT'
  | 'UNAVAILABLE_NO_SELECTED_HORIZON_EVIDENCE'
  | 'UNAVAILABLE_BLOCKING_DQ_STATUS';
```

Recommended first-pass mapping:

- `TRUSTED`: selected-horizon evidence is sufficient, DQ evaluation exists, no blocking DQ status is present, and calibration applies with normal downstream influence.
- `LIMITED`: evidence exists but is low-sample or has non-blocking context gaps, and downstream influence stays limited.
- `DIAGNOSTIC_ONLY`: evidence exists but DQ coverage/alignment is missing, so calibration remains research-only and must not present normal downstream influence.
- `UNAVAILABLE`: selected-horizon evidence is missing, raw score is unavailable, or blocking DQ evidence means calibration must fail closed.

## Exact Future File Reservations

- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`
- optional only if endpoint-level additive response assertions are added: `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.routes.test.ts`

## Forbidden Files

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.repository.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.controller.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.router.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.validation.ts`
- Signal Quality Lab source or exports
- Data Quality Engine source or exports
- Historical Context Snapshots source
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- frontend source/tests
- provider/live-market, paid/cloud, broker, or telemetry flows

## Dependency And Conflict Notes

- `signal-calibration-engine` owns this slice. No shared DTO, schema, route, package, generated, provider, or frontend change is required for the first bounded packet.
- This packet depends on existing Signal Quality Lab summary diagnostics (`evidenceUsability`, `evaluationDiagnostics`, `horizonAvailability`) remaining available through public service calls.
- `CF-W1-SQLAB-01` is a semantic dependency, not a blocking source dependency. If accepted first, calibration should align its trust reasons with SQLAB vocabulary. The bounded calibration slice can still proceed against current SQLAB summary fields.
- `CF-W1-DQ-02` is a non-blocking future improvement. Once accepted, calibration should absorb currentness blockers via the DQ public evaluation, but the first slice can already fail closed on existing `NOT_READY`, `UNUSABLE`, `ILLIQUID`, and `eligibleForCalibration=false` signals.
- This packet conflicts with any active Lane 2 work reserving `signal-calibration-engine.service.ts`, `signal-calibration-engine.types.ts`, or the same service test file.

## Required QA Scenarios

Focused backend QA should prove:

- trusted calibration when evidence is sufficient and DQ-backed;
- limited calibration when evidence is low-sample or context is partial;
- diagnostic-only calibration when DQ alignment is missing;
- unavailable calibration when selected-horizon evidence is absent;
- unavailable calibration when DQ evidence is blocking;
- current score math remains unchanged except for trust-state gating and additive metadata.

## Readiness Result

Architecture packet prepared. Not Ready for Implementation.

The slice is bounded and module-local, but Team 04 QA planning and Team 00 sequencing are still required.
