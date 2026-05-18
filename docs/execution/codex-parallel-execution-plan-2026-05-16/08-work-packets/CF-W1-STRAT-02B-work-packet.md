# CF-W1-STRAT-02B Work Packet

Date: 2026-05-18

## Work Item

`CF-W1-STRAT-02B` strategy-definition durable revision history proposal packet.

## State

Proposal packet ready. Not Ready for Implementation.

This packet exists only to lock the future consent gate and later child split. It does not authorize application writers, Prisma changes, migrations, generated artifacts, repository/service changes, tests, builds, or UI work.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory
- QA review owner: Team 04 QA Factory
- Future implementation lane: Lane 2
- Governing backend module: `strategy-framework`

## Exact Allowed Files After Team 00 Promotion

None in application code.

`CF-W1-STRAT-02B` itself is not an application-code promotion candidate. The only allowed outputs for this packet are the execution docs created in this pass.

## Current Forbidden Files

- all application source and tests
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma client/types
- `backend/src/modules/strategy-framework/strategy-framework.registry.ts`
- `backend/src/modules/strategy-framework/strategy-framework.evaluator.ts`
- `backend/src/modules/strategy-framework/strategy-framework.controller.ts`
- `backend/src/modules/strategy-framework/strategy-framework.router.ts`
- `backend/src/modules/strategy-framework/strategy-framework.validation.ts`
- all frontend `strategy-framework` files
- backend and frontend route registries
- Data Quality Engine source/tests
- shared backend utilities
- shared UI
- package manifests
- provider, startup, backfill, paid/cloud, broker, telemetry, or live-data scope

## Required Output Of This Packet

The packet must leave behind:

- a clear determination that no no-schema/no-generated first child remains;
- an exact consent gate for schema/generated/repository work;
- a later implementation split that keeps `CF-W1-STRAT-02A` closed;
- proposed future file reservations only, not approved;
- Team 04 proposal-review notes for the split.

## Exact Future Consent Gate

Before any future implementation child starts, Team 00 and Architect must explicitly approve:

1. `backend/prisma/schema.prisma`
2. `backend/prisma/migrations/**`
3. generated Prisma client or generated types
4. `backend/src/modules/strategy-framework/strategy-framework.repository.ts`

No future child may start while another `strategy-framework` source writer is active.

## Exact Split

1. `CF-W1-STRAT-02B1`
   - schema/generated/repository durable-identity foundation only;
   - proposed future files:
     - `backend/prisma/schema.prisma`
     - `backend/prisma/migrations/**`
     - generated Prisma client or generated types
     - `backend/src/modules/strategy-framework/strategy-framework.repository.ts`
     - `backend/src/modules/strategy-framework/strategy-framework.types.ts`
     - `backend/src/modules/strategy-framework/strategy-framework.md`
     - `backend/tests/modules/strategy-framework/strategy-framework.repository.test.ts`
2. `CF-W1-STRAT-02B2`
   - additive service compatibility durable-history exposure only after `02B1`;
   - proposed future files:
     - `backend/src/modules/strategy-framework/strategy-framework.service.ts`
     - `backend/src/modules/strategy-framework/strategy-framework.types.ts`
     - `backend/src/modules/strategy-framework/strategy-framework.md`
     - `backend/tests/modules/strategy-framework/strategy-framework.service.test.ts`

## Explicitly Deferred

- reopening accepted `CF-W1-STRAT-02A`
- evaluator math or scoring changes
- proof-status semantics changes
- controller/router/validation changes
- frontend/shared UI work
- route-registry changes
- Data Quality Engine source changes or local DQ score duplication
- provider/startup/backfill/live-data widening

## QA Planning Handoff For Team 04

Team 04 should review this packet as proposal completeness only.

Review focus:

- no no-schema/no-generated child remains;
- `02A` stays closed;
- `02B1` owns all schema/generated/repository risk;
- `02B2` stays additive and backward-compatible;
- legacy rows are not presented as durable older-version history;
- forbidden widening into evaluator/proof/router/UI/DQ duplication scope remains blocked.

No command execution is authorized by this work packet.

## Stop Conditions

Stop and return to Team 00 / Architect if any request asks `CF-W1-STRAT-02B` to:

- edit Prisma/schema or migrations;
- generate Prisma client/types;
- change Strategy Framework repository/service source now;
- reopen `CF-W1-STRAT-02A`;
- change evaluator math or proof semantics;
- change controller/router/validation, routes, shared UI, or DQ source logic.

## Next Gate

1. Team 04 proposal-review handoff for `CF-W1-STRAT-02B`.
2. Team 00 decision on whether to open `CF-W1-STRAT-02B1` with explicit schema/migration/generated/repository consent.
3. Keep `CF-W1-STRAT-02B` out of Ready-for-implementation routing.
