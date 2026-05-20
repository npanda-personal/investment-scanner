# CF-W1-MCTX-02 Work Packet

Date: 2026-05-20

## Work Item

Market Context freshness basis labels for persisted vs generated summaries.

## State

Architecture-readiness prepared. Not Ready for Implementation.

This packet is bounded to a no-schema, no-route, backend-only first slice and must not be promoted as Ready by this artifact.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 05 Market Data / Data Quality
- Lane: Lane 1
- Module: `market-context-intelligence`

## Exact Allowed File Reservations After Team 00 Promotion

- `backend/src/modules/market-context-intelligence/market-context-intelligence.service.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.types.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.md`
- `backend/tests/modules/market-context-intelligence/market-context-intelligence.service.test.ts`

## Exact Forbidden Files

- `backend/src/modules/market-context-intelligence/market-context-intelligence.repository.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.controller.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.router.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.validation.ts`
- `backend/src/modules/market-context-intelligence/index.ts`
- `backend/tests/modules/market-context-intelligence/market-context-intelligence.repository.test.ts`
- `backend/tests/modules/market-context-intelligence/market-context-intelligence.routes.test.ts`
- all frontend `market-context-intelligence` files/tests
- all downstream consumer module source/tests
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

- expose additive persisted-vs-generated basis metadata only;
- preserve current regime math and persisted-save behavior;
- keep basis derivation in the service layer;
- preserve explicit macro-missing and partial-evidence wording;
- avoid any first-slice UI or downstream consumer rewrite.

## Dependency Notes

- no active Team 06 or Team 07 implementation reserves `market-context-intelligence` files;
- only structural risk is accidental widening into repository persistence or feature-local UI adoption.

## QA Handoff Notes

Future Team 04 planning should stay backend-only and focused on:

- persisted-at-request-start path;
- generated-on-demand path;
- reason-summary correctness;
- additive compatibility of current summary fields.

## Stop Conditions

Stop and return to Team 00 if implementation requires:

- repository persistence changes;
- schema/migration changes;
- route/controller/validation changes;
- frontend/UI work in the first slice;
- edits in Historical Context, Signal Calibration, or Research Hub.
