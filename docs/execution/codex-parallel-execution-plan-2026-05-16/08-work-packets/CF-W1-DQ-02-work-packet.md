# CF-W1-DQ-02 Work Packet

Date: 2026-05-18

## Work Item

Market-session-aware Data Quality currentness evidence.

## State

Architecture packet prepared. Not Ready for Implementation.

This slice is intentionally backend-only and narrower than `CF-W1-MD-02`. It reuses existing Market Data session helpers and avoids schema/storage/provider scope.

## Owner / Lane / Modules

- Architecture owner: Team 03 Architecture Factory.
- Future implementation owner: Team 05 Market Data / Data Quality.
- Lane: Lane 1.
- Modules:
  - `market-data-foundation`
  - `data-quality-engine`

## Allowed Files After Ready Promotion

- `backend/src/modules/market-data-foundation/index.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.market-session.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- `backend/tests/modules/market-data-foundation/market-data.market-session.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts`

## Current Forbidden Files

- application source or tests before Team 00 promotion
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- Market Data repository/provider/scheduler/startup/backfill/worker/queue files
- Data Quality repository/controller/router/validation files
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- frontend files
- providers, live-market validation, paid/cloud, broker, or telemetry flows

## Required Behavior

Future implementation must:

- derive currentness from Market Data session evidence and latest completed trading date;
- expose additive currentness evidence and stable reason codes in DQ outputs;
- map stale/missing/blocked currentness into DQ blockers and non-ready tiers;
- preserve backward-compatible existing DQ route shapes other than additive DTO fields;
- avoid any durable-storage claim or provider-heavy behavior.

## QA Handoff Needed

Team 04 should prepare focused backend QA for:

- current completed-session evidence;
- current pre-finalization evidence;
- stale lagging evidence;
- missing latest-price evidence;
- session-unavailable evidence;
- provider-gap blocked evidence;
- strict tier/blocker propagation for downstream fail-closed use.

Suggested focused command after implementation exists:

```powershell
cd backend
npm.cmd test -- data-quality-engine.service.test.ts data-quality-engine.invariants.test.ts market-data.market-session.test.ts --runInBand
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- Prisma/schema/migration changes;
- Market Data repository/provider/startup/backfill changes;
- route changes;
- shared utility changes;
- durable-evidence or storage redesign beyond additive public session helper use;
- frontend/UI work;
- live-provider validation.

## Next Gate

Team 04 QA planning, then Team 00 sequencing. This is the strongest new upstream candidate for QA prep before downstream consumer packets.
