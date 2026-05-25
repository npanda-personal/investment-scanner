# CF-W3-MDPIPE-01C Work Packet

Date: 2026-05-25

## Work Item

Ledgered scheduled Data Quality stage after the committed pipeline ledger, status API, dashboard, and command API slices.

This packet covers only the first backend-only scheduled child:

- existing Market Data scheduler hook;
- additive Market Data summary change evidence;
- pipeline-ledger scheduled DQ stage;
- incremental Data Quality evaluation over the changed instrument set only.

This packet does not authorize:

- startup fanout into DQ;
- frontend/dashboard changes;
- new routes/endpoints;
- provider/live calls;
- full-universe DQ rescans;
- downstream fanout after DQ.

## State

Architecture Ready candidate for Team 04 QA planning.

Not Ready for Implementation until:

- Team 04 prepares the focused QA plan;
- Team 00 promotes the exact bounded Team 05 handoff;
- Team 00 reserves the allowed files for one implementation owner.

## Owner / Lane / Module

- Architecture owner: Team 03 - Solution Architect
- Future implementation owner: Team 05 - Market Data / Data Quality
- Lane: Lane 1
- Backend modules:
  - `market-data-foundation`
  - `pipeline-orchestration`
  - `data-quality-engine`

## Recommended Branch

```text
codex/w3-mdpipe-01c-data-quality-scheduled-stage
```

## Exact Allowed File Reservations After Team 00 Promotion

Backend source:

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.scheduler.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.types.ts`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.service.ts`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.md`
- `backend/src/modules/pipeline-orchestration/index.ts` only if the scheduled-stage types/functions must be exposed through the module public export
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- `backend/src/modules/data-quality-engine/index.ts` only if the scheduled-stage types/functions must be exposed through the module public export

Backend tests:

- `backend/tests/modules/market-data-foundation/market-data.scheduler.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
- `backend/tests/modules/pipeline-orchestration/pipeline-orchestration.service.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`

Docs after implementation:

- active execution-folder implementation evidence and owner outbox only.

## Exact Forbidden File Reservations

- `backend/src/server.ts`
- `backend/src/api/routes.ts`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated files
- package manifests and lockfiles
- all frontend files and frontend tests
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.controller.ts`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.router.ts`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.validation.ts`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.module.ts`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.repository.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.controller.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.router.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.validation.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.module.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.controller.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.router.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.module.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.provider.ts`
- all downstream module source/tests outside the exact allowed set
- auth/subscription/notification source
- shared backend utilities
- shared frontend components
- Docker/cloud/telemetry/broker files
- Team 08 B6 source/test files

## Required Backend Behavior

Implement only the following:

1. `MarketDataFoundationService.syncScheduledRegion(...)` returns additive internal DQ-driving evidence:
   - `dataThroughDate`
   - `sourceFingerprint`
   - `changedInstrumentIds`
   - `changedInstrumentCount`
   - `dqStageEligible`
2. `MarketDataFoundationScheduler.runOnce()` calls the scheduled DQ stage only for normal scheduled runs with a non-empty changed set.
3. `PipelineOrchestrationService` adds a scheduled DQ method that:
   - creates/reuses the scheduled run and `DATA_QUALITY` stage rows;
   - acquires a lease;
   - skips duplicate terminal work;
   - records progress and terminal counts;
   - releases the lease on terminal completion/failure.
4. `DataQualityEngineService` adds a scheduled-stage adapter for explicit `instrumentIds`.
5. The scheduled DQ adapter remains DB-only and incremental over the changed set.

Do not add:

- new API routes;
- new command catalog entries;
- new frontend polling or controls;
- startup DQ fanout;
- provider/live calls;
- downstream stage fanout.

## Required Incremental / Performance Behavior

The first child must stay honest about scale:

- process only the changed instrument ids from the current Market Data scheduler pass;
- never fall back to region-wide DQ scanning when the changed set is empty;
- prefer Market Data batch read helpers already exposed on the public service;
- treat per-instrument corporate-action reads as acceptable only because the changed set is bounded by the upstream Market Data scheduler batch size;
- persist one ledgered DQ stage per normalized scheduled input fingerprint.

## Required Tests

Focused backend tests:

- Market Data scheduled sync returns additive changed-set evidence only for inserted/updated instruments;
- scheduled scheduler pass invokes DQ once when the changed set is non-empty;
- startup path does not invoke scheduled DQ in this child;
- scheduled DQ stage creates/reuses ledger rows, acquires lease, records counts, and completes;
- duplicate scheduled fingerprint does not recompute DQ;
- held lease prevents double execution;
- no-op/empty changed set does not trigger full-scope DQ;
- manual `DATA_QUALITY_EVALUATE_SCOPE` command behavior remains unchanged.

Suggested commands after implementation:

```text
cd backend
npm.cmd test -- market-data.scheduler.test.ts market-data.service.test.ts pipeline-orchestration.service.test.ts data-quality-engine.service.test.ts --runInBand
npm.cmd run build
```

If any check is skipped, record the exact blocker, skipped command, risk, and next owner.

## Required QA Plan Inputs

Team 04 needs explicit scenarios for:

- scheduled change -> DQ runs;
- scheduled no-op -> DQ skips;
- startup run -> DQ does not fan out;
- duplicate fingerprint -> terminal duplicate;
- active lease -> safe non-duplicate behavior;
- ledger status rehydration after scheduled DQ completion;
- zero provider/live calls during DQ stage execution;
- no regression to B4 manual command API behavior.

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- `backend/src/server.ts` edits;
- route-registry edits;
- Prisma/schema/migrations/generated-file edits;
- frontend/dashboard/B6 edits;
- provider/live calls inside the scheduled DQ stage;
- widening into repository/shared-file/package scope;
- startup DQ fanout;
- downstream signal/calibration/context/backtest fanout;
- a second scheduler, worker queue, or cancellation framework.

## Handoff Requirements

Developer handoff must include:

- exact files changed;
- exact files inspected;
- proof that the scheduler path, not the command API, triggers the stage;
- proof that startup did not fan out into DQ;
- changed-set evidence and DQ adapter evidence;
- idempotency and lease evidence;
- tests run and skipped checks;
- confirmation that no provider/live, route, server, frontend, or downstream fanout behavior was added;
- known limitations and next recommended downstream stage boundary.

## Limitations To Preserve

- This does not add a ledgered Market Data stage row.
- This does not change the B4 manual command API contract.
- This does not make startup run DQ automatically.
- This does not trigger raw signals, calibration, context, strategy, backtesting, research, or Today Review.
- This does not change Prisma/schema/migrations, route registries, frontend files, packages, providers, or shared utilities.
