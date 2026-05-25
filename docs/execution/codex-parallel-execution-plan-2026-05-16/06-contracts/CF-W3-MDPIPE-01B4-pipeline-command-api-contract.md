# CF-W3-MDPIPE-01B4 Pipeline Command API Contract

Date: 2026-05-25

Owner: Team 03 - Solution Architect

Status: Contract Ready candidate for QA planning. Not Ready for Implementation until Team 04 QA planning and Team 00 promotion.

## Contract Intent

Provide a safe backend command contract for the Bulk Pipeline Monitoring and Ops dashboard without converting the dashboard into a scheduler, market-data provider launcher, or broad downstream execution surface.

The first executable command is only:

```text
DATA_QUALITY_EVALUATE_SCOPE
```

It runs one bounded Data Quality batch for the current market scope and records ledger evidence.

## Endpoints

### Catalog

```text
GET /api/v1/pipeline/commands/catalog
```

Query parameters:

- `region`: default `IN`
- `assetType`: default `STOCK`
- `timeframe`: default `1d`
- `pipelineKey`: default `market-intelligence`

Behavior:

- read-only;
- local DB/static policy only;
- no providers;
- no leases;
- no stage execution;
- no scheduler calls;
- no downstream recomputation.

### Execute

```text
POST /api/v1/pipeline/commands
```

Executes at most one allowed command batch.

## Catalog Response Shape

```ts
type PipelineCommandAvailability = 'ENABLED' | 'DEFERRED' | 'FORBIDDEN';

interface PipelineCommandCatalogResponse {
  scope: {
    region: string;
    assetType: string;
    timeframe: string;
    pipelineKey: string;
  };
  generatedAt: string;
  commands: PipelineCommandCatalogItem[];
}

interface PipelineCommandCatalogItem {
  commandKey: PipelineCommandKey;
  stageKey: string;
  moduleName: string;
  operationName: string;
  availability: PipelineCommandAvailability;
  disabledReason: string | null;
  runModes: Array<'single_batch'>;
  defaultBatchSize: number;
  maxBatchSize: number;
  providerAccess: 'NONE' | 'FORBIDDEN';
  schedulerAccess: 'NONE' | 'FORBIDDEN';
  downstreamFanout: 'NONE' | 'FORBIDDEN';
}
```

The catalog must include blocked/deferred rows so the UI can explain disabled buttons without hardcoding safety policy.

## Execute Request Shape

```ts
type PipelineCommandKey =
  | 'DATA_QUALITY_EVALUATE_SCOPE'
  | 'MARKET_DATA_INCREMENTAL_EOD_LOAD'
  | 'MARKET_DATA_PRICE_BACKFILL'
  | 'MARKET_DATA_CATALOG_SYNC'
  | 'RAW_SIGNALS_GENERATE_SCOPE'
  | 'SIGNAL_CALIBRATION_REFRESH_SCOPE'
  | 'SIGNAL_QUALITY_DIAGNOSTICS_REFRESH'
  | 'CONTEXT_SNAPSHOTS_GENERATE_SCOPE'
  | 'MARKET_CONTEXT_REFRESH_REGION'
  | 'SMART_MONEY_REFRESH_SCOPE'
  | 'STRATEGY_DECISION_EVALUATE_SCOPE'
  | 'BACKTEST_PROOF_REFRESH'
  | 'RESEARCH_PROJECTION_REFRESH'
  | 'TODAY_REVIEW_PUBLISH'
  | 'PIPELINE_RUN_ALL'
  | 'PIPELINE_DRAIN_ALL_BATCHES'
  | 'PIPELINE_CANCEL_ACTIVE';

interface PipelineCommandRequest {
  commandKey: PipelineCommandKey;
  region?: string;
  assetType?: string;
  timeframe?: string;
  pipelineKey?: string;
  runMode: 'single_batch';
  batchSize?: number;
  offset?: number;
  idempotencyKey: string;
  reason?: string;
  force?: false;
}
```

Validation rules:

- `idempotencyKey` is required for executable commands.
- `runMode` must be `single_batch`.
- `batchSize` defaults to `25`.
- `batchSize` must be an integer from `1` through `100`.
- `offset` defaults to `0` and must be a non-negative integer.
- `force` must be absent or `false`.
- `region` and `assetType` normalize to uppercase.
- `timeframe` normalizes to lowercase and defaults to `1d`.
- `pipelineKey` defaults to `market-intelligence`.
- unknown commands fail validation.
- blocked or deferred commands return a blocked response and must not create ledger rows.

## Execute Response Shape

```ts
type PipelineCommandResultStatus =
  | 'COMPLETED'
  | 'PARTIAL'
  | 'FAILED'
  | 'SKIPPED'
  | 'BLOCKED'
  | 'LEASE_HELD'
  | 'DUPLICATE_TERMINAL';

interface PipelineCommandResponse {
  commandId: string;
  commandKey: PipelineCommandKey;
  stageKey: string;
  status: PipelineCommandResultStatus;
  scope: {
    region: string;
    assetType: string;
    timeframe: string;
    pipelineKey: string;
  };
  runMode: 'single_batch';
  pipelineRunId: string | null;
  stageRunId: string | null;
  idempotencyKey: string;
  lease: {
    acquired: boolean;
    reason: 'ACQUIRED' | 'STAGE_NOT_FOUND' | 'LEASE_HELD' | 'STAGE_TERMINAL' | 'NOT_ATTEMPTED';
    leaseOwner: string | null;
    leaseExpiresAt: string | null;
  };
  batch: {
    batchSize: number;
    offset: number;
    nextOffset: number | null;
    hasMore: boolean;
  };
  counts: {
    totalCount: number;
    processedCount: number;
    succeededCount: number;
    partialCount: number;
    failedCount: number;
    skippedCount: number;
    unchangedCount: number;
  };
  warnings: string[];
  errors: string[];
  statusUrl: string;
  startedAt: string | null;
  completedAt: string | null;
}
```

## HTTP Status Rules

- `200 OK`: command executed, skipped, duplicate-terminal, or blocked by terminal idempotency.
- `400 Bad Request`: malformed payload.
- `409 Conflict`: active lease is held by another command for the same stage row.
- `422 Unprocessable Entity`: command is known but `DEFERRED` or `FORBIDDEN`.
- `500 Internal Server Error`: unexpected command API failure after ledger failure handling.

Provider/live and scheduler blocks should use `422`, not `500`.

## First Executable Command

### `DATA_QUALITY_EVALUATE_SCOPE`

Mapped stage:

```text
DATA_QUALITY
```

Adapter:

```ts
DataQualityEngineService.evaluate({
  region,
  assetType,
  batchSize,
  offset,
})
```

Adapter constraints:

- one batch per request;
- no provider calls;
- no Market Data source edits;
- no Data Quality source edits in this command slice;
- no downstream stage trigger after completion.

Count mapping:

| Pipeline count | Data Quality source |
| --- | --- |
| `totalCount` | `response.totalCount` |
| `processedCount` | `response.processedCount` |
| `succeededCount` | `response.evaluatedCount` |
| `failedCount` | `response.failedCount` |
| `skippedCount` | `response.skippedCount` |
| `partialCount` | `0` unless adapter exposes partial count later |
| `unchangedCount` | `0` |
| `nextOffset` | `response.nextOffset` |
| `hasMore` | `response.hasMore` |

Terminal status mapping:

- `SKIPPED`: `totalCount === 0`
- `FAILED`: adapter throws before a response is available
- `PARTIAL`: `failedCount > 0`
- `COMPLETED`: adapter returns with `failedCount === 0`

Warnings remain warnings and do not by themselves create financial or trading action language.

## Command Matrix

| Command key | Availability | Execution rule |
| --- | --- | --- |
| `DATA_QUALITY_EVALUATE_SCOPE` | `ENABLED` | Execute one bounded local Data Quality batch. |
| `MARKET_DATA_INCREMENTAL_EOD_LOAD` | `FORBIDDEN` | No provider/live ingestion from Pipeline Ops in this slice. |
| `MARKET_DATA_PRICE_BACKFILL` | `FORBIDDEN` | Existing background backfill remains feature-owned until separate gate. |
| `MARKET_DATA_CATALOG_SYNC` | `FORBIDDEN` | Existing catalog sync remains feature-owned until separate gate. |
| `RAW_SIGNALS_GENERATE_SCOPE` | `DEFERRED` | Needs separate DQ-gated adapter contract. |
| `SIGNAL_CALIBRATION_REFRESH_SCOPE` | `DEFERRED` | Needs separate adapter contract and no implicit raw-signal generation. |
| `SIGNAL_QUALITY_DIAGNOSTICS_REFRESH` | `DEFERRED` | Needs separate adapter cost and historical-price bounds. |
| `CONTEXT_SNAPSHOTS_GENERATE_SCOPE` | `DEFERRED` | Needs snapshot-date and source-freshness contract. |
| `MARKET_CONTEXT_REFRESH_REGION` | `DEFERRED` | Needs region/scope and count mapping contract. |
| `SMART_MONEY_REFRESH_SCOPE` | `DEFERRED` | Needs local-price read bounds and count mapping contract. |
| `STRATEGY_DECISION_EVALUATE_SCOPE` | `DEFERRED` | Needs downstream DQ/current signal guardrail contract. |
| `BACKTEST_PROOF_REFRESH` | `FORBIDDEN` | Backtesting proof execution is not a bulk pipeline command yet. |
| `RESEARCH_PROJECTION_REFRESH` | `FORBIDDEN` | No approved write command contract. |
| `TODAY_REVIEW_PUBLISH` | `FORBIDDEN` | Publication workflow requires separate Product/architecture/QA gate. |
| `PIPELINE_RUN_ALL` | `FORBIDDEN` | Broad fanout is out of scope. |
| `PIPELINE_DRAIN_ALL_BATCHES` | `FORBIDDEN` | First slice is one batch per request only. |
| `PIPELINE_CANCEL_ACTIVE` | `FORBIDDEN` | No worker cancellation contract exists. |

## Idempotency Contract

Executable requests must create a server idempotency key:

```text
pipeline-ledger-v1:manual-command:{commandKey}:{region}:{assetType}:{timeframe}:{pipelineKey}:{offset}:{batchSize}:{clientIdempotencyKey}
```

The key must be used for both the command stage idempotency and the run/stage metadata linkage.

Required behavior:

- Same request and same `idempotencyKey`: no duplicate adapter execution.
- Same request and new `idempotencyKey`: intentional new command.
- Same `idempotencyKey` with changed normalized payload: reject as invalid collision if detectable.
- Terminal rows are not retried.
- `force` and `allowTerminalRetry` are forbidden.

## Lease Contract

Use existing `PipelineStageRun` lease fields:

- acquire before adapter execution;
- release on terminal completion/failure;
- return `409` on held active lease;
- do not add external queues or workers;
- do not call scheduler/startup fanout.

Default lease:

```text
600000 ms
```

Maximum lease:

```text
1800000 ms
```

## UI Contract

The dashboard must:

- fetch command catalog separately from status;
- use catalog availability to enable or disable each row button;
- post only `DATA_QUALITY_EVALUATE_SCOPE` in the first slice;
- generate a fresh `idempotencyKey` per user click;
- refresh `GET /api/v1/pipeline/status` after command response;
- keep existing feature-page bulk controls untouched;
- show blocked/deferred reasons from catalog, not generic failure copy.

The dashboard must not:

- call provider/live endpoints during status rendering;
- auto-run commands during render or refresh;
- drain all batches automatically;
- trigger downstream stages after Data Quality completes;
- show investment-recommendation language.

## Compatibility Boundaries

No changes are allowed to:

- Prisma schema or migrations;
- generated files;
- package manifests;
- route registries;
- Market Data, Data Quality, Signal, Strategy, Backtesting, Research, Today Review, Portfolio, Watchlist, Alerts, Copilot, Auth, Subscription, or Notification source outside the approved `pipeline-orchestration` consumption path;
- existing feature-page bulk controls.

## Test Contract

Backend tests must cover:

- catalog returns `DATA_QUALITY_EVALUATE_SCOPE` as enabled and all other commands as deferred/forbidden;
- unknown command validation fails;
- missing idempotency key fails for executable command;
- non-`single_batch` run mode fails;
- batch size and offset bounds;
- blocked/deferred command returns `422` and creates no ledger rows;
- DQ command creates run/stage ledger rows, acquires lease, calls adapter once, records counts, clears lease, and completes;
- duplicate request with same idempotency key does not call adapter twice;
- held lease returns `409`;
- adapter error records failed terminal status and releases lease.

Frontend/UI tests must cover:

- unsupported command buttons remain disabled with a blocked/deferred reason;
- Data Quality command button can invoke the command once;
- command completion refreshes status evidence;
- status refresh alone does not invoke commands;
- existing row expansion/status evidence still works.

Reference work packet: `08-work-packets/CF-W3-MDPIPE-01B4-work-packet.md`.
