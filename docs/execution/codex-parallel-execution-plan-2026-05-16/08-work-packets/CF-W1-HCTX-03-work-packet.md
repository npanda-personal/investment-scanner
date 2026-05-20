# CF-W1-HCTX-03 Work Packet

Date: 2026-05-20

## Work Item

Historical Context nearest-snapshot age and provenance warnings.

## State

Architecture-readiness prepared. Not Ready for Implementation.

This packet is bounded to a no-schema, no-route, backend-only first slice and must not be promoted as Ready by this artifact.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 05 Market Data / Data Quality
- Lane: Lane 1
- Module: `historical-context-snapshots`

## Exact Allowed File Reservations After Team 00 Promotion

- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.types.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.service.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.service.test.ts`

## Exact Forbidden Files

- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.repository.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.controller.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.router.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.validation.ts`
- `backend/src/modules/historical-context-snapshots/index.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.module.ts`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.repository.test.ts`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.routes.test.ts`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.validation.test.ts`
- all frontend `historical-context-snapshots` files/tests
- all `market-context-intelligence` source/tests
- all `signal-quality-lab` source/tests
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

- preserve current nearest-on-or-before lookup semantics;
- add additive age/provenance metadata only;
- expose requested date, selected date, lag days, lookback days, and stable status labels;
- distinguish same-day, near-date, fallback, metadata-gap, missing, and not-requested cases;
- keep summary wording research-support oriented;
- avoid any downstream consumer rewrites in the first slice.

## Dependency Notes

- no blocker from active `SQLAB-02A`, `TREV-02`, or `INTEL-03`; file reservations are disjoint;
- potential blocker only if service-local derivation is impossible from the current lookup payload and a repository edit becomes necessary.

## QA Handoff Notes

Future Team 04 planning should stay backend-only and focused on:

- exact-date lookup;
- nearest-prior lookup;
- fallback-within-lookback lookup;
- missing lookup;
- metadata-gap input;
- additive compatibility.

## Stop Conditions

Stop and return to Team 00 if implementation requires:

- repository widening;
- schema/migration changes;
- route/controller/validation changes;
- frontend/UI work;
- shared utility or shared UI changes;
- edits in `market-context-intelligence` or `signal-quality-lab`.
