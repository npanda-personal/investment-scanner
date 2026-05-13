# MD-A3 Developer Handoff - Deep Price Backfill For Supported Shallow Rows

Date: 2026-05-13  
Mode: Implementation Mode  
Owner: Senior Fullstack Lead / Orchestrator  
Work item: MD-A3 - Deep Price Backfill For Supported Shallow Rows

## Product And Architecture Inputs

- Product brief: [MD-A3 product brief](../po-briefs/2026-05-13-md-a3-deep-price-backfill-product-brief.md)
- Architecture contract: [MD-A3 architecture contract](../architecture-contracts/2026-05-13-md-a3-deep-price-backfill-contract.md)
- QA plan: [MD-A3 QA plan](../qa-plans/2026-05-13-md-a3-deep-price-backfill-qa-plan.md)
- PO audit: [Market Data full module PO audit](../po-audits/2026-05-13-market-data-full-module-po-audit.md)

## Parallel Assignments

### Backend Deep Backfill Policy And Diagnostics

Owner: Lane 1 backend developer  
State: `Ready for Implementation`  
Reserved write scope:

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.provider.ts`
- Focused backend tests under `backend/tests/modules/market-data-foundation/`

Required outcome:

- `BACKFILL_PRICES` automatically performs deep history repair for provider-supported shallow rows without requiring operator-supplied `fullReload`.
- Provider fetch end date is capped to latest completed EOD for the scope.
- Supported shallow candidates are ordered by missing latest EOD, under 120, under 200, under 252, stale EOD, then symbol.
- API response exposes machine-readable diagnostics for deep reloads, incremental catch-up, zero-row provider returns, remaining candidates, target EOD/end date, and still-under-120/200/252 counts.
- Zero provider rows do not count as successful repair.
- Adjusted-close mapping must not fake adjusted-close coverage when provider adjusted close is absent.

### Frontend Repair Workbench Evidence

Owner: Lane 1 frontend/fullstack developer after backend diagnostics are available  
State: `Ready for Implementation`  
Reserved write scope:

- `frontend/src/features/market-data-foundation/types.ts`
- `frontend/src/features/market-data-foundation/api/marketDataFoundationService.ts`
- `frontend/src/features/market-data-foundation/components/MarketDataStatusPanel.tsx`
- `frontend/tests/ui/market-data-foundation.spec.ts`

Required outcome:

- Existing `Backfill prices` action remains the visible action.
- Normal user request sends `region`, `assetType`, `batchSize`, and `force`, but does not expose/send normal `fullReload`.
- Repair summary displays price rows, deep reloads, incremental catch-up, zero-row provider returns, remaining candidates, target EOD/end date, and still-under-120/200/252 counts when present.
- UI does not present a green success message when zero-row/no-progress outcomes are returned.

## Developer Pre-QA Validation

- Backend: focused market-data backend tests for price backfill and adjusted-close mapping.
- Frontend: focused UI tests for backfill payload and summary display.
- Build validation for touched backend/frontend projects when resource limits allow.
- Each handoff must list exact commands, results, skipped checks, and blockers.

## QA Gate

QA validates against [MD-A3 QA plan](../qa-plans/2026-05-13-md-a3-deep-price-backfill-qa-plan.md):

- Deep backfill works without operator `fullReload`.
- End date is latest completed EOD, not in-progress current day.
- Zero-row and still-shallow outcomes remain visible.
- UI evidence shows the repair result and does not hide continued blockers.
