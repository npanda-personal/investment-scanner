# CF-W1-SQLAB-01 Architecture Review

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Backend-only Signal Quality Lab outcome-confidence packet prepared. Not Ready for Implementation.

This packet is intentionally module-local. It must refine Signal Quality Lab trust labeling without opening Prisma, route, frontend, provider, or shared-utility scope.

## Evidence Inspected

- `AGENTS.md`
- `10-requirements/CF-W1-SQLAB-01-signal-quality-outcome-confidence-requirement.md`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.validation.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.routes.test.ts`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.validation.test.ts`

## Current Source Findings

- `signal-quality-lab` already owns historical outcome measurement, evidence diagnostics, grouped quality metrics, and user-facing `recommendedAction` warnings.
- Selected-horizon evidence is currently summarized only as `USABLE`, `LIMITED`, or `UNAVAILABLE`.
- DQ filtering is optional and query-driven. Missing DQ evaluations remain measurable unless a strict readiness filter is requested.
- Group rows expose `EVALUATED`, `INSUFFICIENT_FUTURE_DATA`, `MISSING_PRICE_DATA`, `FILTERED_OUT`, and `SMALL_SAMPLE`, but these are maturity states, not trust states.
- The module already consumes Data Quality Engine public evaluations through `getEvaluationsForInstruments(...)`; no repository, schema, or route change is required for a first trust-state slice.

## Module Boundary Review

`signal-quality-lab` should own outcome-confidence labeling because it already owns:

- selected-horizon evidence usability;
- outcome maturity and missing-price diagnostics;
- grouped/per-scope historical measurement summaries;
- the research-only explanation surface presented to downstream consumers.

Data Quality Engine remains the owner of readiness evaluation and eligibility inputs. Signal Quality Lab must consume those inputs and label historical outcome trust; it must not recreate DQ scoring logic.

## Architecture Decision

Prepare `CF-W1-SQLAB-01` as a bounded `signal-quality-lab` slice that adds additive outcome-confidence metadata on top of existing evidence diagnostics.

The first implementation should introduce stable states equivalent to:

```ts
type SignalQualityOutcomeConfidenceState =
  | 'TRUSTED'
  | 'LIMITED'
  | 'DIAGNOSTIC'
  | 'UNTRUSTED';
```

With stable reason codes equivalent to:

```ts
type SignalQualityOutcomeConfidenceReasonCode =
  | 'TRUSTED_READY_EVIDENCE'
  | 'LIMITED_PARTIAL_SELECTED_HORIZON'
  | 'DIAGNOSTIC_DQ_OPTIONAL_OR_MISSING'
  | 'UNTRUSTED_NO_SELECTED_HORIZON_EVIDENCE'
  | 'UNTRUSTED_DQ_LOOKUP_FAILED';
```

Recommended first-pass mapping:

- `TRUSTED`: selected horizon is `USABLE`, DQ lookup succeeds, every evaluated instrument has a DQ evaluation, and the evaluated sample has no hard `NOT_READY` / `UNUSABLE` / `ILLIQUID` blocker in the attached DQ evidence.
- `LIMITED`: selected horizon has evaluated evidence, but evidence usability is partial or the evaluated sample contains only limited/low-sample DQ support rather than hard blockers.
- `DIAGNOSTIC`: selected horizon has evaluated evidence, but the module cannot confirm readiness-backed DQ coverage for all evaluated rows because DQ is optional or missing.
- `UNTRUSTED`: selected horizon has no evaluated evidence, or DQ lookup fails and the module cannot support a trustworthy outcome-confidence label.

## Exact Future File Reservations

- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`
- optional only if endpoint-level additive response assertions are added: `backend/tests/modules/signal-quality-lab/signal-quality-lab.routes.test.ts`

## Forbidden Files

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.repository.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.controller.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.router.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.validation.ts`
- Data Quality Engine source or exports
- Signal Generation, Strategy Decision, Trade Plan, or Calibration source
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- frontend source/tests
- provider/live-market, paid/cloud, broker, or telemetry flows

## Dependency And Conflict Notes

- No Prisma, route, shared DTO, generated-type, package, provider, or frontend blocker is required for the first bounded slice.
- This packet depends on existing Data Quality Engine public evaluation semantics staying consumable through `getEvaluationsForInstruments(...)`.
- `CF-W1-DQ-02` is a non-blocking future improvement. Once accepted, Signal Quality Lab should incorporate currentness evidence into its trust-state reasons, but this packet does not require DQ source changes first.
- `CF-W1-CAL-01` is an adjacent downstream consumer. If both are promoted, Team 00 should sequence them because calibration can later reuse the SQLAB trust vocabulary.
- This packet conflicts with any active Lane 2 work reserving `signal-quality-lab.service.ts`, `signal-quality-lab.types.ts`, or the same service test file.

## Required QA Scenarios

Focused backend QA should prove:

- trusted selected-horizon evidence with complete DQ support;
- limited selected-horizon evidence with low-sample or partial DQ support;
- diagnostic evidence when DQ evaluation is missing or optional for the measured sample;
- untrusted evidence when selected-horizon outcomes are unavailable;
- untrusted evidence when DQ lookup fails and confidence cannot be justified;
- backward-compatible existing summary/group fields remain present while the new confidence metadata is additive.

## Readiness Result

Architecture packet prepared. Not Ready for Implementation.

The slice is bounded and module-local, but Team 04 QA planning and Team 00 sequencing are still required.
