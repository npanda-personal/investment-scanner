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

Out of scope for this slice:

- route/API registration,
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

## Performance Contract

Downstream stages should use this ledger to stay incremental:

- skip when the stage idempotency key already has terminal current output,
- reuse cached DB projections when `cacheStatus=HIT` and `cacheExpiresAt` is still valid,
- process bounded batches using `batchSize`, `offset`, `nextOffset`, and `hasMore`,
- write counts and warnings so screens can show last run status without recomputing large datasets.

The ledger is the prerequisite for wiring automatic Data Quality and downstream stages safely.
