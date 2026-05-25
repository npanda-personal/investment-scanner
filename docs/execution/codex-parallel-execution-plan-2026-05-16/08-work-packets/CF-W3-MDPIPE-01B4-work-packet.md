# CF-W3-MDPIPE-01B4 Work Packet

Date: 2026-05-25

## Work Item

Pipeline Command API and first safe manual trigger for the Bulk Pipeline Monitoring and Ops dashboard.

This packet covers only the first command slice:

```text
DATA_QUALITY_EVALUATE_SCOPE
```

It does not authorize full pipeline execution, market-data provider ingestion, scheduler fanout, downstream publication, or removal of existing feature-page bulk controls.

## State

Architecture Ready candidate for Team 04 QA planning.

Not Ready for Implementation until:

- Team 04 prepares focused QA planning;
- Team 00 promotes the exact bounded handoff;
- Team 00 reserves the allowed files for one implementation owner.

## Owner / Lane / Module

- Architecture owner: Team 03 - Solution Architect
- Future implementation owner: Team 05 - Market Data / Data Quality, or Team 00-assigned fullstack owner for the pipeline module
- Lane: Lane 1 with frontend Pipeline Ops UI touch
- Backend module: `pipeline-orchestration`
- Frontend feature: `pipeline-ops`

## Recommended Branch

```text
codex/w3-mdpipe-01b4-pipeline-command-api
```

## Exact Allowed File Reservations After Team 00 Promotion

Backend:

- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.types.ts`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.validation.ts`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.service.ts`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.controller.ts`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.router.ts`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.module.ts` only if dependency injection is required
- `backend/src/modules/pipeline-orchestration/index.ts` only if new public command types/functions must be exported
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.md`
- `backend/tests/modules/pipeline-orchestration/pipeline-orchestration.validation.test.ts`
- `backend/tests/modules/pipeline-orchestration/pipeline-orchestration.service.test.ts`
- `backend/tests/modules/pipeline-orchestration/pipeline-orchestration.controller.test.ts`
- `backend/tests/modules/pipeline-orchestration/pipeline-orchestration.routes.test.ts`

Frontend:

- `frontend/src/features/pipeline-ops/types.ts`
- `frontend/src/features/pipeline-ops/api/pipelineOpsService.ts`
- `frontend/src/features/pipeline-ops/hooks/usePipelineStatus.ts` only if command completion needs an existing refresh hook adjustment
- `frontend/src/features/pipeline-ops/components/PipelineOpsPage.tsx`
- `frontend/src/features/pipeline-ops/components/PipelineOpsTable.tsx`
- `frontend/tests/ui/pipeline-ops.spec.ts`

Docs after implementation:

- active execution-folder implementation evidence and owner outbox only.

## Exact Forbidden File Reservations

- `backend/src/api/routes.ts`
- `backend/src/server.ts`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated files
- package manifests and lockfiles
- `backend/src/modules/market-data-foundation/**`
- `backend/tests/modules/market-data-foundation/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/tests/modules/data-quality-engine/**`
- all downstream module source/tests outside `pipeline-orchestration`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- existing feature pages outside `frontend/src/features/pipeline-ops/**`
- shared frontend components
- shared backend utilities
- auth/subscription source
- scheduler/startup/backfill files
- provider/live data behavior
- Docker/cloud/telemetry/broker files
- root `AGENTS.md`
- `docs/AGENTS.md`
- `docs/codex-agent-team-plan/**`

## Required Backend Behavior

Implement inside `pipeline-orchestration`:

- `GET /api/v1/pipeline/commands/catalog`
- `POST /api/v1/pipeline/commands`
- command catalog with exactly one enabled command, `DATA_QUALITY_EVALUATE_SCOPE`
- command validation for `commandKey`, `region`, `assetType`, `timeframe`, `pipelineKey`, `runMode`, `batchSize`, `offset`, and `idempotencyKey`
- blocked/deferred command responses for every other stage catalog row
- one-batch-only execution
- command idempotency key using client idempotency key plus normalized command payload
- run/stage ledger creation with `triggerType = manual`
- stage lease acquisition before adapter execution
- no duplicate adapter execution on retry with the same idempotency key
- terminal stage completion with counts, warnings, errors, `nextOffset`, and `hasMore`
- failed terminal status and lease release when the adapter throws

The only adapter allowed in this slice:

```ts
DataQualityEngineService.evaluate({
  region,
  assetType,
  batchSize,
  offset,
})
```

Use the Data Quality public module export only. Do not edit Data Quality source or import its repository.

## Required Frontend Behavior

Implement inside `pipeline-ops`:

- load command catalog separately from pipeline status;
- enable only the Data Quality manual command when catalog marks it `ENABLED`;
- keep all other trigger buttons disabled with the catalog reason;
- generate a fresh client idempotency key for each manual click;
- post `DATA_QUALITY_EVALUATE_SCOPE` with current `region` and `assetType`;
- refresh status after command response;
- show command errors without changing status rendering into a command trigger;
- keep existing feature-page bulk controls untouched.

## Required Tests

Backend focused tests:

- catalog returns Data Quality enabled and all other commands deferred/forbidden;
- validation rejects unknown command, missing idempotency key, bad batch size, bad offset, `runMode` other than `single_batch`, and `force=true`;
- blocked/deferred commands return `422` and do not create ledger rows;
- Data Quality command creates or reuses one run/stage, acquires lease, invokes the DQ adapter once, records counts, and completes;
- duplicate request with same idempotency key does not invoke the adapter twice;
- held lease returns `409`;
- adapter failure records failed terminal status and clears lease.

Frontend UI smoke:

- Pipeline Ops still loads status rows;
- Data Quality row has an enabled manual trigger when catalog allows it;
- non-Data Quality rows remain disabled with reasons;
- clicking Data Quality trigger posts once and refreshes status;
- page refresh/status polling does not post commands.

Suggested commands after implementation:

```text
cd backend
npm.cmd test -- pipeline-orchestration.validation.test.ts pipeline-orchestration.service.test.ts pipeline-orchestration.controller.test.ts pipeline-orchestration.routes.test.ts --runInBand
npm.cmd run build
```

```text
cd frontend
npm.cmd run build
npm.cmd run test:ui -- pipeline-ops.spec.ts --workers=1
```

If UI testing is blocked, record the exact blocker, skipped command, risk, and next owner.

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- enabling any command other than `DATA_QUALITY_EVALUATE_SCOPE`;
- processing more than one batch per command request;
- removing or modifying existing feature-page bulk controls;
- editing `backend/src/api/routes.ts`;
- editing Prisma/schema/migrations/generated files;
- editing package manifests;
- editing Market Data or Data Quality source/tests;
- editing downstream module source/tests;
- adding scheduler fanout, workers, queues, startup runs, backfill orchestration, or provider/live calls;
- adding user-owned command behavior without a separate fail-closed auth gate;
- adding investment-recommendation, broker, paid/cloud, telemetry, or external analytics behavior.

## Handoff Requirements

Developer handoff must include:

- exact files changed;
- exact files inspected;
- command matrix implemented;
- Data Quality adapter call evidence;
- idempotency behavior evidence;
- lease-held behavior evidence;
- duplicate-click/retry behavior evidence;
- tests run and skipped checks;
- UI smoke result or blocker;
- confirmation that existing feature-page bulk controls were not removed;
- confirmation that no provider/live/scheduler/downstream fanout behavior was added;
- known limitations and next recommended command adapter.

## Limitations To Preserve

- This does not replace existing feature-page bulk controls.
- This does not run all Data Quality batches automatically.
- This does not trigger Signal Generation, Calibration, Signal Quality, Strategy, Backtesting, Research, or Today Review.
- This does not start Market Data ingestion, catalog sync, or price backfill.
- This does not add background workers or cancellation.
- This does not add schema, package, generated, route-registry, auth, or subscription changes.
