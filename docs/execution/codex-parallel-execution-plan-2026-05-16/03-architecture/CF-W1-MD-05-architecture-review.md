# CF-W1-MD-05 Architecture Review

Date: 2026-05-24

Owner: Team 03 Architecture Factory

## Status

Ready candidate.

`CF-W1-MD-05` has one bounded additive slice that can ship on current `dev` without schema, route-registry, provider, startup/backfill, package, or shared-UI changes.

The honest first slice is:

- backend additive DTO shaping on existing Market Data Foundation catalog sync run responses;
- frontend messaging updates on the existing Market Data Foundation catalog/sync page;
- reuse of existing per-instrument freshness fields for the stock list instead of inventing new persistence.

## Scope Of This Review

Decide whether the stale-candle/catalog-sync trust bug can be handled as a bounded no-schema/no-route additive packet that:

- separates latest completed market session freshness from per-instrument stored candle freshness;
- exposes skip reasons and adjacent outcomes clearly enough that skipped rows are explainable;
- stays inside Market Data Foundation module-owned backend/frontend/test files;
- avoids live provider approval, startup/backfill work, route changes, and storage changes.

Verdict: yes.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-MD-05-catalog-sync-latest-session-freshness-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-market-data-freshness-requirement-2026-05-24.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-market-data-data-quality.md`
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.controller.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.router.ts`
- `frontend/src/features/market-data-foundation/types.ts`
- `frontend/src/features/market-data-foundation/api/marketDataFoundationService.ts`
- `frontend/src/features/market-data-foundation/components/MarketDataFoundationPage.tsx`
- `frontend/src/features/market-data-foundation/components/InstrumentDetailPage.tsx`
- `frontend/tests/ui/market-data-foundation.spec.ts`

## Current Source Findings

- `evaluateSyncFreshnessGate(...)` already compares region-level latest stored trading date against the accepted latest completed trading date and can reopen fetch eligibility when the latest completed candle is missing.
- `enableCatalogStaleCatchUpIfNeeded(...)` already distinguishes the important trust state: region freshness can look current while `N` instruments still need the latest completed candle.
- `toCatalogSyncRunResponse(...)` currently exposes counters and message text only. It does not expose a stable freshness-basis object or a stable explainability object for skip/outcome reasons.
- `applyCatalogSyncBatchResults(...)` already aggregates enough primitives for an additive explainability view:
  - `skippedCount`
  - `noOpCount`
  - `failedCount`
  - `rowsInserted`
  - `rowsUpdated`
  - per-summary `skippedReasonCounts`
- `buildSkippedSyncSummary(...)` and `buildSkippedRegionSummary(...)` currently collapse pre-fetch skip states into `noNewData=true` plus broad reason counts. They do not distinguish session freshness truth from per-instrument freshness truth on their own.
- `V1Instrument` already exposes the key row-level freshness inputs needed by the frontend:
  - `latest_completed_eod_date`
  - `latest_completed_eod_present`
  - `stored_data_through_date`
  - `latest_price_date`
  - `provider_support_status`
- `MarketDataFoundationPage.tsx` currently:
  - shows catalog sync processed/succeeded/failed/skipped/no-op counters;
  - relies on free-form `message` text for run meaning;
  - renders the stock-list `Data Through` column from stored data-through or latest price date only;
  - does not explicitly show row freshness relative to the accepted latest completed session.
- `InstrumentDetailPage.tsx` shows metadata update time and latest price date, but that surface is not required for the smallest honest fix.
- `frontend/tests/ui/market-data-foundation.spec.ts` already owns catalog sync UI mocks and is the correct UI smoke test file to extend.

## No-Schema First Slice Determination

Yes.

The first slice can stay bounded if it uses:

1. existing Market Data Foundation service logic for freshness truth,
2. additive DTO fields on existing catalog sync run responses,
3. existing per-instrument freshness fields already returned to the catalog page,
4. feature-owned page/test files only.

No Prisma/schema, route, controller, router, provider, scheduler/startup, backfill, package, shared utility, generated-type, or shared-UI change is required for that slice.

## Architecture Decision

Keep `CF-W1-MD-05` as one additive backend-plus-frontend Market Data Foundation packet.

### Backend responsibility

Add one stable freshness-basis object and one stable explainability object to existing catalog sync run responses.

Required semantics:

- latest completed session date for the selected scope;
- latest stored session date used by the sync gate;
- explicit distinction between:
  - latest session missing at region level;
  - region current with stale instruments pending;
  - region current and fully current/final-confirmed;
  - session unknown;
- explicit explainability for:
  - pre-fetch skip reasons;
  - stale instrument catch-up still pending;
  - no-op/current-after-fetch outcomes;
  - failed instrument work.

### Frontend responsibility

Use the new run DTO fields plus existing `V1Instrument` freshness dates to show:

- session freshness basis in the catalog sync status panel;
- skip/outcome reason chips or summary rows on the same panel;
- row-level freshness messaging in the catalog grid so stored row dates are visibly separate from region/session status.

### Important boundary

Unsupported-provider rows are already visible on the catalog list through existing provider support state, but they are excluded from the catalog sync task queue before fetch. The bounded first slice may explain that exclusion in UI copy. If the Product Owner requires scope-wide numeric unsupported exclusion counts in the run DTO, that becomes a follow-on repository-backed child.

## Exact Future File Reservations

### Allowed implementation files

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
- `frontend/src/features/market-data-foundation/types.ts`
- `frontend/src/features/market-data-foundation/components/MarketDataFoundationPage.tsx`
- `frontend/tests/ui/market-data-foundation.spec.ts`

### Forbidden files

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
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
- `backend/tests/modules/market-data-foundation/market-data.repository.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.universe.test.ts`
- `frontend/src/features/market-data-foundation/api/marketDataFoundationService.ts`
- `frontend/src/features/market-data-foundation/components/InstrumentDetailPage.tsx`
- `frontend/src/features/market-data-foundation/components/MarketDataStatusPanel.tsx`
- `frontend/src/features/market-data-foundation/routes.tsx`
- `frontend/tests/ui/market-data-foundation-instrument.spec.ts`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- live provider, startup, scheduler/backfill redesign, paid/cloud, broker, telemetry, or credential scope

## Required Contract Shape

Exact names may differ, but the response semantics must remain separate.

### Catalog sync freshness basis

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
```

### Catalog sync explainability

```ts
interface CatalogSyncExplainability {
  preFetchSkippedReasonCounts: Record<string, number>;
  staleCatchUpPendingCount: number;
  noOpCount: number;
  failedCount: number;
  notes?: string[];
}
```

`notes` may carry the bounded unsupported-row message if the UI needs to explain that unsupported rows are excluded from the queued catalog sync scope.

## Required Mapping Rules

- `LATEST_COMPLETED_SESSION_MISSING`
  - latest completed trading date exists
  - latest stored trading date is null or older than latest completed trading date
  - run must not present a terminal "no new data" interpretation for the scope
- `REGION_CURRENT_INSTRUMENT_CATCH_UP_PENDING`
  - region latest stored trading date is current for latest completed trading date
  - stale instrument count is greater than zero
- `REGION_CURRENT_FINAL_CONFIRMED`
  - region latest stored trading date is current
  - stale instrument count is zero
  - final-confirmation or no-op wording is acceptable only in this state
- `SESSION_UNKNOWN`
  - latest completed trading date cannot be determined safely

Explainability rules:

- pre-fetch scope gate counts come from existing skip reason counts
- stale catch-up pending count comes from stale task counting already used by `enableCatalogStaleCatchUpIfNeeded(...)`
- no-op remains distinct from pre-fetch skipped
- failed work remains distinct from skipped work

## QA Handoff Notes

Team 04 should plan verification for:

- stale latest-session case:
  - latest completed trading date newer than latest stored trading date
  - no terminal "no new data" message
- region current but stale instruments pending:
  - explicit catch-up state
  - stale instrument count visible
- fully current/final-confirmed case:
  - current state visible
  - no stale instruments pending
- pre-fetch skip reason visibility:
  - reason counts shown without console inspection
- no-op visibility:
  - no-op remains distinct from skipped
- failed instrument work visibility:
  - failure remains distinct from skipped
- row-level freshness:
  - catalog grid shows row stored date relative to latest completed session rather than implying universal freshness
- unsupported row boundary:
  - unsupported provider rows are not mislabeled as synced current rows
- no route/provider/schema/startup drift

Suggested validation after implementation exists:

```powershell
cd backend
npm.cmd test -- market-data.service.test.ts --runInBand
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run build
npm.cmd run test:ui -- market-data-foundation.spec.ts --workers=1
```

## Ready Recommendation

Ready candidate.

Reason:

- one bounded no-schema/no-route additive slice is feasible now;
- the backend already owns the necessary freshness truth;
- the frontend already receives the per-instrument freshness dates needed for the stock list;
- no shared or startup/provider work is required for the first pass.

## Stop Condition

Stop and return to Team 00 / Architect if implementation requires any of:

- repository changes for numeric unsupported exclusion counts;
- route/controller/router changes;
- schema/storage/generated changes;
- shared UI or shared utility edits;
- startup/backfill/provider behavior changes;
- Instrument Detail page scope expansion.
