# CF-W1-HCTX-01 Work Packet

Date: 2026-05-18

## Work Item

Historical Context lookup explainability and provenance labeling.

## State

Ready candidate for a bounded backend-first child. Not yet promoted for implementation.

This slice is intentionally backend-only and module-local. It adds additive lookup provenance without changing routes, schema, providers, shared code, downstream consumers, or frontend scope.

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

## Current Forbidden Files

- application source or tests before Team 00 promotion
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.repository.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.controller.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.router.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.validation.ts`
- `backend/src/modules/historical-context-snapshots/index.ts`
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `backend/src/modules/market-context-intelligence/**`
- `backend/src/modules/smart-money-intelligence/**`
- `backend/src/modules/market-data-foundation/**`
- `backend/src/modules/signal-calibration-engine/**`
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- provider files
- frontend implementation files and frontend tests unless separately approved
- providers, live-market validation, paid/cloud, broker, or telemetry flows

## Required Behavior

Future implementation must:

- add stable lookup explainability metadata for market, sector, country, smart-money, and data-quality selection;
- distinguish exact-date, nearest-prior, missing-within-lookback, metadata-gap, and not-requested states;
- expose requested date, lookback days, region, asset type, selected snapshot date, lag days, and per-slice source as additive provenance;
- preserve current lookup fields and research-support wording;
- avoid repository, route, validation, provider, shared, downstream-consumer, or frontend expansion.

## Dependency Notes

- Primary owner is `historical-context-snapshots`.
- The first slice depends only on existing persisted snapshot payloads already carrying `snapshotDate`.
- Existing persisted rows already expose enough evidence to derive requested-versus-selected lag and reason codes inside the service layer.
- No frontend approval is required for the first packet because the explainability metadata is additive and backend-owned.
- A later frontend consumer pass may render the new fields, but that is separate work and must not be folded into this packet.

## QA Handoff Notes For Team 04

Team 04 should prepare focused backend QA for:

- exact-date lookup with zero lag, matching selected snapshot date, and `PERSISTED_EXACT_DATE`;
- nearest-prior lookup with positive lag, `PERSISTED_NEAREST_PRIOR_DATE`, and correct top-level `maxLagDays`;
- partial lookup with missing requested sector, smart-money, or data-quality evidence using `MISSING_WITHIN_LOOKBACK`;
- metadata-gap sector input using `METADATA_GAP_INPUT` instead of a generic missing message;
- optional slices omitted from the request using `NOT_REQUESTED` and not polluting `gaps[]`;
- missing market snapshot inside lookback producing a visibly diagnostic partial or missing result;
- additive compatibility of current lookup response fields.

Suggested focused command after implementation exists:

```powershell
cd backend
npm.cmd test -- historical-context-snapshots.service.test.ts --runInBand
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- Prisma/schema changes;
- repository/controller/router/validation changes;
- Market Context, Smart Money, Market Data, or Signal Calibration source/export changes;
- shared DTO, shared utility, shared UI, package, generated, provider, or frontend work;
- downstream consumer rewrites in Signal Calibration, Signal Quality, or Historical Context frontend in the same slice.

## Next Gate

Team 04 QA planning, then Team 00 sequencing and Ready promotion review. This packet is bounded enough for Ready evaluation, but Team 03 does not self-promote implementation.
