# TEAM-03 CF-W1-SQLAB-02B Architecture

Date: 2026-05-18

Team: Team 03 - Architecture Factory

Work item: `CF-W1-SQLAB-02B` durable Signal Quality Lab learning memory

Status: proposal-only

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-SQLAB-02B-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-SQLAB-02B-signal-outcome-journal-durable-learning-memory-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-SQLAB-02B-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-SQLAB-02B-architecture.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-03-CF-W1-SQLAB-02B-architecture-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SQLAB-02B-signal-outcome-journal-durable-learning-memory-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SQLAB-02-signal-outcome-journal-post-event-learning-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-SQLAB-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-SQLAB-02-signal-outcome-journal-post-event-learning-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-SQLAB-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-SQLAB-02A-qa-plan.md`
- `backend/prisma/schema.prisma`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.repository.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.controller.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.router.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.validation.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.routes.test.ts`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.validation.test.ts`

## Exact Evidence

- Current `dev` still documents and returns on-demand outcomes only, with `outcomesPersisted = false` and no module-owned persistence table.
- Existing Signal Quality Lab routes already provide a bounded batch entrypoint and a bounded read surface, so the first durable child does not need a route-registry change if it stays additive.
- Reusing `SignalResult`, `SignalCalibrationResult`, or `TodayReviewRun` would violate module ownership and mix unrelated lifecycles.
- `CF-W1-SQLAB-02A` remains the only honest no-schema precursor. Durable value itself requires schema, migration, generated Prisma output, and repository ownership.

## Future Implementation Split

### `CF-W1-SQLAB-02B1`

Schema/generated/repository durable foundation only.

Proposed future reservations:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma client or generated types
- `backend/src/modules/signal-quality-lab/signal-quality-lab.repository.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.repository.test.ts`

### `CF-W1-SQLAB-02B2`

Service/API compatibility only after `02B1`.

Proposed future reservations:

- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`
- `backend/src/modules/signal-quality-lab/index.ts` only if stable type exports are required

## Exact Forbidden Files Before Consent

- all application source and tests
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma client or generated types
- `backend/src/modules/signal-quality-lab/signal-quality-lab.repository.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.controller.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.router.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.validation.ts`
- `backend/src/modules/signal-quality-lab/index.ts`
- `backend/tests/modules/signal-quality-lab/**`
- all frontend `signal-quality-lab` files
- backend and frontend route registries
- `backend/src/modules/signal-generation-engine/**`
- `backend/src/modules/signal-calibration-engine/**`
- `backend/src/modules/today-trade-review/**`
- shared backend utilities
- shared frontend components
- package manifests
- providers, startup/backfill, paid/cloud, broker, or telemetry scope

## Decision Packet

No new Decision Packet is needed from this pass.

The blocker is explicit file-level consent, not unresolved product ambiguity. Open a Decision Packet later only if Team 00 wants to choose a different storage model than the module-owned Prisma path proposed here.

## QA Recommendation

Team 04 should perform a proposal-review pass only, with focus on:

- no honest no-schema durable child remaining after `02A`;
- natural-key/idempotency completeness;
- durable field completeness;
- strict `02B1` versus `02B2` split;
- additive reuse of existing routes;
- rejection of foreign persistence reuse.

No executable QA, build, or test run is recommended in this docs-only packet.

## Consent Status

- Product Owner consent: not granted for schema/generated/repository implementation
- Team 00 consent: not granted for future writer reservation activation
- Architect consent: not granted for schema/migration/generated/repository activation

## Next Gate

Team 04 proposal review, then Team 00 decision on whether to open `CF-W1-SQLAB-02B1` under explicit schema/generated/repository consent.
