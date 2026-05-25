# CF-W3-MDPIPE-01B4 - Pipeline Command API Architecture

Date: 2026-05-25

Architect: Team 03 - Solution Architect

Status: Architecture Ready candidate for QA planning. Not Ready for Implementation until Team 04 QA planning and Team 00 promotion.

## Current State Evidence

Inspected current commits and source:

- `e537f9e feat: add durable pipeline ledger`
- `10719fa feat: add read-only pipeline status api`
- `cb45735 feat: add pipeline ops dashboard`
- `backend/src/modules/pipeline-orchestration/**`
- `frontend/src/features/pipeline-ops/**`
- existing batch-capable Data Quality, Signal Generation, Signal Calibration, Signal Quality, Smart Money, Strategy Decision, Market Context, Historical Context, Backtesting, Market Data, and Today Review routes/services at read-only/source-inspection level.

Current facts:

- `GET /api/v1/pipeline/status` is read-only and already registered through `pipelineOrchestrationRouter`.
- `/pipeline-ops` renders a fixed stage catalog and disabled `Trigger` buttons.
- Existing feature-page bulk controls still exist and must not be removed until an approved command API replaces the relevant capability safely.
- The durable ledger already supports scoped runs, stage rows, idempotency keys, stage leases, counts, offsets, `hasMore`, warnings, errors, cache fields, and timestamps.

## Architecture Decision

Add a stage-scoped Pipeline Command API inside the existing `pipeline-orchestration` module.

The first implementation slice must enable only one executable manual command:

- `DATA_QUALITY_EVALUATE_SCOPE`, mapped to stage `DATA_QUALITY`, one bounded batch per request.

All other dashboard stage buttons remain disabled or blocked by a backend command catalog until a later adapter-specific architecture gate approves them.

This is intentionally not a full pipeline runner, scheduler fanout, background queue, market-data provider trigger, or downstream publication workflow.

## Why This Boundary

The Data Quality evaluation stage is the safest first command because:

- it is upstream in the dependency chain;
- it already has a bounded `batchSize` and `offset` API shape;
- it can run from local persisted market data;
- it does not require Prisma/schema changes;
- it does not require package changes;
- it does not require route registry changes because the pipeline router is already registered;
- it creates no investment-recommendation, broker, paid, cloud, or telemetry behavior.

The first slice proves the command pattern, ledger wrapping, idempotency, lease behavior, and UI enablement without opening broad downstream execution.

## Backend Boundary

`pipeline-orchestration` owns:

- command catalog allowlist and blocked reasons;
- request validation and scope normalization;
- command idempotency key normalization;
- run/stage ledger wrapping;
- stage lease acquisition and release;
- command response DTO;
- adapter invocation for the single approved first command;
- mapping adapter counts into `PipelineStageRun` progress and terminal status.

`data-quality-engine` owns:

- actual Data Quality evaluation logic;
- evaluation response semantics;
- readiness scoring and persistence.

The command API may consume `DataQualityEngineService` from the module public export. It must not import Data Quality repositories directly.

## API Surface

Add these routes inside `pipeline-orchestration.router.ts`:

- `GET /api/v1/pipeline/commands/catalog`
- `POST /api/v1/pipeline/commands`

Do not edit `backend/src/api/routes.ts` for this slice.

`GET /pipeline/commands/catalog` is read-only. It returns the command matrix for the requested scope and must not acquire leases, mutate ledger rows, call providers, run adapters, or recompute downstream data.

`POST /pipeline/commands` executes at most one approved stage batch. The first executable command is `DATA_QUALITY_EVALUATE_SCOPE`.

## Command Lifecycle

1. Parse and normalize `region`, `assetType`, `timeframe`, `pipelineKey`, `commandKey`, `batchSize`, `offset`, `runMode`, and `idempotencyKey`.
2. Reject unknown or blocked commands before creating ledger rows.
3. Reject `runMode` values other than `single_batch` for the first slice.
4. Reject `batchSize` outside `1..100`; default is `25`.
5. Reject `force`, terminal retry, whole-pipeline run, drain-all, cancel, scheduler, and provider/live command modes.
6. Build a command idempotency key from command key, scope, normalized batch payload, and client idempotency key.
7. Create or reuse one `PipelineRun` with `triggerType = manual`.
8. Create or reuse one `PipelineStageRun` for the mapped stage.
9. Acquire a stage lease with `allowTerminalRetry = false`.
10. If lease is held or stage is terminal for the same idempotency key, return the ledger-backed outcome without duplicate execution.
11. Execute the approved stage adapter for one batch only.
12. Persist progress and terminal stage status.
13. Complete the pipeline run for this command batch.
14. Return command result and status URL so the UI can refresh `GET /api/v1/pipeline/status`.

## Idempotency Rules

The command endpoint must require a client-supplied `idempotencyKey` for executable commands. The frontend can generate it with `crypto.randomUUID()` per user click.

Server-side command idempotency key format:

```text
pipeline-ledger-v1:manual-command:{commandKey}:{region}:{assetType}:{timeframe}:{pipelineKey}:{offset}:{batchSize}:{clientIdempotencyKey}
```

Rules:

- Retrying the same request with the same `idempotencyKey` must not run the adapter twice.
- Intentionally running another batch or rerunning the same batch requires a new `idempotencyKey`.
- Terminal retry is forbidden in this slice.
- `force=true` is forbidden in this slice.
- The idempotency key must not contain user-entered reason text.
- Do not derive idempotency from wall-clock time only.

## Lease Behavior

Use the existing `PipelineStageRun` lease fields:

- lease owner format: `manual-command:{commandKey}:{process-local-id}`
- default lease: `600000` ms
- maximum lease: `1800000` ms
- `allowTerminalRetry = false`

Rules:

- Acquire the lease before invoking the adapter.
- If another active lease exists, return a lease-held response and do not execute.
- Complete or fail the stage in a `finally`/error-safe path so the lease is cleared on terminal outcomes.
- If the Node process dies, the lease expires naturally and a later command may claim the same non-terminal stage.
- Do not add an external queue, worker process, cron job, or scheduler fanout in this slice.

## Command Safety Matrix

| Stage key | Command key | First-slice state | Reason |
| --- | --- | --- | --- |
| `DATA_QUALITY` | `DATA_QUALITY_EVALUATE_SCOPE` | Enabled | Local DB-backed, batch-safe, upstream readiness stage. |
| `MARKET_DATA` | `MARKET_DATA_INCREMENTAL_EOD_LOAD` | Forbidden | May call market-data providers/live ingestion; needs separate provider and scheduler approval. |
| `MARKET_DATA` | `MARKET_DATA_PRICE_BACKFILL` | Forbidden | Existing background run behavior is separate and provider-sensitive. |
| `MARKET_DATA` | `MARKET_DATA_CATALOG_SYNC` | Forbidden | Existing catalog sync/background behavior needs separate migration plan. |
| `RAW_SIGNALS` | `RAW_SIGNALS_GENERATE_SCOPE` | Deferred | Potentially safe later, but must first prove DQ gate, adapter counts, and no broad downstream cascade. |
| `SIGNAL_CALIBRATION` | `SIGNAL_CALIBRATION_REFRESH_SCOPE` | Deferred | Needs adapter-specific QA and no implicit raw-signal generation. |
| `SIGNAL_QUALITY` | `SIGNAL_QUALITY_DIAGNOSTICS_REFRESH` | Deferred | Needs adapter-specific QA and historical-price cost bounds. |
| `CONTEXT_SNAPSHOTS` | `CONTEXT_SNAPSHOTS_GENERATE_SCOPE` | Deferred | Needs snapshot-date, limit, and source freshness contract. |
| `MARKET_CONTEXT` | `MARKET_CONTEXT_REFRESH_REGION` | Deferred | Existing command is region-oriented; scope and counts need adapter contract. |
| `SMART_MONEY` | `SMART_MONEY_REFRESH_SCOPE` | Deferred | Needs adapter-specific local price read bounds and count mapping. |
| `STRATEGY_DECISION` | `STRATEGY_DECISION_EVALUATE_SCOPE` | Deferred | Downstream decision generation must be separately gated by DQ/current signal evidence. |
| `BACKTEST_PROOF` | `BACKTEST_PROOF_REFRESH` | Forbidden | Strategy/backtest proof execution is expensive and strategy-specific. |
| `RESEARCH_PROJECTION` | `RESEARCH_PROJECTION_REFRESH` | Forbidden | No approved write contract for this pipeline stage yet. |
| `TODAY_REVIEW` | `TODAY_REVIEW_PUBLISH` | Forbidden | Publication-style downstream workflow; needs separate Product/architecture/QA gate. |
| `PIPELINE` | `PIPELINE_RUN_ALL` | Forbidden | Broad downstream fanout is explicitly out of scope. |
| `PIPELINE` | `PIPELINE_DRAIN_ALL_BATCHES` | Forbidden | First slice allows one batch per request only. |
| `PIPELINE` | `PIPELINE_CANCEL_ACTIVE` | Forbidden | No background worker cancellation contract exists yet. |

## Auth And User Assumptions

This first slice operates on global/local pipeline data, not user-owned portfolio, watchlist, alert, subscription, or broker state.

Rules:

- Keep `GET /api/v1/pipeline/status` read-only behavior unchanged.
- For `POST /api/v1/pipeline/commands`, use existing auth context opportunistically through public auth middleware only if the implementation can do so without changing auth source.
- Record `requestedByUserId` in command metadata when `req.user.id` exists.
- If no auth user exists in localhost mode, record `requestedByUserId = local-manual-operator` in metadata rather than fabricating ownership.
- Do not add subscription gates.
- Any future command touching user-owned rows must be a separate gate and must require fail-closed authenticated user context.

## UI Rules

The Pipeline Ops dashboard may enable only command buttons returned as `ENABLED` by the backend catalog.

Rules:

- Status rendering continues to use `GET /api/v1/pipeline/status`.
- Status rendering must not call command endpoints, providers, scheduler paths, or downstream adapters.
- Manual command clicks call `POST /api/v1/pipeline/commands` only.
- After a command response, the UI refreshes `GET /api/v1/pipeline/status`.
- Existing feature-page bulk controls must remain in place for this slice.
- Do not migrate or remove Data Quality page controls until a separate UX/control-migration packet is approved.
- Keep unsupported stage buttons disabled with backend-provided blocked/deferred reasons.

## File Reservation For First Implementation Slice

Allowed backend files:

- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.types.ts`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.validation.ts`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.service.ts`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.controller.ts`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.router.ts`
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.module.ts` only if dependency injection is required
- `backend/src/modules/pipeline-orchestration/index.ts` only for new public type/function exports
- `backend/src/modules/pipeline-orchestration/pipeline-orchestration.md`
- `backend/tests/modules/pipeline-orchestration/pipeline-orchestration.validation.test.ts`
- `backend/tests/modules/pipeline-orchestration/pipeline-orchestration.service.test.ts`
- `backend/tests/modules/pipeline-orchestration/pipeline-orchestration.controller.test.ts`
- `backend/tests/modules/pipeline-orchestration/pipeline-orchestration.routes.test.ts`

Allowed frontend files:

- `frontend/src/features/pipeline-ops/types.ts`
- `frontend/src/features/pipeline-ops/api/pipelineOpsService.ts`
- `frontend/src/features/pipeline-ops/hooks/usePipelineStatus.ts` only if shared refresh behavior must accept command-trigger refresh
- `frontend/src/features/pipeline-ops/components/PipelineOpsPage.tsx`
- `frontend/src/features/pipeline-ops/components/PipelineOpsTable.tsx`
- `frontend/tests/ui/pipeline-ops.spec.ts`

Allowed docs after Team 00 promotion:

- active execution-folder implementation evidence and outbox files only.

## Forbidden Files For First Implementation Slice

- `backend/src/api/routes.ts`
- `backend/src/server.ts`
- `backend/src/modules/market-data-foundation/**`
- `backend/tests/modules/market-data-foundation/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/tests/modules/data-quality-engine/**`
- all downstream module source/tests outside `pipeline-orchestration`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- all existing feature pages outside `pipeline-ops`
- shared frontend components
- shared backend utilities
- auth/subscription module source
- Prisma schema, migrations, generated files
- package manifests and lockfiles
- provider/live data behavior
- scheduler/startup/backfill behavior
- Docker/cloud/telemetry/broker files
- `docs/AGENTS.md`
- `docs/codex-agent-team-plan/**`

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- enabling any command other than `DATA_QUALITY_EVALUATE_SCOPE`;
- processing more than one batch per request;
- removing any existing feature-page bulk control;
- editing Data Quality source, Market Data source, or downstream module source;
- changing Prisma/schema/migrations/generated files;
- changing route registries or package manifests;
- adding scheduler fanout, workers, external queues, startup runs, or provider/live calls;
- adding user-owned command behavior without fail-closed auth;
- adding investment-recommendation, broker, paid/cloud, telemetry, or external analytics behavior.

## Architecture Verdict

Ready candidate for Team 04 QA planning and Team 00 Ready evaluation.

No Product Owner consent blocker was found because the first slice is local-first, free, no-schema, no-package, no-provider, no-scheduler, one-batch, and upstream-only.
