# CF-W1-HCTX-02 Work Packet

Date: 2026-05-19

## Work Item

Historical Context data-quality coverage scope.

## State

Ready candidate for one bounded backend-only child. Not yet promoted for implementation.

This packet is valid only as one single-writer `historical-context-snapshots` pass. It keeps the current coverage endpoint, preserves the raw count, and adds additive provenance fields for data-quality coverage honesty.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 05 Market Data / Data Quality
- Lane: Lane 1
- Module: `historical-context-snapshots`

## Exact Allowed File Reservations After Team 00 Promotion

- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.types.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.repository.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.service.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.repository.test.ts`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.service.test.ts`

## Exact Forbidden Files

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated files
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `backend/src/modules/historical-context-snapshots/index.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.controller.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.router.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.validation.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.module.ts`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.routes.test.ts`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.validation.test.ts`
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/signal-calibration-engine/**`
- `frontend/src/features/historical-context-snapshots/**`
- `frontend/tests/ui/historical-context-snapshots.spec.ts`
- shared backend utilities
- shared frontend components
- package manifests
- provider/live-data integration files
- scheduler/startup/backfill files
- paid/cloud, broker, or telemetry files

## Required Behavior

Future implementation must:

- preserve `dataQualitySnapshots` as the current raw count;
- add additive provenance fields for Historical Context data-quality coverage;
- classify scope as `GLOBAL_ONLY`, `SCOPE_PROVEN`, or `UNAVAILABLE`;
- classify evidence as `PRESENT`, `MISSING`, `STALE`, or `UNKNOWN`;
- fetch and expose the latest data-quality snapshot date used for classification;
- explain global-only coverage with one stable reason or warning string;
- compare only Historical Context owned snapshot dates when classifying freshness;
- avoid any Data Quality Engine scoring duplication;
- avoid any frontend or downstream consumer rewrite.

## Current-Source Constraint

This packet adopts the following constraint:

- current `dev` source cannot honestly prove scoped data-quality coverage for the requested market scope;
- the first child must therefore treat `SCOPE_PROVEN` as reserved future semantics, not as a fabricated current result;
- the product value of the first child is explicit honesty, not fake scope proof.

## Dependencies

- No schema or route dependency blocks this child.
- No current `signal-calibration-engine` source dependency blocks this child because calibration consumes lookup data, not coverage summary data.
- Any future user-facing coverage card, warning banner, or calibration/review UI copy that consumes the new provenance packet must wait until this backend child is accepted.
- Team 04 still needs a dedicated `CF-W1-HCTX-02` QA plan.

## Parallel-Safety Rule

Do not run this child in parallel with any other packet that touches:

- `historical-context-snapshots.service.ts`
- `historical-context-snapshots.types.ts`
- `historical-context-snapshots.repository.ts`
- `historical-context-snapshots.md`
- the reserved Historical Context focused tests

## QA Handoff Notes For Team 04

Team 04 should prepare focused backend QA for:

- preserved raw count compatibility;
- global-only classification when rows exist;
- missing classification when rows do not exist;
- stale classification when latest data-quality snapshot lags latest market-context snapshot;
- unknown classification when comparison basis is unavailable;
- no fabricated `SCOPE_PROVEN` classification on current source;
- unchanged route behavior and backward-compatible caller parsing.

Suggested focused command after implementation exists:

```powershell
cd backend
npm.cmd test -- historical-context-snapshots.repository.test.ts historical-context-snapshots.service.test.ts --runInBand
npm.cmd run build
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- any Prisma/schema/migration or generated-file change;
- any route-registry, controller, router, validation, module, or frontend change;
- any `data-quality-engine` or `signal-calibration-engine` source edit;
- any shared utility/UI, package, provider/live-data, scheduler/startup/backfill, paid/cloud, broker, or telemetry work;
- any attempt to fabricate scoped coverage proof from current unscoped snapshot rows.

## Next Gate

Team 04 QA planning, then Team 00 Ready evaluation.

Any UI coverage card or review-surface adoption is a separate child after this backend packet is accepted.
