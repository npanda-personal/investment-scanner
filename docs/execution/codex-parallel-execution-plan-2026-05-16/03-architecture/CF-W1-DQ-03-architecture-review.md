# CF-W1-DQ-03 Architecture Review

Date: 2026-05-20

Owner: Team 03 Architecture Factory

## Status

Architecture-readiness packet prepared for a bounded first slice.

Readiness result: `Not Ready for Implementation`.

This item remains a draft requirement. This packet does not move it to Ready.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-DQ-03-data-quality-residual-reason-summary-for-downstream-trust-consumers-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-fresh-direct-value-gaps-2026-05-20.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-DQ-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-DQ-02-work-packet.md`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts`
- active-scope conflict references:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-06-CF-W1-SQLAB-02A-implementation-assignment.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-07-CF-W1-L3-TREV-02-implementation-assignment.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-07-CF-W1-L3-INTEL-03-implementation-assignment.md`

## Current Source Findings

- `evaluateInstrument(...)` already computes the raw ingredients needed for a residual-summary classifier: `coverageStatus`, `signalReadinessStatus`, `liquidityStatus`, `dataGaps`, `warnings`, `readinessReasons`, `readinessBlockers`, `recommendedFixes`, and `useCaseTiers`.
- `list(...)`, `diagnostics(...)`, `getLatestEvaluationForInstrument(...)`, `getEvaluationsForInstruments(...)`, and `filterEligibleInstruments(...)` all return or consume `DataQualityEvaluationDto` through the service boundary. That makes service-local DTO decoration feasible without repository edits.
- Current DQ source already owns the readiness logic. A derived residual summary can be produced from existing fields without inventing a second scoring model.
- No inspected source evidence requires route changes, Prisma changes, frontend work, or cross-module edits for a backend-first first slice.

## Module Ownership

`data-quality-engine` owns this first slice.

Reasons:

- the trust gap is a missing summary layer on top of owned DQ outputs;
- downstream consumers should reuse one DQ-owned interpretation instead of mapping raw fields differently in multiple modules;
- the service already touches both evaluated and repository-returned DTOs.

## Architecture Verdict

Bounded no-schema, no-route, no-shared-file first slice is feasible.

Recommended first slice:

- backend-only;
- additive to `DataQualityEvaluationDto`;
- derive summary from current DQ outputs only;
- decorate both freshly evaluated and repository-returned DTOs in service methods;
- no repository, frontend, or downstream consumer rewrite in this child.

Recommended stable semantics:

- residual category such as `CLEAN`, `LIMITED`, `BLOCKED`, `COVERAGE_GAP`, `LIQUIDITY_GAP`, `UNSUPPORTED`, `MISSING_DATA`;
- residual reason code list derived from existing DQ fields;
- one compact `reasonSummary` string that downstream trust consumers can display directly.

## Exact Future File Reservations

If Team 00 later promotes a first implementation slice, reserve only:

- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts`

## Exact Forbidden Files

- `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.controller.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.router.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.validation.ts`
- `backend/src/modules/data-quality-engine/index.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.repository.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.routes.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.validation.test.ts`
- `backend/src/modules/market-data-foundation/**`
- all frontend `data-quality-engine` files/tests
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- provider/live-data, startup/backfill, paid/cloud, broker, or telemetry scope

## Dependency Risks And Stop Conditions

Stop and return to Team 00 if the first slice requires:

- repository persistence of the residual summary;
- Prisma/schema changes;
- route/controller/validation changes;
- frontend/UI changes to satisfy first-slice acceptance;
- edits in `market-data-foundation` or any downstream consumer.

Specific risk:

- if Team 00 later requires repository-level list consistency for stored historical rows, split a second child. Do not smuggle repository persistence into this first slice.

## Parallel-Safety With Active Teams

- Safe in parallel with active `CF-W1-SQLAB-02A`; Team 06 touches only `signal-quality-lab/**`.
- Safe in parallel with active `CF-W1-L3-TREV-02`; Team 07 touches only `today-trade-review/**`.
- Safe in parallel with active `CF-W1-L3-INTEL-03`; Team 07 touches only `portfolio-intelligence/**`.

The child is not safe to parallelize with any future `data-quality-engine` writer reserving the same service/types/test files.

## QA Planning Handoff Notes

Future Team 04 planning should cover:

- clean data;
- limited but not blocked data;
- blocked data;
- mixed coverage gaps;
- thin or illiquid states;
- unsupported or missing-context states;
- service decoration on both evaluated and repository-returned DTO flows;
- backward compatibility of existing DQ fields.
