# CF-W1-DQ-02 Read-Side Currentness Work Packet

Date: 2026-05-25

## Work Item

`CF-W1-DQ-02-RS1` Data Quality Engine read-side/public-contract currentness reconstruction.

## State

Ready candidate after QA.

No implementation is authorized from this work packet until Team 04 accepts the QA handoff and Team 00 records Ready promotion.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 05 Lane 1 or Team 00-assigned DQE writer
- Lane: Lane 1
- Module: `data-quality-engine`

## Exact Allowed Files After Ready Promotion

- `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- `backend/tests/modules/data-quality-engine/data-quality-engine.repository.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts`

## Exact Forbidden Files

- `backend/src/modules/data-quality-engine/data-quality-engine.controller.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.router.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.validation.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.module.ts`
- `backend/src/modules/data-quality-engine/index.ts`
- `backend/src/api/routes.ts`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated files
- package manifests
- shared backend utilities
- all `backend/src/modules/market-data-foundation/**`
- provider / scheduler / worker / queue / startup / backfill files
- all frontend source/tests
- shared UI
- `frontend/src/app/routes.tsx`

## Required Implementation Shape

Future implementation must:

- keep one DQE-owned read-side currentness reconstruction helper or equivalent shared path;
- apply that same basis to `summary`, `list`, `diagnostics`, `getLatestEvaluationForInstrument`, and `getEvaluationsForInstruments`;
- stop deriving summary stale counts from persisted string heuristics alone;
- keep Market Data Foundation as the owner of session timing and upstream read evidence;
- keep existing downstream DQ fail-closed behavior intact.

## Required QA Scenarios

Team 04 should verify:

- current completed session
- current finalization pending
- stale missed completed session
- missing latest price
- session evidence unavailable
- provider-gap blocked
- contradictory evidence
- fail-closed propagation

Cross-surface consistency must be explicit:

- `summary`
- `list`
- `diagnostics`
- latest-evaluation helper reads

All four surfaces must tell the same currentness story for the same instrument/evidence state.

## Test Expectation

Required focused tests later:

- `backend/tests/modules/data-quality-engine/data-quality-engine.repository.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts`

Controller/route response tests are not required for this child.

## One-Writer Rule

Reserve the whole DQE writer set to one implementer in one pass.

Do not split repository and service across parallel writers.

## Stop Conditions

Stop and return to Team 00 immediately if implementation requires:

- Prisma/schema/migration changes
- any `market-data-foundation` source/doc/test edit
- route/controller/validation widening
- package/generated/shared utility scope
- provider/startup/backfill changes
- frontend work
- durable currentness storage

If any of those are required, Team 00 must create a Decision Packet instead of silently widening this child.

## Next Gate

Team 04 QA plan for the bounded DQE read-side packet, then Team 00 Ready promotion.
