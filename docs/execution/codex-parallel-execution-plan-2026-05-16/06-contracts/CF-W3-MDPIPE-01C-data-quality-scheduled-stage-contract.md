# CF-W3-MDPIPE-01C Data Quality Scheduled Stage Contract

Date: 2026-05-25

Owner: Team 03 - Solution Architect

Status: Contract Ready candidate for Team 04 QA planning. Not Ready for Implementation until Team 04 QA planning and Team 00 promotion.

## Contract Intent

Add the first ledgered scheduled downstream stage after Market Data without introducing:

- a second scheduler;
- startup fanout;
- provider/live calls;
- route/API changes;
- full-scope Data Quality rescans;
- downstream stage fanout.

This contract is internal backend module-to-module behavior only.

## Stage Order

```text
MARKET_DATA      order 1   existing scheduler-owned source stage, not yet ledgered here
DATA_QUALITY     order 2   first scheduled ledgered downstream stage in 01C
```

`01C` does not require a `MARKET_DATA` pipeline stage row in the ledger. It does require Data Quality stage metadata that points back to the triggering Market Data summary evidence.

## Trigger Contract

The only allowed caller in `01C` is:

```text
MarketDataFoundationScheduler.runOnce()
```

The caller must invoke the scheduled DQ stage only when:

- the Market Data scheduled summary is for a normal scheduled pass;
- `changedInstrumentCount > 0`;
- `dqStageEligible === true`.

The caller must not invoke the stage:

- from startup fanout in this child;
- from Pipeline Ops UI;
- from `POST /api/v1/pipeline/commands`;
- from provider/backfill/manual repair flows;
- from downstream modules.

## Market Data Summary Additive Evidence

`MarketDataFoundationService.syncScheduledRegion()` should return additive internal fields:

```ts
interface ScheduledRegionSyncSummary {
  region: string;
  assetType: string;
  tradingDate: string;
  rowsInserted: number;
  rowsUpdated: number;
  rowsNoOp: number;
  warnings: string[];
  errors: string[];
  officialEodBulk?: {
    sourceFingerprint: string | null;
    targetTradingDate: string | null;
  } | null;

  // additive 01C internal fields
  dataThroughDate?: string | null;
  sourceFingerprint?: string | null;
  changedInstrumentIds?: string[];
  changedInstrumentCount?: number;
  dqStageEligible?: boolean;
}
```

Rules:

- `changedInstrumentIds` must be sorted and unique;
- `changedInstrumentCount` must equal `changedInstrumentIds.length`;
- `dqStageEligible` must be `true` only when inserted/updated rows created a real changed set for the current pass;
- `sourceFingerprint` should prefer the official bulk/source fingerprint when present, otherwise a deterministic fallback from the Market Data summary evidence.

## Scheduled DQ Stage Input

```ts
interface ScheduledDataQualityStageRequest {
  region: string;
  assetType: string;
  timeframe: '1d';
  pipelineKey: 'market-intelligence';
  triggerType: 'scheduled';
  dataThroughDate: string;
  sourceFingerprint: string;
  changedInstrumentIds: string[];
  batchSize: number;
  schedulerRunStartedAt: string;
}
```

Rules:

- `region` and `assetType` normalize to uppercase;
- `timeframe` is fixed to `1d` in this child;
- `pipelineKey` is fixed to `market-intelligence`;
- `changedInstrumentIds` must be unique, sorted, and non-empty;
- `batchSize` must be `1..100`;
- `batchSize` must not exceed `changedInstrumentIds.length` when the changed set is smaller;
- the first child must stay inside the upstream Market Data batch boundary;
- `triggerType` must be `scheduled`.

## Scheduled DQ Stage Output

```ts
type ScheduledDataQualityStageStatus =
  | 'COMPLETED'
  | 'PARTIAL'
  | 'FAILED'
  | 'SKIPPED'
  | 'DUPLICATE_TERMINAL'
  | 'LEASE_HELD';

interface ScheduledDataQualityStageResponse {
  status: ScheduledDataQualityStageStatus;
  pipelineRunId: string | null;
  stageRunId: string | null;
  stageKey: 'DATA_QUALITY';
  scope: {
    region: string;
    assetType: string;
    timeframe: string;
    pipelineKey: string;
  };
  triggerType: 'scheduled';
  dataThroughDate: string;
  inputFingerprint: string;
  outputFingerprint: string | null;
  batch: {
    totalInstrumentCount: number;
    processedCount: number;
    batchSize: number;
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
  startedAt: string | null;
  completedAt: string | null;
}
```

For the first child:

- `hasMore` should usually be `false` because the DQ stage should drain the bounded changed set from the current scheduler pass;
- `nextOffset` should remain `null` on terminal completion;
- `unchangedCount` may remain `0` in the first child unless the new DQ adapter exposes it explicitly.

## DQ Adapter Contract

Add a scheduled-stage adapter in `DataQualityEngineService`.

```ts
interface DataQualityScheduledEvaluateRequest {
  instrumentIds: string[];
  region: string;
  assetType: string;
  batchSize: number;
}

interface DataQualityScheduledEvaluateResponse {
  processedCount: number;
  totalCount: number;
  evaluatedCount: number;
  failedCount: number;
  skippedCount: number;
  warnings: string[];
  durationMs: number;
}
```

Adapter rules:

- no provider/live access;
- DB reads only through Market Data public service methods;
- use explicit `instrumentIds`, not region-wide offset scanning;
- persist one latest DQ evaluation per changed instrument;
- preserve current DQ scoring/tier semantics;
- do not reinterpret `PHASE0_AUTOMATION_NOT_AUTHORIZED` as permission for downstream automation.

## Batch Read Direction

To keep `01C` DB-only and incremental, the scheduled DQ adapter should prefer:

- `MarketDataFoundationService.getInstrumentsByIds()`
- `MarketDataFoundationService.listRecentPriceWindowsByInstrumentIds()`
- `MarketDataFoundationService.storedFundamentalsByInstrumentIds()`

Per-instrument `storedCorporateActionsByInstrumentId()` is acceptable in the first child because the changed set is already bounded by the Market Data scheduler batch size.

## Ledger Contract

Create a scheduled pipeline run:

```text
triggerType = scheduled
pipelineKey = market-intelligence
stageKey = DATA_QUALITY
stageOrder = 2
```

Required run metadata:

- `sourceStage = MARKET_DATA`
- `dataThroughDate`
- `sourceFingerprint`
- `changedInstrumentCount`
- `changedInstrumentIdsSample` limited to a safe sample size for metadata

Required stage metadata:

- `schedulerRunStartedAt`
- `dqStageVersion`
- `changedInstrumentCount`
- `changedInstrumentFingerprint`

## Idempotency Contract

Use one deterministic stage idempotency key:

```text
pipeline-ledger-v1:scheduled-dq:{region}:{assetType}:{timeframe}:{dataThroughDate}:{marketDataSourceFingerprint}:{changedInstrumentFingerprint}:{dqStageVersion}
```

Required behavior:

- same normalized scheduled input -> no duplicate DQ execution;
- same data-through date with different changed-set fingerprint -> intentional new stage;
- same changed set with new DQ stage version -> intentional new stage;
- terminal duplicate returns the prior terminal row;
- active lease returns `LEASE_HELD` or an equivalent blocked result without double execution.

## Skip Contract

The scheduled stage must skip without DQ execution when:

- `changedInstrumentIds.length === 0`;
- the scheduled call is a startup-triggered path in this child;
- the same idempotency key is already terminal.

The stage must not fall back to full-scope DQ when the changed set is empty.

## Compatibility Boundaries

No changes are allowed to:

- route registries;
- server startup wiring in `backend/src/server.ts`;
- Prisma/schema/migrations/generated files;
- package manifests;
- manual command API endpoint shapes;
- pipeline status API endpoint shape;
- frontend dashboard or B6 files;
- downstream stage execution.

## Required QA Assertions

Team 04 must validate:

- scheduled Market Data changes create one scheduled DQ ledger stage;
- empty/no-op Market Data summary does not trigger region-wide DQ evaluation;
- startup path does not invoke scheduled DQ in this child;
- the DQ adapter reads only the explicit changed set;
- duplicate fingerprint returns terminal duplicate behavior;
- a held lease prevents double execution;
- status API shows the scheduled DQ stage after completion;
- manual `DATA_QUALITY_EVALUATE_SCOPE` command still behaves exactly as in `01B4`.
