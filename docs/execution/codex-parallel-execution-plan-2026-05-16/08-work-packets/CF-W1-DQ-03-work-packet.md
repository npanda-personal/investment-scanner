# CF-W1-DQ-03 Work Packet

Date: 2026-05-20

## Work Item

Data Quality residual reason summary for downstream trust consumers.

## State

Architecture-readiness prepared. Not Ready for Implementation.

This packet is bounded to a no-schema, no-route, backend-only first slice and must not be promoted as Ready by this artifact.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 05 Market Data / Data Quality
- Lane: Lane 1
- Module: `data-quality-engine`

## Exact Allowed File Reservations After Team 00 Promotion

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
- all frontend `data-quality-engine` files/tests
- all `market-data-foundation` source/tests
- downstream consumer modules
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend/frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- provider/live-data, startup/backfill, paid/cloud, broker, or telemetry scope

## Required Behavior

Future implementation must:

- derive one compact residual-summary packet from current DQ outputs only;
- avoid inventing a second scoring model;
- decorate both freshly evaluated and repository-returned DTOs at the service layer;
- keep existing DQ filters, gating, and response fields backward-compatible;
- avoid any first-slice downstream consumer rewrite.

## Dependency Notes

- no active Team 06 or Team 07 implementation reserves `data-quality-engine` files;
- the only structural risk is accidental widening into repository persistence or Market Data source edits.

## QA Handoff Notes

Future Team 04 planning should stay backend-only and focused on:

- category mapping correctness;
- summary wording correctness;
- service decoration of repository-returned DTOs;
- additive compatibility of existing fields and filters.

## Stop Conditions

Stop and return to Team 00 if implementation requires:

- repository persistence;
- schema/migration changes;
- route/controller/validation changes;
- frontend/UI work;
- Market Data source edits;
- downstream consumer edits.
