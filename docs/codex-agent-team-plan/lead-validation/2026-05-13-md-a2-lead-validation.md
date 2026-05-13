# MD-A2 Lead Validation - Sync Catalog Progress And Bulk Performance

Date: 2026-05-13  
Mode: Lead Validation Mode  
Owner: Senior Fullstack Lead / Orchestrator  
Work item: MD-A2 - Sync Catalog Progress And Bulk Performance

## Inputs

- PO audit: [Market Data full module PO audit](../po-audits/2026-05-13-market-data-full-module-po-audit.md)
- Architecture contract: [MD-A2 sync catalog performance contract](../architecture-contracts/2026-05-13-md-a2-sync-catalog-performance-contract.md)
- Developer handoff: [MD-A2 developer handoff](../developer-handoffs/2026-05-13-md-a2-developer-handoff.md)
- QA plan: [MD-A2 QA plan](../qa-plans/2026-05-13-md-a2-sync-catalog-performance-qa-plan.md)
- QA evidence: [MD-A2 QA evidence](../qa-evidence/2026-05-13-md-a2-qa-evidence.md)

## Validation Result

Lead validation status: `SIGNED OFF`

The implementation satisfies the Architect asks after QA signoff:

- Visible `Sync Catalog` starts `POST /api/market-data-foundation/stocks/sync-runs`; it no longer starts the legacy whole-universe `/stocks/sync-all` request.
- Backend start/status/cancel routes exist and return a run contract with `runId`, scope, hard caps, counts, terminal state, warnings, errors, and status URL.
- Start request returns quickly and provider work is decoupled from the original request.
- Provider-facing work is bounded by backend-owned caps: `batchSize <= 50`, `workerCount <= 2`, `workerConcurrency <= 3`, `maxBatches <= 100`.
- Repository selection is bounded by `take` and the coordinator excludes already processed IDs during a run.
- UI shows immediate feedback, accessible `Catalog sync progress`, scoped run identity, counts, partial continuation, cancellation, and terminal summaries.
- QA rejection for missing live evidence was resolved with a bounded live API check.

## Evidence

Automated validation:

- `backend`: `npm.cmd run build` passed.
- `backend`: `npm.cmd test -- market-data.service.test.ts market-data.routes.test.ts --runInBand` passed, 2 suites / 94 tests.
- `frontend`: `npm.cmd run build` passed.
- `frontend`: `npm.cmd run test:ui -- market-data-foundation.spec.ts --workers=1 --output=test-results-md-a2` passed, 8/8 tests.
- `git diff --check` passed with only existing line-ending warnings.

Live bounded validation:

- `POST http://127.0.0.1:3000/api/market-data-foundation/stocks/sync-runs`
- Payload: `region=IN`, `assetType=STOCK`, `batchSize=1`, `workerCount=1`, `workerConcurrency=1`, `delayBetweenBatchesMs=1000`, `maxBatches=1`
- Start response: HTTP 202 in 124 ms, run `catalog-sync-20260513130353-xr3e8t`
- Status response after 2 seconds: HTTP 200, `COMPLETED`, `processedCount=2905`, `skippedCount=2905`, `percentComplete=100`, no recent errors

## Residual Notes

- The legacy `syncAllStocks` frontend API helper and backend `/stocks/sync-all` endpoint remain for compatibility, as allowed by the architecture contract. The visible page-level `Sync Catalog` path does not call it, and UI tests guard against regression.
- Live evidence used the freshness-gated no-new-data path, so it did not perform provider-heavy fetching. This is intentional for safe local validation and still proves start responsiveness and status polling.
- `RUN_NOT_FOUND` has backend/controller handling and frontend handling, but no dedicated mocked UI test was added for that exact case in MD-A2.

## Next Gate

Move to Architect Signoff. Architect should verify that the solution still matches the local-first/no-paid-services architecture, bounded provider-concurrency policy, and Market Data business rules before PO acceptance.
