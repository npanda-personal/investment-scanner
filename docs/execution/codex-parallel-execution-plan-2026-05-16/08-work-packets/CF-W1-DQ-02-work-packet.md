# CF-W1-DQ-02 Work Packet

Date: 2026-05-18

## Work Item

`CF-W1-DQ-02` first child only: Data Quality service-local currentness classifier and fail-closed propagation.

## State

Split required. First child prepared for QA planning only. Not Ready for Implementation.

This work packet does not authorize the full parent requirement. It covers only the smallest module-local slice that can be implemented without Market Data source edits, DQE repository/read-side edits, schema changes, or route changes.

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

## Exact Forbidden File Reservations For This Child

- `backend/src/modules/market-data-foundation/**`
- `backend/src/modules/data-quality-engine/index.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.controller.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.router.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.validation.ts`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- all frontend files/tests

## Required First-Child Behavior

Future implementation must:

- import and use existing Market Data public session exports only;
- replace the hard-coded seven-day stale heuristic for evaluated instruments with session-aware currentness classification;
- add additive currentness evidence fields and stable reason codes to the in-memory DQ evaluation result;
- propagate stale, missing, and blocked currentness into `dataGaps`, `readinessBlockers`, and use-case tiers so strict callers fail closed;
- preserve existing route and persistence behavior by not promising repository/list/summary/diagnostics-wide currentness storage in this child.

## Explicit Parent Blocker

Stop treating the full parent as one Ready packet.

The full requirement still needs a later approval-gated packet if Team 00 wants currentness evidence to be consistently exposed from persisted DQ list/summary/diagnostics paths, because current stored `DataQualityEvaluation` rows do not contain the required session-aware evidence fields.

## QA Planning Handoff For Team 04

Team 04 should plan and later verify the first child with focused backend coverage for:

- latest observed date equals latest completed session => current;
- market open/finalization grace without false stale classification;
- lagging observed date => stale;
- missing latest price => missing;
- session evidence unavailable => blocked;
- provider-gap or missing-final-candle blocker evidence => blocked;
- default strict DQ paths continue excluding stale/missing/blocked instruments.

Suggested focused command after implementation exists:

```powershell
cd backend
npm.cmd test -- data-quality-engine.service.test.ts data-quality-engine.invariants.test.ts --runInBand
```

Optional read-only regression command if Team 04 wants direct helper reassurance without widening edit scope:

```powershell
cd backend
npm.cmd test -- market-data.market-session.test.ts --runInBand
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- any `market-data-foundation` source edit;
- any DQE repository/controller/router/validation/index edit;
- Prisma/schema/migration changes;
- route changes;
- generated/package/shared-utility/shared-UI changes;
- durable currentness persistence promises;
- frontend/UI work;
- live-provider validation.

## Next Gate

Team 04 QA planning for the bounded first child, then Team 00 sequencing.
