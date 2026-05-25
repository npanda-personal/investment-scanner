# Pipeline Orchestration

Durable run/stage ledger for the local market-intelligence pipeline.

This module owns persistence for pipeline run status, stage status, leases, idempotency keys, and cache/fingerprint metadata. It does not execute Market Data, Data Quality, Signal, Strategy, Backtesting, Research, or Today Review work by itself.

## Scope

Current slice:

- `PipelineRun` records one scoped pipeline attempt.
- `PipelineStageRun` records one scoped stage attempt inside a run.
- Stage leases support a single local worker claiming a stage without introducing an external queue.
- Mid-run progress updates persist counts, offsets, `hasMore`, and renewed lease expiry so UI progress can be rehydrated after navigation.
- Idempotency keys use pipeline/stage, region, asset type, timeframe, data-through date, and source/input fingerprint.
- Cache fields (`cacheKey`, `cacheStatus`, `cacheExpiresAt`, `inputFingerprint`, `outputFingerprint`) let later DB-backed stages avoid recomputing unchanged work.

Out of scope for the ledger foundation slice:

- scheduler fanout,
- startup or backfill behavior changes,
- downstream module execution,
- frontend display,
- external queues, providers, paid services, broker integration, or cloud services.

## Status Model

Run and stage statuses are string-backed for compatibility:

- `PENDING`
- `RUNNING`
- `COMPLETED`
- `PARTIAL`
- `FAILED`
- `SKIPPED`
- `BLOCKED`

UI surfaces should map `COMPLETED` to success, preserve `PARTIAL`, and show `FAILED`/`BLOCKED` distinctly.

## Progress Visibility Contract

Screen-local progress bars must not be the source of truth. Bulk operations should update their `PipelineStageRun` as each batch finishes, then UI screens can reload:

- `status`
- `startedAt`
- `completedAt`
- `processedCount`
- `totalCount`
- `succeededCount`
- `partialCount`
- `failedCount`
- `skippedCount`
- `nextOffset`
- `hasMore`
- `leaseExpiresAt`

This lets a user leave Market Data, Data Quality, Signal, Backtesting, Research, or Today Review screens and still see the active or latest pipeline progress when returning.

## Read-Only Status API

`GET /api/v1/pipeline/status`

The status API is read-only. It reads local ledger rows and returns active plus latest terminal run/stage progress for the requested scope.

Default query:

- `region=IN`
- `assetType=STOCK`
- `timeframe=1d`
- `pipelineKey=market-intelligence`
- `limit=25`

The endpoint must not call providers, run downstream stages, acquire leases, trigger scheduler work, or mutate ledger rows.

## Manual Command API (Bounded Slice)

First safe command slice adds:

- `GET /api/v1/pipeline/commands/catalog`
- `POST /api/v1/pipeline/commands`

Safety contract for this slice:

- only `DATA_QUALITY_EVALUATE_SCOPE` is executable;
- all other command rows are `DEFERRED` or `FORBIDDEN` with explicit reasons;
- command requests must use `runMode=single_batch`;
- `batchSize` must be `1..100` and `offset` must be non-negative;
- `force=true` is rejected;
- executable commands require a client `idempotencyKey`;
- same idempotency key must not invoke the adapter twice;
- stage lease is acquired before adapter execution and conflict returns `409`;
- stage and run rows are persisted with `triggerType=manual`;
- terminal stage completion/failure clears lease fields.

First executable adapter path:

- `DataQualityEngineService.evaluate({ region, assetType, batchSize, offset })`

Out of scope:

- scheduler fanout;
- provider/live ingestion from Pipeline Ops;
- downstream stage fanout;
- bulk drain or full pipeline run.

Ops UI direction:

- A later Bulk Pipeline Dashboard should own bulk operation monitoring and manual trigger controls.
- Individual feature screens should show compact backend-pipeline progress only, sourced from this API.

## Performance Contract

Downstream stages should use this ledger to stay incremental:

- skip when the stage idempotency key already has terminal current output,
- reuse cached DB projections when `cacheStatus=HIT` and `cacheExpiresAt` is still valid,
- process bounded batches using `batchSize`, `offset`, `nextOffset`, and `hasMore`,
- write counts and warnings so screens can show last run status without recomputing large datasets.

The ledger is the prerequisite for wiring automatic Data Quality and downstream stages safely.

## Scheduled Data Quality Stage (01C)

This slice adds a ledgered scheduled `DATA_QUALITY` stage adapter entrypoint:

- caller: `MarketDataFoundationScheduler.runOnce()` only;
- trigger type: `scheduled`;
- scope: `region + assetType + timeframe(1d) + pipelineKey(market-intelligence)`;
- input set: explicit changed instrument ids from the same scheduled Market Data pass;
- idempotency key: deterministic key over scope, data-through date, source fingerprint, changed-set fingerprint, and stage version;
- lease behavior: terminal duplicate returns `DUPLICATE_TERMINAL`, active lease returns `LEASE_HELD`, and no duplicate execution is allowed;
- execution: DB-only Data Quality adapter over explicit instrument ids;
- completion: stage/run terminal counts and progress persisted with lease cleared on completion/failure.

Out of scope in this slice:

- startup fanout into scheduled Data Quality;
- command/API-triggered scheduled stage execution;
- broad downstream fanout beyond the explicitly documented scheduler-only stages.

## Scheduled Raw Signals Stage

The scheduler path now continues from terminal scheduled `DATA_QUALITY` success into a ledgered `RAW_SIGNALS` stage.

Rules:

- caller: `PipelineOrchestrationService.runScheduledDataQualityStage()` after scheduled DQ completes with `COMPLETED`;
- trigger type: `scheduled`;
- input set: the same sorted, unique changed instrument ids from the current scheduled Market Data pass;
- adapter: `SignalGenerationEngineService.run()` with explicit `instrumentIds`, `useDataQualityFilter=true`, `missingQualityBehavior=SKIP`, `skipUnusable=true`, `includeLimited=false`, and `providerThrottleMs=0`;
- partial DQ completion does not fan out because the DQ response does not yet expose the exact successfully evaluated instrument subset;
- idempotency key: deterministic key over scope, data-through date, upstream DQ output fingerprint, changed-set fingerprint, and raw-signals stage version;
- manual Pipeline Ops `RAW_SIGNALS_GENERATE_SCOPE` remains deferred; this change does not make raw signal generation a manual command;
- on terminal `COMPLETED`, the stage fans out to scheduled Signal Calibration for the same changed instrument set;
- no provider/live fetches, route changes, frontend changes, schema changes, or broad downstream fanout beyond the documented scheduler-only chain are introduced by this bridge.

This stage lets Pipeline Ops show Raw Signals progress after scheduled DQ without asking users to press the Signal Generation page run button.

## Scheduled Signal Calibration Stage

The scheduler path now continues from terminal scheduled `RAW_SIGNALS` success into a ledgered `SIGNAL_CALIBRATION` stage.

Rules:

- caller: `PipelineOrchestrationService.runScheduledRawSignalsStage()` after scheduled Raw Signals completes with `COMPLETED`;
- trigger type: `scheduled`;
- input set: the same sorted, unique changed instrument ids from the current scheduled Market Data pass;
- adapter: `SignalCalibrationEngineService.run()` with explicit `instrumentIds`, scope, `batchSize`, and `offset=0`;
- calibration reads latest persisted raw signals only for the explicit instruments; it does not generate raw signals, paginate the full region, or call providers;
- missing persisted raw signal rows are counted as skipped evidence, so the stage cannot report clean success for unresolved inputs;
- non-completed Raw Signals states (`PARTIAL`, `FAILED`, `SKIPPED`, `LEASE_HELD`, `DUPLICATE_TERMINAL`) do not fan out into calibration;
- idempotency key: deterministic key over scope, data-through date, upstream Raw Signals output fingerprint, changed-set fingerprint, and Signal Calibration stage version;
- manual Pipeline Ops `SIGNAL_CALIBRATION_REFRESH_SCOPE` remains deferred; this change does not make calibration refresh a manual command;
- no route changes, frontend changes, schema changes, package changes, provider/live calls, startup/backfill changes, or downstream fanout beyond Signal Calibration are introduced by this stage.

This stage lets Pipeline Ops show calibration progress after scheduled Raw Signals while keeping the first automated chain DB-only and incremental.

## Market Data Stage Visibility

The Pipeline Ops dashboard reads `PipelineRun` and `PipelineStageRun`; Market Data workflows that only update module-local run state are not visible there unless they mirror progress into the ledger.

Current Market Data bridge:

- startup/manual price backfill writes a `MARKET_DATA` stage snapshot while its module-owned backfill run is active;
- the bridge records progress, counts, warnings, errors, and terminal status using the existing pipeline ledger;
- it does not enable Market Data manual commands from Pipeline Ops;
- it does not change provider calls, scheduler decisions, startup behavior, or downstream fanout.

`MARKET_DATA_INCREMENTAL_EOD_LOAD`, `MARKET_DATA_PRICE_BACKFILL`, and `MARKET_DATA_CATALOG_SYNC` remain command-policy `FORBIDDEN` until separate command contracts approve safe manual execution from Pipeline Ops.
