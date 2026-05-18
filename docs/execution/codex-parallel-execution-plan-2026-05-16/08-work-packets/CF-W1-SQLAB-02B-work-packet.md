# CF-W1-SQLAB-02B Work Packet

Date: 2026-05-18

## Work Item

`CF-W1-SQLAB-02B` durable Signal Quality Lab learning-memory proposal packet.

## State

Proposal-only. Not Ready for Implementation.

This packet exists only to lock the future consent gate and exact implementation split for durable learning memory. It does not authorize any application writer, Prisma change, migration, generated artifact change, repository change, service change, route change, test run, build, or frontend work.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory
- QA proposal-review owner: Team 04 QA Factory
- Future implementation lane: Lane 2
- Governing backend module: `signal-quality-lab`

## Exact Allowed Files After Team 00 Promotion

None in application code.

`CF-W1-SQLAB-02B` itself is not an application-code promotion candidate. The only safe outputs for this packet are the execution docs created in this pass.

## Current Forbidden Files

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

## Required Output Of This Packet

The packet must leave behind:

- confirmation that no honest no-schema durable child remains after `02A`;
- a precise storage boundary owned by `signal-quality-lab`;
- the minimum idempotent natural key;
- the minimum durable field set;
- the exact consent gate for schema/generated/repository work;
- the exact split between `02B1` and `02B2`;
- Team 04 proposal-review notes.

## Exact Future Consent Gate

Before any future implementation child starts, Team 00 and Architect must explicitly approve:

1. `backend/prisma/schema.prisma`
2. `backend/prisma/migrations/**`
3. generated Prisma client or generated types
4. `backend/src/modules/signal-quality-lab/signal-quality-lab.repository.ts`

No future child may start while another overlapping `signal-quality-lab` writer is active.

## Exact Future Split

1. `CF-W1-SQLAB-02B1`
   - durable storage foundation only
   - proposed future files:
     - `backend/prisma/schema.prisma`
     - `backend/prisma/migrations/**`
     - generated Prisma client or generated types
     - `backend/src/modules/signal-quality-lab/signal-quality-lab.repository.ts`
     - `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
     - `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
     - `backend/tests/modules/signal-quality-lab/signal-quality-lab.repository.test.ts`
2. `CF-W1-SQLAB-02B2`
   - service/API compatibility only after `02B1`
   - proposed future files:
     - `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
     - `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
     - `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
     - `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`
     - `backend/src/modules/signal-quality-lab/index.ts` only if stable type exports are required

## Explicitly Deferred

- widening `CF-W1-SQLAB-02A`
- frontend/UI implementation
- route/controller/validation changes
- route registry changes
- generic notes or editable journaling
- Signal Generation, Signal Calibration, or Today Review persistence reuse
- startup/backfill or provider widening

## Dependency Notes

- `CF-W1-SQLAB-02A` remains the active preview/UI child and must stay separately scoped.
- `CF-W1-SQLAB-01` remains the upstream trust-framing dependency.
- `CF-W1-SQLAB-02B2` overlaps with the same service/types/doc/service-test surfaces as `02A`; Team 00 must sequence them and keep one writer per file.
- `CF-W1-SQLAB-02B1` can only start after explicit schema/generated/repository consent is recorded.

## QA Planning Handoff For Team 04

Team 04 should review this packet as proposal completeness only.

Review focus:

- no no-schema durable child remains;
- natural key prevents duplicate durable rows;
- durable field set is sufficient for audited research memory;
- `02B1` owns all schema/generated/repository risk;
- `02B2` stays additive on existing routes;
- no foreign persistence reuse is implied.

No command execution is authorized by this work packet.

## Stop Conditions

Stop and return to Team 00 / Architect if any request asks `CF-W1-SQLAB-02B` to:

- edit Prisma/schema or migrations now;
- generate Prisma output now;
- change repository/service/controller/router/validation source now;
- widen into frontend or shared UI now;
- reuse foreign persisted rows for journal storage;
- widen into provider/startup/backfill/live-data scope.

## Next Gate

1. Team 04 proposal-review handoff for `CF-W1-SQLAB-02B`.
2. Team 00 decision on whether to open `CF-W1-SQLAB-02B1` with explicit schema/migration/generated/repository consent.
3. Keep `CF-W1-SQLAB-02B` out of Ready-for-implementation routing.
