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
- downstream fanout beyond `DATA_QUALITY`.
