# CF-W1-HCTX-01 Work Packet

Date: 2026-05-18

## Work Item

Historical Context lookup explainability and provenance labeling.

## State

Architecture packet prepared. Not Ready for Implementation.

This slice is intentionally backend-only and module-local. It adds additive lookup provenance without changing routes, schema, providers, or frontend scope.

## Owner / Lane / Modules

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 05 Market Data / Data Quality
- Lane: Lane 1
- Module: `historical-context-snapshots`

## Allowed Files After Ready Promotion

- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.service.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.types.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.service.test.ts`
- optional only if endpoint-level additive response assertions are added: `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.routes.test.ts`

## Current Forbidden Files

- application source or tests before Team 00 promotion
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.repository.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.controller.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.router.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.validation.ts`
- Market Context Intelligence source or exports
- Smart Money Intelligence source or exports
- Market Data Foundation source or exports
- Signal Calibration source
- Signal Quality Lab source
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- frontend files
- providers, live-market validation, paid/cloud, broker, or telemetry flows

## Required Behavior

Future implementation must:

- add stable lookup explainability metadata for market, sector, country, smart-money, and data-quality selection;
- distinguish exact-date, nearest-prior, missing-within-lookback, metadata-gap, and not-requested states;
- expose selected snapshot date and lag days as additive provenance;
- preserve current lookup fields and research-support wording;
- avoid repository, route, validation, provider, or frontend expansion.

## Dependency Notes

- Primary owner is `historical-context-snapshots`.
- The first slice depends only on existing persisted snapshot payloads already carrying `snapshotDate`.
- No frontend approval is required for the first packet because the explainability metadata is additive and backend-owned.
- A later frontend consumer pass may render the new fields, but that is separate work and must not be folded into this packet.

## QA Handoff Needed

Team 04 should prepare focused backend QA for:

- exact-date lookup with zero lag;
- nearest-prior lookup with explicit lag explanation;
- partial lookup with missing requested evidence;
- metadata-gap sector input;
- missing market snapshot inside lookback;
- additive compatibility of current lookup response fields.

Suggested focused command after implementation exists:

```powershell
cd backend
npm.cmd test -- historical-context-snapshots.service.test.ts historical-context-snapshots.routes.test.ts --runInBand
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- Prisma/schema changes;
- repository/controller/router/validation changes;
- Market Context, Smart Money, or Market Data source/export changes;
- shared DTO, shared utility, package, generated, provider, or frontend work;
- downstream consumer rewrites in Signal Calibration or Signal Quality in the same slice.

## Next Gate

Team 04 QA planning, then Team 00 sequencing. This packet is bounded enough for future Ready review, but it is not promoted by Team 03.
