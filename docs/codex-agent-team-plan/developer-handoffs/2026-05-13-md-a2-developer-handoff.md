# MD-A2 Developer Handoff - Sync Catalog Progress And Bulk Performance

Date: 2026-05-13  
Mode: Implementation Mode  
Owner: Senior Fullstack Lead / Orchestrator  
Work item: MD-A2 - Sync Catalog Progress And Bulk Performance

## Product And Architecture Inputs

- PO audit: [Market Data full module PO audit](../po-audits/2026-05-13-market-data-full-module-po-audit.md)
- Architecture contract: [MD-A2 sync catalog performance contract](../architecture-contracts/2026-05-13-md-a2-sync-catalog-performance-contract.md)
- Work packet: [Market Data availability work packets](../work-packets/2026-05-13-market-data-availability-work-packets.md#md-a2---sync-catalog-progress-and-bulk-performance)

## Parallel Assignments

### Backend Coordinator/API

Owner: Gauss (`019e2159-4611-7f41-86e2-64266df11c25`)  
State: `In Implementation`  
Reserved write scope:

- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.controller.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.router.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.worker.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- Focused tests under `backend/tests/modules/market-data-foundation/`

Required outcome:

- Add backend-owned catalog sync runs with start/status/cancel APIs.
- Start returns quickly with `runId` and does not hold the HTTP request for provider work.
- Processing is bounded by hard caps and one active run per `region` + `assetType` + `CATALOG`.
- Status exposes progress, batch counts, result counts, warnings, errors, partial/completed/failed/canceled terminal state, and scope.
- Existing `/stocks/sync-all` remains compatible for non-UI callers.

### Frontend Progress UX

Owner: Hubble (`019e2159-464b-7c30-b5a8-d998bf011af3`)  
State: `In Implementation`  
Reserved write scope:

- `frontend/src/features/market-data-foundation/types.ts`
- `frontend/src/features/market-data-foundation/api/marketDataFoundationService.ts`
- `frontend/src/features/market-data-foundation/components/MarketDataFoundationPage.tsx`
- `frontend/tests/ui/market-data-foundation.spec.ts`

Required outcome:

- Visible `Sync Catalog` button starts `/stocks/sync-runs`, not `/stocks/sync-all`.
- UI shows immediate progress feedback, accessible `Catalog sync progress`, scoped run details, live counts, cancel, partial summary, and continue action.
- Polling stops on terminal states and refreshes catalog/scheduler status after completion or partial stop.
- Mocked UI tests prove progress behavior and that the old whole-universe request is not used.

## Developer Pre-QA Validation

- Backend worker runs the focused market-data backend tests touched by MD-A2.
- Frontend worker runs focused UI tests where practical and `npm run build` if local resource limits allow.
- Each worker records exact commands, pass/fail result, skipped checks, and blockers.
- No handoff to QA is valid without performance/progress evidence or a concrete blocker.

## QA Gate

QA validates against [MD-A2 QA plan](../qa-plans/2026-05-13-md-a2-sync-catalog-performance-qa-plan.md):

- Backend start/status/cancel APIs and bounds.
- UI progress/cancel/partial/continue behavior with mocked endpoints.
- No visible Sync Catalog flow uses `/stocks/sync-all`.
- Manual local bounded evidence when resource gate allows.
