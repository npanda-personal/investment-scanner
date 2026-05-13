# MD-A2 Sync Catalog Progress And Bulk Performance Architecture Contract

Date: 2026-05-13  
Mode: Architecture Planning Mode  
Owner: Solution Architect Agent  
Lane/module: Lane 1, `market-data-foundation`  
Work item: MD-A2 - Sync Catalog Progress And Bulk Performance

## 1. Current Sync Catalog Flow And Root Cause

Current visible flow:

- `frontend/src/features/market-data-foundation/components/MarketDataFoundationPage.tsx` renders the `Sync Catalog` button in the catalog page header.
- `handleCatalogSync` sets `catalogSyncing=true`, then calls `syncAllStocks(4, 4, 3000, { region: scope.region, assetType })`.
- `frontend/src/features/market-data-foundation/api/marketDataFoundationService.ts` sends one `POST /api/market-data-foundation/stocks/sync-all?...` request.
- `backend/src/modules/market-data-foundation/market-data-foundation.controller.ts` reads `workerCount`, `workerConcurrency`, `delayBetweenBatchesMs`, `force`, `fullReload`, `region`, and `assetType`, then awaits `service.syncAll(...)`.
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts` loads every scoped active stock with `repository.listActiveStockSyncTasks(options)` without a `take` limit, creates `workerCount` `StockSyncWorker` instances, splits the whole scoped universe across them, awaits all worker promises, and returns only after the full run finishes.
- `StockSyncWorker.processTasks` internally chunks by `workerConcurrency`, calls `ingestSymbol` for each symbol, and waits one second between worker-local chunks.

Root cause:

- One frontend click starts one long synchronous HTTP request that owns the full scoped universe until completion.
- The frontend has only button-level spinner/disabled feedback for this path. It does not receive per-batch or per-symbol progress, totals, partial counts, warnings, or a safe resume point while `/stocks/sync-all` is running.
- The backend does not bound the request by batch size. It selects all eligible scoped stocks up front and keeps the request open while provider work runs.
- Provider concurrency is effectively `workerCount * workerConcurrency` from request parameters. The UI currently passes `4 * 4 = 16`; the controller permits up to `10 * 10 = 100`. That is too much for a user-facing button and bypasses one centrally coordinated throttle strategy.
- `delayBetweenBatchesMs` is not a reliable global provider throttle because workers are started together and the delay is applied inside each worker path rather than by one run coordinator.
- Scope is partly preserved when selecting tasks through `region` and `assetType`, but the worker only receives task symbols plus freshness options. The new contract must preserve scope explicitly in every run, batch, status, and worker call.
- Because the HTTP response is final-only, a large universe or slow provider can look like a hung UI for minutes or hours even when work is still progressing.

## 2. Chosen Architecture

Chosen option: backend-owned bounded sync run with job/status polling.

This is the safest smallest change for this repo because provider calls and throttles already live in the backend module. Moving orchestration to the browser would require the frontend to repeatedly trigger provider work, manage offsets, recover from tab closes, and avoid overlapping runs. That would make throttling and deduplication harder to enforce. A backend run coordinator keeps provider concurrency server-owned while giving the frontend a small polling contract.

Required architecture:

- Keep the existing `POST /api/market-data-foundation/stocks/sync-all` available for compatibility, but the `Sync Catalog` button must move to the new run API.
- Add a module-local in-process sync-run coordinator in `backend/src/modules/market-data-foundation`. No Redis, paid queue, external worker service, or new infrastructure.
- The start endpoint returns quickly with `202 Accepted` and a `runId`; it must not wait for all instruments.
- The coordinator processes bounded batches in the background with a hard per-run batch size and hard provider concurrency cap.
- The frontend polls a status endpoint until `COMPLETED`, `PARTIAL`, `FAILED`, or `CANCELED`.
- Only one active catalog sync run may execute for the same `region` + `assetType` + `scopeType=CATALOG` at a time. A second start request returns the active `runId` and status instead of starting overlapping provider work.
- Status is in-memory for this implementation. This is acceptable for local-first use and avoids a Prisma migration in the smallest change. If the process restarts, the status endpoint may return `404 RUN_NOT_FOUND`; the UI must show that the run state was lost and allow starting a new bounded run.
- The existing scheduled bounded sync path remains separate. MD-A2 does not change scheduler policy except by reusing the same freshness and completed-EOD safety rules where practical.

Rejected option: frontend-only batch orchestration over many sync requests.

Reason: it would put provider-loop control in the browser, make tab-close/retry behavior unsafe, and make it easier to accidentally issue many concurrent provider calls from one UI session.

## 3. API/Data Contract Changes

New backend routes under the existing `market-data-foundation` module:

### Start Catalog Sync Run

`POST /api/market-data-foundation/stocks/sync-runs`

Request body:

```json
{
  "region": "IN",
  "assetType": "STOCK",
  "batchSize": 25,
  "workerCount": 1,
  "workerConcurrency": 2,
  "delayBetweenBatchesMs": 3000,
  "force": false,
  "fullReload": false,
  "maxBatches": 20
}
```

Field rules:

- `region`: required after normalization; defaults to current global scope in the frontend. Supported values follow existing market scope rules: `IN`, `US`, `EU`, `GLOBAL`.
- `assetType`: required after normalization; defaults to `STOCK`.
- `batchSize`: optional, default `25`, min `1`, max `50` for provider-facing sync runs.
- `workerCount`: optional, default `1`, min `1`, max `2`.
- `workerConcurrency`: optional, default `2`, min `1`, max `3`.
- `delayBetweenBatchesMs`: optional, default `3000`, min `1000`, max `30000`.
- `force` and `fullReload`: optional booleans; same meaning as current `syncAll`.
- `maxBatches`: optional, default `20`, min `1`, max `100`. This bounds one started run so it cannot silently process an unlimited universe forever. If more work remains, the run ends as `PARTIAL` with `hasMore=true` and the UI can offer `Continue`.

Start response, new run:

```json
{
  "success": true,
  "runId": "catalog-sync-20260513-abc123",
  "status": "RUNNING",
  "message": "Catalog sync started.",
  "region": "IN",
  "assetType": "STOCK",
  "batchSize": 25,
  "workerCount": 1,
  "workerConcurrency": 2,
  "delayBetweenBatchesMs": 3000,
  "totalCount": 2916,
  "processedCount": 0,
  "succeededCount": 0,
  "failedCount": 0,
  "skippedCount": 0,
  "noOpCount": 0,
  "warningCount": 0,
  "hasMore": true,
  "startedAt": "2026-05-13T10:15:00.000Z",
  "statusUrl": "/api/market-data-foundation/stocks/sync-runs/catalog-sync-20260513-abc123"
}
```

Start response, active run already exists:

```json
{
  "success": true,
  "runId": "catalog-sync-20260513-abc123",
  "status": "RUNNING",
  "message": "A catalog sync is already running for IN/STOCK.",
  "region": "IN",
  "assetType": "STOCK",
  "alreadyRunning": true,
  "statusUrl": "/api/market-data-foundation/stocks/sync-runs/catalog-sync-20260513-abc123"
}
```

### Poll Catalog Sync Run Status

`GET /api/market-data-foundation/stocks/sync-runs/:runId`

Response:

```json
{
  "success": true,
  "runId": "catalog-sync-20260513-abc123",
  "status": "RUNNING",
  "region": "IN",
  "assetType": "STOCK",
  "scopeType": "CATALOG",
  "batchSize": 25,
  "workerCount": 1,
  "workerConcurrency": 2,
  "delayBetweenBatchesMs": 3000,
  "maxBatches": 20,
  "totalCount": 2916,
  "processedCount": 125,
  "currentBatchNumber": 5,
  "batchesPlanned": 20,
  "batchesExecuted": 5,
  "succeededCount": 119,
  "failedCount": 2,
  "skippedCount": 4,
  "noOpCount": 37,
  "rowsReceived": 412,
  "rowsInserted": 188,
  "rowsUpdated": 16,
  "rowsSkipped": 208,
  "warningCount": 3,
  "warnings": ["sample warning text"],
  "recentErrors": [
    { "symbol": "ABC.NS", "message": "provider timeout", "timestamp": "2026-05-13T10:17:00.000Z" }
  ],
  "hasMore": true,
  "percentComplete": 4.3,
  "startedAt": "2026-05-13T10:15:00.000Z",
  "updatedAt": "2026-05-13T10:18:00.000Z",
  "completedAt": null,
  "message": "Processing batch 5 of 20."
}
```

Status values:

- `PENDING`: accepted but not yet processing.
- `RUNNING`: batch worker is active.
- `PARTIAL`: run hit `maxBatches`, provider safety stop, cancellation request, or a recoverable no-progress condition while more rows remain.
- `COMPLETED`: requested bounded run scope completed and no more eligible rows remain.
- `FAILED`: run-level failure before meaningful progress or unrecoverable coordinator failure.
- `CANCELED`: user requested cancellation and the coordinator stopped after the current in-flight batch.

`404` response:

```json
{
  "success": false,
  "code": "RUN_NOT_FOUND",
  "message": "Catalog sync run was not found. It may have expired or the server restarted."
}
```

### Cancel Catalog Sync Run

`POST /api/market-data-foundation/stocks/sync-runs/:runId/cancel`

Response:

```json
{
  "success": true,
  "runId": "catalog-sync-20260513-abc123",
  "status": "PARTIAL",
  "message": "Cancellation requested. The current batch will finish before the run stops."
}
```

Cancellation is best-effort. It must not abort an in-flight provider request mid-call; it stops before selecting the next batch.

### Compatibility Endpoint

Existing `POST /api/market-data-foundation/stocks/sync-all` should be changed by the backend developer only if needed. Acceptable smallest-safe behavior:

- Leave it as-is for non-UI callers during MD-A2, but do not call it from the `Sync Catalog` button.
- Or make it start a bounded run and return `202` when `async=true` is supplied.

The implementation packet must choose one approach and update API tests accordingly. The architecture preference is to leave compatibility behavior untouched and add the new route to reduce regression risk.

## 4. Frontend Progress UX Requirements

`Sync Catalog` UX must:

- Show immediate feedback after click: button disabled, spinner/icon state, and a progress panel/alert visible within one UI tick.
- Display scoped run identity: `IN/STOCK` or selected global scope, `batchSize`, and provider concurrency.
- Use a determinate progress bar when `totalCount > 0`: `processedCount / totalCount`, with percentage from the status response or locally derived from counts.
- Use an indeterminate progress bar only while the start request is in flight or when totals are unavailable.
- Show live counts: processed, total, succeeded, failed, skipped, no-op, rows inserted, rows updated, rows skipped, warnings.
- Show current batch: `batch X of Y` where known.
- Poll every 1-2 seconds while status is `PENDING` or `RUNNING`; stop polling on terminal statuses.
- Disable only conflicting catalog sync controls while a run is active. Normal table filters, tabs, and navigation should remain usable.
- Provide a `Cancel` action for an active run.
- On `PARTIAL` with `hasMore=true`, show a final partial summary and a `Continue Sync` action that starts another bounded run for the same `region` and `assetType`.
- On `RUN_NOT_FOUND`, explain that server run state was lost and allow starting a new run.
- Refresh the catalog table and scheduler/status summary after terminal statuses, not after every poll.
- Preserve the existing import/backfill progress behavior; do not collapse it into catalog price sync progress.

Required accessible labels:

- Progress bar: `Catalog sync progress`.
- Cancel button: `Cancel catalog sync`.
- Continue button: `Continue catalog sync`.

## 5. Worker, Batch, Concurrency, Throttle, And Resource Safety Rules

Coordinator rules:

- One active run per `region` + `assetType` + `CATALOG`.
- Default `batchSize=25`; hard max `50`.
- Default `workerCount=1`; hard max `2`.
- Default `workerConcurrency=2`; hard max `3`.
- Effective provider concurrency must never exceed `workerCount * workerConcurrency`, and the default must be `2`.
- `delayBetweenBatchesMs` applies between coordinator-selected batches, not after the whole run.
- `maxBatches` bounds one run. Default `20`, hard max `100`.
- Each run must select only the next bounded eligible set for the requested `region` and `assetType`.
- Do not call `listActiveStockSyncTasks(options)` without a `take` or equivalent bound in the run loop.
- Do not hold the original HTTP request open for provider work after the start response is sent.
- Do not spawn detached OS processes or external queues.
- Do not create paid hosted infrastructure or add paid dependencies.
- Keep status memory bounded: retain only active runs plus a small recent terminal set, such as the latest 10 terminal runs or runs younger than 30 minutes.
- Store only capped `warnings` and `recentErrors` in memory, such as the latest 20 each.
- Preserve freshness gate behavior. If the catalog is recently synced or final-confirmed, the run should complete quickly with `noNewData`/skip counts and no provider fetch.
- Preserve latest-completed-EOD safety: catch-up may fetch missing completed daily candles, but must not request current in-progress daily candles for EOD review workflows.
- Preserve provider support filtering: skip `UNSUPPORTED`; include only existing eligible active rows for the requested scope.
- Pass `region` and `assetType` into any service/worker calls where available so status, gating, and repository filters cannot drift from the selected scope.
- Provider throttles are server-owned. The frontend must not introduce parallel request loops that multiply provider calls.

Failure/no-progress rules:

- A batch with failures does not fail the whole run if other rows succeed; aggregate failures and continue until `maxBatches`, cancellation, or eligible rows drain.
- If a batch processes zero rows while `hasMore` appears true, stop as `PARTIAL` with a warning to avoid an infinite loop.
- If the provider or DB throws a run-level error before the first batch completes, mark `FAILED`.
- Always disconnect worker-owned Prisma clients in `finally`.

## 6. Implementation Packets With Non-Conflicting Write Scopes

Packet MD-A2-BE-1: Backend run coordinator and API.

Owner: Lane 1 backend developer.  
Write scope:

- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.controller.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.router.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.worker.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- Backend module tests if present or added under the existing backend test structure for this module.

Forbidden for this packet:

- Prisma schema/migrations unless the Orchestrator explicitly reopens architecture.
- Frontend files.
- Shared route registries outside the existing module route registration unless required and assigned by Orchestrator.

Packet MD-A2-FE-1: Frontend API client, types, and progress UX.

Owner: Lane 1 frontend/fullstack developer after backend contract is available.  
Write scope:

- `frontend/src/features/market-data-foundation/types.ts`
- `frontend/src/features/market-data-foundation/api/marketDataFoundationService.ts`
- `frontend/src/features/market-data-foundation/components/MarketDataFoundationPage.tsx`
- `frontend/tests/ui/market-data-foundation.spec.ts`

Forbidden for this packet:

- Backend files.
- Shared UI components unless the Orchestrator explicitly assigns them.
- Other feature folders.

Packet MD-A2-DOC-1: Module documentation update.

Owner: same developer who lands the integrated backend/frontend behavior, or Senior Fullstack Lead if assigned.  
Write scope:

- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- Optional focused QA/developer handoff docs assigned by Orchestrator under `docs/codex-agent-team-plan/`

Forbidden for this packet:

- Any production code not already owned by MD-A2-BE-1 or MD-A2-FE-1.

Integration rule:

- MD-A2-BE-1 must land or be available as a branch/handoff before MD-A2-FE-1 wires the real polling UI.
- If one developer does both backend and frontend in a single implementation pass, they still must keep commits/scoped staging aligned to these file groups and avoid unrelated changes.

## 7. QA Evidence Required

Automated backend/API evidence:

- Starting a run returns quickly with `runId` and does not wait for provider processing.
- Status endpoint reports `processedCount`, `totalCount`, `batchesExecuted`, terminal status, warnings/errors, and scoped `region`/`assetType`.
- Start while an active same-scope run exists returns the existing active run and does not create overlapping provider work.
- Batch size and concurrency caps reject or clamp unsafe values.
- The run uses bounded repository selection and never performs a full-universe provider loop in the start request.
- Freshness-gated no-new-data path completes without provider fetch and reports skip counts.
- Error path records recent errors and terminal/partial status without hanging the run.

Automated frontend/UI evidence:

- Playwright test for `Sync Catalog` start mocks the new start/status endpoints and asserts:
  - button immediate disabled/running state,
  - visible `Catalog sync progress` progress bar,
  - scoped `region`/`assetType`,
  - determinate processed/total counts,
  - success or partial summary after terminal status.
- Playwright test proves the button no longer posts to `/api/market-data-foundation/stocks/sync-all`.
- Playwright test for `PARTIAL hasMore=true` shows `Continue catalog sync`.
- Playwright test for cancel sends the cancel request and shows partial/cancel state.
- Existing import/backfill tests continue to pass.

Manual/live local evidence:

- With local services running, click `Sync Catalog` for the active market scope and capture that the start request returns in under 2 seconds on a normal local machine.
- Capture at least two status polls with increasing `processedCount` or a valid no-new-data terminal result.
- Capture browser-visible progress bar and counts while work is running.
- Capture final `COMPLETED` or `PARTIAL` summary.
- Confirm request payloads include `region` and `assetType`.
- Confirm no single browser request remains pending for the whole catalog duration.
- Confirm backend logs or API evidence show bounded `batchSize` and capped provider concurrency.

Do not run destructive, very large, or provider-heavy full-universe operations inside Playwright. UI tests should mock the bulk run. Manual validation may use a small bounded run or a freshness-gated run and must record the chosen scope and bounds.

## 8. Risks And Deferred Items

Risks:

- In-memory run status is lost on server restart. This is acceptable for the smallest local-first change but must be shown clearly in the UI through `RUN_NOT_FOUND`.
- Existing worker code creates separate Prisma clients. The implementation must disconnect reliably and avoid increasing worker counts beyond the new caps.
- Existing `syncAll` behavior may still be available to non-UI callers. If it remains, it is technical debt and must not be used by the frontend button.
- Provider behavior can be slow or flaky. The run must expose partial progress and recent errors rather than hiding them behind one final failure.
- If repository pagination uses offset over a mutating eligibility set, rows can be skipped. Prefer selecting the first remaining eligible batch repeatedly, or use stable ordered IDs/cursors that do not skip when rows become synced.

Deferred items:

- Durable DB-backed job/run table.
- Cross-process/distributed queue.
- Server-sent events or WebSocket progress streaming.
- Global provider rate limiter shared across all market-data workflows.
- Redesign of the old `/stocks/sync-all` endpoint after the UI has fully moved to the bounded run API.

Architecture decision:

Backend job/status polling is selected. The frontend starts one bounded server-owned catalog sync run, polls status, and displays progress. Provider throttles, scope filtering, and concurrency caps remain in the backend module.
