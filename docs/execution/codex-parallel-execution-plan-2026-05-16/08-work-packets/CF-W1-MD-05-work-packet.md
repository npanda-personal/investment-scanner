# CF-W1-MD-05 Work Packet

Date: 2026-05-24

## Work Item

`CF-W1-MD-05 - catalog sync latest-session freshness and skip-reason explainability`

## State

Ready candidate.

One bounded additive slice is feasible on current `dev`. No split is required for the first pass as long as unsupported-provider exclusion remains explanatory rather than numeric run-level counting.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Lane 1 implementation team
- Lane: Lane 1
- Backend module: `market-data-foundation`
- Frontend feature: `market-data-foundation`

## Exact File Reservations

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
- `frontend/src/features/market-data-foundation/api/marketDataFoundationService.ts`
- `frontend/src/features/market-data-foundation/components/InstrumentDetailPage.tsx`
- `frontend/src/features/market-data-foundation/components/MarketDataStatusPanel.tsx`
- `frontend/src/features/market-data-foundation/routes.tsx`
- `frontend/tests/ui/market-data-foundation-instrument.spec.ts`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- provider/live-data/startup/backfill scope

## Required Behavior

Implementation must:

- add additive catalog sync run response fields for freshness basis and explainability;
- expose latest completed session date and latest stored session date together;
- expose whether the run state is:
  - latest session missing,
  - region current but stale instruments pending,
  - region current and fully current/final-confirmed,
  - session unknown;
- expose explainability that separates:
  - pre-fetch skipped reasons,
  - stale instrument catch-up pending,
  - no-op/current-after-fetch,
  - failed instrument work;
- update the catalog sync panel to show those fields without console inspection;
- update stock-list freshness messaging so row stored dates are shown relative to the accepted latest completed session;
- keep wording research-support oriented.

## Existing Evidence To Reuse

- `evaluateSyncFreshnessGate(...)`
- `enableCatalogStaleCatchUpIfNeeded(...)`
- existing `skippedReasonCounts`
- existing `noOpCount`
- existing `failedCount`
- existing `V1Instrument.latest_completed_eod_date`
- existing `V1Instrument.latest_completed_eod_present`
- existing `V1Instrument.stored_data_through_date`

## Explicitly Deferred

- numeric unsupported exclusion counts at run level
- repository changes
- route changes
- Instrument Detail page changes
- schema/storage changes
- startup/backfill/provider changes
- Data Quality Engine adoption
- downstream Today Review/Research Hub use

## QA Handoff Notes

Team 04 should prepare focused verification for:

- stale latest-session mismatch
- region current but stale instruments pending
- fully current/final-confirmed scope
- pre-fetch skip reason visibility
- no-op visibility
- failed work visibility
- catalog row freshness text relative to latest completed session
- unsupported row explanatory boundary

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

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- repository edits for unsupported exclusion counts
- controller/router/route-registry changes
- schema/migration/generated changes
- shared UI or shared backend utility changes
- provider/startup/backfill changes
- Instrument Detail page scope expansion

## Ready Recommendation

Ready candidate.
