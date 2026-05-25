# CF-W3-MDPIPE-01C - Data Quality Scheduled Stage Architecture

Date: 2026-05-25

Architect: Team 03

Status: Architecture Ready candidate for Team 04 QA planning.

Not Ready for Implementation until:

- Team 04 prepares the focused QA plan for this exact slice;
- Team 00 promotes the bounded Team 05 handoff with single-writer reservations;
- Team 08 B6 work remains isolated from this backend-only slice.

## Architecture Verdict

`CF-W3-MDPIPE-01C` is a `Ready candidate`.

The next safe path is:

1. keep Data Quality scheduling inside the existing Market Data scheduler path;
2. create a ledgered scheduled Data Quality stage inside `pipeline-orchestration`;
3. drive that stage only from DB-local Market Data change evidence;
4. keep the first scheduled DQ slice backend-only, DB-only, incremental, and bounded;
5. keep startup fanout out of scope for the first slice.

No new Product Owner decision is required for the scheduler hook itself because the accepted parent requirement already targets automated backend freshness every 15 minutes. Startup fanout remains intentionally blocked in this first child and is therefore not a consent blocker for `01C`.

## Audited Current State

Read-only audit evidence:

- `backend/src/server.ts` starts `startMarketDataStartupLoads()` on server listen.
- `backend/src/modules/market-data-foundation/market-data-foundation.scheduler.ts` owns the only current 15-minute scheduler and optional startup run.
- `MarketDataFoundationScheduler.runOnce()` currently calls only `MarketDataFoundationService.syncScheduledRegion(...)`.
- `backend/src/modules/pipeline-orchestration/**` provides durable run/stage ledger, read-only status API, and the first bounded manual command API, but no scheduler hook.
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts` already supports bounded evaluation and persists DQ rows, but the existing public `evaluate()` path is still page/manual shaped around region/asset batches.
- `MarketDataFoundationService` already exposes DB-local batch read helpers such as `getInstrumentsByIds()`, `listRecentPriceWindowsByInstrumentIds()`, and `storedFundamentalsByInstrumentIds()`.

Important constraint from current code:

- `DataQualityUseCaseTiers.automation` still resolves to `BLOCKED` with `PHASE0_AUTOMATION_NOT_AUTHORIZED`.

That field must continue to block downstream automated trust usage. It does not block the DQ evaluation stage itself.

## Rejected Paths

### 1. Reuse the manual command API as the scheduler implementation

Rejected because it would:

- treat scheduled work as if it were a user command;
- inherit manual-command semantics that were intentionally one-batch-per-request;
- blur scheduler and manual-command evidence;
- encourage offset-zero retries instead of stage-owned incremental work.

### 2. Run full-scope `DataQualityEngineService.evaluate({ region, assetType, batchSize, offset })` after every Market Data scheduler pass

Rejected because it would:

- rescan the scoped universe instead of the actual changed set;
- ignore the durable ledger's input-fingerprint and skip potential;
- violate the intended DB-only/high-performance incremental direction for `01C`.

### 3. Expand server startup to run Data Quality automatically in the first child

Rejected for the first child because it widens startup behavior and is not required to prove the scheduled stage.

## Accepted Path

Implement `01C` as a backend-only scheduled child with three cooperating pieces.

### A. Market Data scheduler remains the caller

Use the existing `MarketDataFoundationScheduler.runOnce()` path as the only stage trigger for this slice.

Do not add:

- a second scheduler;
- a new server startup hook;
- a route/API trigger;
- a worker queue;
- provider/live fanout from Pipeline Ops.

### B. Market Data sync returns additive internal change evidence

`MarketDataFoundationService.syncScheduledRegion()` should add internal stage-driving evidence to its returned summary for the current run only:

- `dataThroughDate`
- `sourceFingerprint`
- `changedInstrumentIds`
- `changedInstrumentCount`
- `dqStageEligible`

This evidence is for scheduler-to-pipeline orchestration handoff only. It must not require route-registry changes or frontend changes.

The changed set must include only instruments whose Market Data sync produced inserted or updated price rows for the current scheduled pass. `rowsNoOp`, skipped, and already-current instruments must not be pushed into the DQ stage input set.

### C. Pipeline Orchestration owns the ledgered scheduled DQ stage

Add a scheduled-stage method to `PipelineOrchestrationService` that:

- accepts the additive Market Data summary evidence;
- creates or reuses a scheduled `PipelineRun`;
- creates or reuses the `DATA_QUALITY` `PipelineStageRun`;
- acquires a stage lease;
- skips duplicate terminal work by idempotency key;
- executes DQ only for the changed instrument set;
- records progress and terminal counts;
- releases the lease on terminal completion/failure.

The first `01C` child may create a pipeline run containing only the `DATA_QUALITY` stage. It does not need to backfill a `MARKET_DATA` stage row into the pipeline ledger in this slice.

## Scheduler And Startup Decision

### Scheduler behavior

Required for `01C`: yes.

Reason:

- without a scheduler hook, the slice would not be a true scheduled stage;
- the accepted parent requirement already expects backend freshness to run every 15 minutes.

### Startup behavior

Required for the first `01C` child: no.

Decision:

- keep startup-triggered DQ fanout disabled in this slice;
- if the existing Market Data startup path runs, it may still perform Market Data work, but it must not automatically fan out into scheduled DQ in `01C`.

Consent-blocker result:

- scheduler hook: not a true consent blocker for `01C`;
- startup fanout: intentionally excluded, so not a blocker for this child.

If implementation cannot isolate scheduled vs startup DQ behavior inside the reserved file set, stop and return to Team 03 instead of widening startup behavior silently.

## DB-Only / High-Performance / Incremental Rule

The first scheduled DQ stage must stay:

- DB-only;
- incremental by changed instrument set;
- bounded by the upstream Market Data scheduler batch;
- free of provider/live calls.

Required implementation shape:

1. `syncScheduledRegion()` computes `changedInstrumentIds` from the current Market Data batch only.
2. `PipelineOrchestrationService.runScheduledDataQualityStage(...)` skips immediately when `changedInstrumentCount === 0`.
3. `DataQualityEngineService` adds a scheduled-stage adapter for explicit `instrumentIds`.
4. That adapter uses Market Data public batch reads where already available:
   - `getInstrumentsByIds()`
   - `listRecentPriceWindowsByInstrumentIds()`
   - `storedFundamentalsByInstrumentIds()`
5. Per-instrument corporate-action reads may remain in the first child because the changed set is already bounded by the Market Data scheduler batch size.
6. No provider, HTTP, or frontend command path is allowed inside the scheduled DQ stage.

Why this remains high-performance enough for the first child:

- the upstream scheduled Market Data run is already bounded by `batchSize`;
- the DQ stage consumes only the changed subset from that bounded batch;
- the ledger can skip duplicate terminal work by fingerprint when the same Market Data evidence reappears.

## Idempotency And Fingerprint Direction

Use a scheduled DQ stage idempotency key shaped from:

```text
pipeline-ledger-v1:scheduled-dq:{region}:{assetType}:{timeframe}:{dataThroughDate}:{marketDataSourceFingerprint}:{changedInstrumentFingerprint}:{dqStageVersion}
```

Where:

- `marketDataSourceFingerprint` comes from the current scheduled Market Data pass;
- `changedInstrumentFingerprint` is deterministic over the sorted changed instrument ids;
- `dqStageVersion` is a stage-owned constant so future rule meaning changes do not silently reuse old terminal rows.

Terminal duplicate behavior must return the existing terminal row without recomputing DQ.

## Exact Future Team 05 File Reservations

Allowed backend source files:

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.scheduler.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.types.ts`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.service.ts`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.md`
- `backend/src/modules/pipeline-orchestration/index.ts` only if new scheduled-stage types must be exposed through the module public export
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- `backend/src/modules/data-quality-engine/index.ts` only if new scheduled-stage types must be exposed through the module public export

Allowed backend tests:

- `backend/tests/modules/market-data-foundation/market-data.scheduler.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
- `backend/tests/modules/pipeline-orchestration/pipeline-orchestration.service.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`

## Exact Forbidden Scope

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

If implementation pressure requires widening into repository/schema/route/server/shared-file scope, stop and return the slice to Team 03 / Team 00 for re-contracting.

## Required QA Plan Inputs

Team 04 must verify:

1. scheduled Market Data pass with `rowsInserted/rowsUpdated > 0` triggers exactly one ledgered DQ stage;
2. scheduled Market Data pass with `rowsInserted = 0` and `rowsUpdated = 0` does not run full-scope DQ;
3. startup Market Data path does not fan out into DQ in this child;
4. DQ stage uses only the changed instrument set from the current Market Data batch;
5. duplicate scheduled input fingerprint does not recompute DQ;
6. lease-held stage is skipped or blocked safely without double execution;
7. stage progress and terminal counts persist in the ledger;
8. no provider/live calls occur during the DQ stage;
9. status API still rehydrates the latest scheduled DQ stage correctly;
10. manual command API behavior for `DATA_QUALITY_EVALUATE_SCOPE` remains unchanged.

## Implementation Stop Conditions

Stop and return to Team 03 / Team 00 if the first child requires:

- server startup wiring in `backend/src/server.ts`;
- route-registry changes;
- Prisma/schema/migration changes;
- frontend/dashboard changes;
- provider/live calls from the scheduled DQ stage;
- full-universe DQ rescans on every scheduler tick;
- downstream signal/calibration/context/backtest fanout;
- broad worker/queue/cancellation infrastructure;
- edits to Team 08 B6 files.
