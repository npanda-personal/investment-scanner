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

Terminal stage progress is outcome-based. For `COMPLETED`, `PARTIAL`, `FAILED`, `SKIPPED`, `BLOCKED`, or `CANCELED` rows, skipped and failed rows are counted as completed outcomes for progress display and ledger `processedCount` where the adapter reports them separately. This prevents a finished partial stage from appearing stuck below 100% when the remaining rows were intentionally skipped or blocked by missing upstream evidence.

Non-terminal `MARKET_DATA` snapshots renew a local stage lease and persist their supplied `startedAt`. If a client disconnects while `PIPELINE_RUN_ALL` is still running, the server can still complete the ledger row. If the server-side work is interrupted, the stale `MARKET_DATA` stage stops appearing as healthy active progress after its lease expires, and a later `PIPELINE_RUN_ALL` can retry instead of being blocked by an abandoned zero-progress row.

Scheduled `RAW_SIGNALS` and `SIGNAL_CALIBRATION` stages process explicit downstream instrument sets in bounded chunks and persist progress after each chunk. A terminal scheduled stage means the configured changed/downstream set was processed, not that a full-market manual sweep was performed. Pipeline Ops surfaces this execution scope and cursor metadata so users can distinguish incremental pipeline work from feature-owned full-scope manual actions.

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

- executable commands are explicitly allowlisted in the command catalog;
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
- `MarketContextIntelligenceService.refreshSectorSnapshots({ region, assetType, dataThroughDate })` for `SECTOR_INTELLIGENCE_REFRESH`.
- `MarketPulseSnapshotService.refreshSnapshot({ region, assetType, timeframe, pipelineRunId })` for `MARKET_PULSE_REFRESH`.

`MARKET_PULSE_REFRESH` is a DB-only materialization command. It reads persisted price, index, sector index, delivery, stock-universe, and source-import rows; it does not call market-data ingestion, backfill, repair, external providers, signal generation, or frontend code. The stage writes a single `MARKET_PULSE` ledger row and upserts one `MarketPulseSnapshot` for the current snapshot date and scope.

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

- caller: `MarketDataFoundationScheduler.runOnce()` or terminal Market Data ledger snapshots that include changed instrument ids;
- trigger type: `scheduled`;
- scope: `region + assetType + timeframe(1d) + pipelineKey(market-intelligence)`;
- input set: explicit changed instrument ids from the same scheduled Market Data pass or terminal price-backfill ledger snapshot;
- idempotency key: deterministic key over scope, data-through date, source fingerprint, changed-set fingerprint, and stage version;
- lease behavior: terminal duplicate returns `DUPLICATE_TERMINAL`, active lease returns `LEASE_HELD`, and no duplicate execution is allowed;
- execution: DB-only Data Quality adapter over explicit instrument ids in bounded chunks;
- progress: chunk-level `processedCount`, outcome counts, warnings/errors, cursor fields, and lease renewal are persisted when the adapter reports progress;
- completion: stage/run terminal counts and progress persisted with lease cleared on completion/failure.

Out of scope in this slice:

- command/API-triggered scheduled stage execution;
- broad downstream fanout beyond the explicitly documented scheduler-only stages.

## Scheduled Raw Signals Stage

The scheduler path now continues from terminal scheduled `DATA_QUALITY` success into a ledgered `RAW_SIGNALS` stage.

Rules:

- caller: `PipelineOrchestrationService.runScheduledDataQualityStage()` after scheduled DQ completes with `COMPLETED`;
- trigger type: `scheduled`;
- input set: the same sorted, unique changed instrument ids from the current scheduled Market Data pass;
- adapter: `SignalGenerationEngineService.run()` with explicit `instrumentIds`, `useDataQualityFilter=true`, `missingQualityBehavior=WARN_AND_PROCESS` (instruments lacking a persisted eligibility row are included but not marked READY/trusted), `skipUnusable=true`, `includeLimited=false`, and `providerThrottleMs=0`;
- partial DQ completion does not fan out because the DQ response does not yet expose the exact successfully evaluated instrument subset;
- idempotency key: deterministic key over scope, data-through date, upstream DQ output fingerprint, changed-set fingerprint, and raw-signals stage version;
- manual Pipeline Ops `RAW_SIGNALS_GENERATE_SCOPE` remains deferred; this change does not make raw signal generation a manual command;
- on terminal `COMPLETED`, the stage fans out to scheduled Signal Calibration for the same changed instrument set;
- no provider/live fetches, route changes, frontend changes, schema changes, or broad downstream fanout beyond the documented scheduler-only chain are introduced by this bridge.

This stage lets Pipeline Ops show Raw Signals progress after scheduled DQ without asking users to press the Signal Generation page run button.

## Scheduled Signal Calibration Stage

The scheduler path now continues from terminal scheduled `RAW_SIGNALS` success, or partial success with persisted raw-signal output, into a ledgered `SIGNAL_CALIBRATION` stage.

Rules:

- caller: `PipelineOrchestrationService.runScheduledRawSignalsStage()` after scheduled Raw Signals completes with `COMPLETED`, or `PARTIAL` with at least one successful generated/updated/no-op raw-signal output;
- trigger type: `scheduled`;
- input set: the same sorted, unique changed instrument ids from the current scheduled Market Data pass;
- adapter: `SignalCalibrationEngineService.run()` with explicit `instrumentIds`, scope, `batchSize`, and `offset=0`;
- calibration reads latest persisted raw signals only for the explicit instruments; it does not generate raw signals, paginate the full region, or call providers;
- missing persisted raw signal rows are counted as skipped evidence, so the stage cannot report clean success for unresolved inputs;
- Raw Signals states with no successful persisted output (`FAILED`, `SKIPPED`, `LEASE_HELD`, `DUPLICATE_TERMINAL`, and zero-success `PARTIAL`) do not fan out into calibration;
- idempotency key: deterministic key over scope, data-through date, upstream Raw Signals output fingerprint, changed-set fingerprint, and Signal Calibration stage version;
- manual Pipeline Ops `SIGNAL_CALIBRATION_REFRESH_SCOPE` remains deferred; this change does not make calibration refresh a manual command;
- terminal calibration progress counts missing raw-signal inputs as skipped outcomes, so a partial calibration run with all inputs resolved does not remain visually stuck below 100%;
- calibration `PARTIAL` with successful persisted output continues to scheduled Market Context; zero-success partial/failed/skipped calibration still stops the affected downstream branch;
- no route changes, frontend changes, schema changes, package changes, provider/live calls, startup/backfill changes, or downstream fanout beyond Signal Calibration are introduced by this stage.

This stage lets Pipeline Ops show calibration progress after scheduled Raw Signals while keeping the first automated chain DB-only and incremental.

## Scheduled Downstream Research Chain

After scheduled `SIGNAL_CALIBRATION` completes, the scheduler-only chain now continues through the research-support stages that can run from local persisted data:

1. `MARKET_CONTEXT`
2. `SMART_MONEY`
3. `CONTEXT_SNAPSHOTS`
4. `SIGNAL_QUALITY`
5. `STRATEGY_DECISION`
6. `RESEARCH_PROJECTION`
7. `TODAY_REVIEW`
8. `SIGNAL_POSITION_LEDGER`
9. `SECTOR_INTELLIGENCE_REFRESH`

Rules:

- each stage writes its own `PipelineRun` and `PipelineStageRun` rows with deterministic idempotency keys, leases, counts, warnings, errors, input fingerprints, and output fingerprints;
- each stage receives the same explicit changed instrument ids from the upstream scheduled Market Data pass when the adapter supports instrument-scoped work;
- scheduled downstream stages are incremental changed-set refreshes, while manual module buttons may intentionally drain a larger or full scoped universe;
- changed-set stages must drain all supplied changed instrument ids across internal pages before reporting terminal status;
- instrument progress counts (`totalCount`, `processedCount`, `succeededCount`, `failedCount`, `skippedCount`) describe changed instruments, not generated records;
- generated output counts, such as smart-money range snapshots, context snapshot records, strategy decisions, and Today Review candidate counts, are written to metadata so Pipeline Ops does not imply full-universe parity or fake 100% progress;
- `SMART_MONEY` uses explicit instrument ids and local price/volume data only, draining the changed set across batches;
- `CONTEXT_SNAPSHOTS` uses explicit instrument ids, latest persisted Market Context, and latest persisted Smart Money snapshots in the scheduled path, avoiding provider fallback work and draining the changed set across batches;
- `SIGNAL_QUALITY` refreshes bounded diagnostics for supplied changed instruments using persisted raw signals and local price history;
- `STRATEGY_DECISION` evaluates all explicit changed instrument ids and consumes persisted calibration, data quality, smart-money, market context, and local price windows;
- `RESEARCH_PROJECTION` runs the Research Hub overview as a projection/evidence stage;
- `TODAY_REVIEW` publishes the daily review with compatibility risk-snapshot generation disabled for the scheduled path;
- `SECTOR_INTELLIGENCE_REFRESH` writes persisted `SectorSnapshot` rows from saved sector index catalog rows, `PriceTick`, and `LatestPrice` only;
- non-completed upstream states stop only the affected downstream branch unless the stage explicitly allows partial evidence to continue;
- manual commands for these stages remain `DEFERRED` or `FORBIDDEN` until separate command contracts approve safe user-triggered execution.

Backtesting proof and legacy risk/plan generation are not scheduled in this chain. Backtesting needs a separate bounded strategy/timeframe/universe contract before it can run automatically, and legacy risk/plan generation conflicts with the current Trusted Signal Candidate direction unless reframed into signal health evidence.

## Market Data Stage Visibility

The Pipeline Ops dashboard reads `PipelineRun` and `PipelineStageRun`; Market Data workflows that only update module-local run state are not visible there unless they mirror progress into the ledger.

Current Market Data bridge:

- startup/manual price backfill writes a `MARKET_DATA` stage snapshot while its module-owned backfill run is active;
- the bridge records progress, counts, warnings, errors, and terminal status using the existing pipeline ledger;
- terminal `COMPLETED` or `PARTIAL` price-backfill snapshots with changed instrument ids start scheduled Data Quality for that explicit changed set, then the normal DB-only downstream chain can continue;
- Pipeline Ops exposes `Run Daily Pipeline`, which runs Market Data first and then starts the downstream scheduled chain for the resulting instrument set;
- `PIPELINE_RUN_ALL` supports explicit run modes: `full_latest_trading_date` for the user-facing manual button, `incremental_changed_only` for changed-set automation, and legacy `single_batch` as a compatibility alias for the full daily path;
- the full daily path treats valid no-op or duplicate-current exchange-file rows as downstream-eligible so Data Quality and read models can refresh even when Market Data rows were already current;
- the full daily path also treats expected current exchange-file unavailability as warning-only when Market Data supplies a latest valid `dataThroughDate`; it records `NOT_AVAILABLE` evidence and continues DB-only downstream refresh from that persisted date;
- if the Market Data summary has no explicit downstream set in full daily mode, Pipeline Orchestration asks Market Data Foundation for DB-only persisted eligibility for the same `dataThroughDate`, preferring `LatestPrice` rows and then `PriceTick` rows; incremental mode does not use this fallback;
- downstream exceptions are recorded as failed child-stage responses and make the daily Market Data command `PARTIAL` instead of disappearing as `null`;
- paged scheduled adapters persist in-progress counts after each page/chunk where the module exposes page-level progress;
- if a server shutdown leaves Market Data in `PENDING`, the next startup/manual run retries from Market Data first instead of jumping to downstream stages;
- if Market Data is already current but downstream did not finish, startup/manual catch-up can relaunch the downstream chain for the last terminal Market Data summary;
- it does not change provider calls, scheduler decisions, or Pipeline Ops command permissions.

Performance guard:

- the latest-candle scheduler wakes daily by default and also runs startup catch-up when the server comes online;
- startup price backfill is incremental-latest-only, so historical/deep backfill can continue as explicit maintenance without making the primary automated pipeline appear stuck for hours.

`MARKET_DATA_INCREMENTAL_EOD_LOAD`, `MARKET_DATA_PRICE_BACKFILL`, and `MARKET_DATA_CATALOG_SYNC` remain command-policy `FORBIDDEN`; Pipeline Ops uses the safer `PIPELINE_RUN_ALL` command so Market Data and dependent DB-only stages execute in the approved order.
