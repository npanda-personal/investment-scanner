# CF-W1-MD-05 Catalog Sync Freshness Contract

Date: 2026-05-24

Owner: Team 03 Architecture Factory

## Status

Ready candidate contract for one bounded additive Market Data Foundation slice.

## Contract Intent

Market Data Foundation must expose catalog sync freshness truth and skip explainability clearly enough that:

- a newer accepted latest completed session cannot be masked by a coarse "no new data" result;
- region/session freshness is visibly separate from per-instrument stored candle freshness;
- skipped work, no-op work, failed work, and stale catch-up pending are distinguishable;
- the catalog list does not visually imply universal freshness when individual rows remain stale.

This contract is explainability and UI-truth only. It does not create a second Data Quality system.

## Ownership

`market-data-foundation` owns this contract.

Data Quality Engine remains the owner of:

- readiness policy
- downstream fail-closed behavior
- strategy/backtest/signal/alert eligibility

This contract answers:

- what is the latest completed session for the selected scope?
- what stored session did the sync gate use?
- are stale instruments still pending?
- why did queued work skip, no-op, or fail?

It does not answer downstream readiness.

## Exact Implementation Boundary

### Allowed writer set

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
- `frontend/src/features/market-data-foundation/types.ts`
- `frontend/src/features/market-data-foundation/components/MarketDataFoundationPage.tsx`
- `frontend/tests/ui/market-data-foundation.spec.ts`

### Forbidden

- Prisma/schema/migrations
- generated files
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.controller.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.router.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.provider.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.scheduler.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.worker.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.queue.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.market-session.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.universe.ts`
- `backend/src/modules/market-data-foundation/index.ts`
- `frontend/src/features/market-data-foundation/api/marketDataFoundationService.ts`
- `frontend/src/features/market-data-foundation/components/InstrumentDetailPage.tsx`
- `frontend/src/features/market-data-foundation/components/MarketDataStatusPanel.tsx`
- `frontend/src/features/market-data-foundation/routes.tsx`
- `frontend/tests/ui/market-data-foundation-instrument.spec.ts`
- backend/frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- provider/startup/backfill/live-call scope

## Required Additive DTO Contract

### Catalog sync run response

Existing fields stay intact. Additive fields must separate freshness basis from explainability.

```ts
type CatalogSyncFreshnessState =
  | 'LATEST_COMPLETED_SESSION_MISSING'
  | 'REGION_CURRENT_INSTRUMENT_CATCH_UP_PENDING'
  | 'REGION_CURRENT_FINAL_CONFIRMED'
  | 'SESSION_UNKNOWN';

interface CatalogSyncFreshnessBasis {
  latestCompletedTradingDate: string | null;
  latestStoredTradingDate: string | null;
  freshnessState: CatalogSyncFreshnessState;
  staleInstrumentCount: number;
  regionFresh: boolean;
}

interface CatalogSyncExplainability {
  preFetchSkippedReasonCounts: Record<string, number>;
  staleCatchUpPendingCount: number;
  noOpCount: number;
  failedCount: number;
  notes?: string[];
}
```

Exact field names may differ. These semantics may not.

### Catalog grid row messaging

The first slice may reuse existing `V1Instrument` fields:

- `latest_completed_eod_date`
- `latest_completed_eod_present`
- `stored_data_through_date`
- `latest_price_date`
- `provider_support_status`

No new instrument persistence or route contract is required for the first slice.

## Required Behavior Rules

### Freshness basis rules

- If `latestCompletedTradingDate` is newer than `latestStoredTradingDate`, the run must not present a terminal "no new data" interpretation for the selected scope.
- If region freshness is current but stale instruments remain, `freshnessState` must resolve to `REGION_CURRENT_INSTRUMENT_CATCH_UP_PENDING`.
- If region freshness is current and no stale instruments remain, `freshnessState` may resolve to `REGION_CURRENT_FINAL_CONFIRMED`.
- If the latest completed session cannot be determined safely, `freshnessState` must resolve to `SESSION_UNKNOWN`.

### Explainability rules

- pre-fetch scope gate counts must remain distinct from no-op counts
- no-op counts must remain distinct from failed counts
- stale catch-up pending count must remain distinct from pre-fetch skipped counts
- failed work must remain visible without console inspection

### Row freshness rules

The catalog list must show stored row freshness relative to the accepted latest completed session. A stored row date alone is insufficient.

Acceptable first-slice presentation examples:

- "Stored through 2026-05-18; latest completed session 2026-05-23"
- "Latest completed session present"
- "Unsupported provider row excluded from queued catalog sync scope"

Exact wording may differ, but session freshness and stored row freshness may not collapse into one label.

## Unsupported Provider Boundary

The first slice does not need a new scope-wide numeric unsupported count.

Allowed first-slice behavior:

- explain in UI copy that unsupported rows are excluded from the queued catalog sync scope;
- continue showing provider support state on each row.

If Team 00 or Product Owner requires a machine-safe numeric excluded count for unsupported rows at run level, stop and reopen as a repository-backed child.

## Compatibility Rules

- preserve current route paths and query params
- preserve sync task selection and stale-catch-up behavior
- preserve provider behavior
- preserve startup/backfill behavior
- preserve existing counters and existing response fields
- keep all new fields additive only

## Explicitly Rejected In This Pass

- schema/storage changes
- repository changes
- route/controller/router changes
- new provider calls
- startup/backfill changes
- shared UI or shared utility changes
- Instrument Detail page changes
- DQ scoring or readiness labels
- downstream consumer wiring

## Test Contract

Backend tests must prove:

- stale latest-session run state
- region-current/instrument-stale catch-up state
- fully current/final-confirmed state
- pre-fetch skip reason counts
- no-op remains distinct from skipped
- failed count remains distinct from skipped

Frontend/UI tests must prove:

- catalog sync panel shows freshness basis fields
- catalog sync panel shows explainability counts or notes
- stock-list freshness text distinguishes stored row date from accepted latest completed session
- unsupported rows are not visually mislabeled as current synced rows

## Contract Result

- Split required: `No`
- Blocked: `No`
- Ready candidate: `Yes`

The bounded first slice is honest and implementation-safe under the stated reservation set.
