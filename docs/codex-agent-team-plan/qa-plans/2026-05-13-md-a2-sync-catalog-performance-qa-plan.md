# MD-A2 Sync Catalog Progress And Bulk Performance QA Plan - 2026-05-13

Mode: `QA Verification Planning`  
Owner: MD-A2 QA Planner  
Work item: MD-A2 - Sync Catalog Progress And Bulk Performance  
Lane/module: Lane 1, `market-data-foundation`  
Write scope for this QA pass: this file only.

## Sources Read

- [MD-A2 architecture contract](../architecture-contracts/2026-05-13-md-a2-sync-catalog-performance-contract.md)
- [Market Data full module PO audit](../po-audits/2026-05-13-market-data-full-module-po-audit.md)
- [Developer Pre-QA Validation Gate](../codex-agent-team.md#developer-pre-qa-validation-gate)

## QA Objective

QA must prove that the visible `Sync Catalog` workflow can no longer start one hidden whole-universe synchronous provider run. The accepted behavior is a backend-owned, bounded catalog sync run that returns quickly, exposes progress through status polling, caps provider concurrency, supports cancellation and continuation, handles lost in-memory run state, and gives the user usable partial/final evidence.

MD-A2 is not accepted if it only changes labels or adds a spinner around the old `/stocks/sync-all` request.

## QA Entry Conditions

QA execution can start only after the developer handoff includes:

- Changed files grouped by backend packet, frontend packet, test files, and docs.
- Confirmation that the `Sync Catalog` button calls `POST /api/market-data-foundation/stocks/sync-runs`, not the legacy `/stocks/sync-all` path.
- Confirmation that no Prisma migration, Redis, external queue, paid provider, hosted service, broker API, order placement, or live trading behavior was added.
- Backend test output for the run coordinator, route/controller contract, bounded repository selection, cancellation, partial/failure, and no-progress behavior.
- Frontend build/typecheck output for changed UI/API types.
- Focused Playwright output for the mocked `Sync Catalog` workflow.
- Local API or browser evidence that the start request returns quickly and polling displays progress or a valid no-new-data terminal result.
- Any skipped check recorded with exact command, blocker, risk, and next owner.

QA rejects the handoff if basic validation evidence is missing without an accepted blocker.

## Developer Pre-QA Validation Checklist

The developer handoff must complete or explicitly justify every item below before `Ready for QA`.

| Check | Required developer evidence | Pass/Fail | Evidence link or notes |
| --- | --- | --- | --- |
| Backend focused tests | Exact command and output for market-data-foundation sync-run coordinator/API tests. |  |  |
| Backend route contract | Request/response samples for start, active-run duplicate, status, cancel, validation/caps, and `RUN_NOT_FOUND`. |  |  |
| Bounded selection proof | Test/log/static note proving run loop uses bounded repository selection with `take`/equivalent and the start request does not process the full universe. |  |  |
| Provider concurrency cap proof | Test or implementation evidence showing defaults `1 x 2`, hard caps `2 x 3`, and no frontend request loop multiplies provider calls. |  |  |
| Frontend build/typecheck | Exact command and output for changed frontend types/components/API client. |  |  |
| Focused Playwright smoke | Exact command and output for mocked Sync Catalog progress tests. |  |  |
| API responsiveness check | Local evidence that `POST /stocks/sync-runs` returns in under 2 seconds for a bounded/no-new-data run. |  |  |
| UI progress smoke | Browser evidence that progress panel appears immediately and terminal/partial summary appears. |  |  |
| Docs verification | Confirmation that route names, response fields, statuses, and workflow docs match implementation. |  |  |
| Compatibility safety | Evidence that visible UI no longer posts to `/stocks/sync-all`; if legacy endpoint changed, its compatibility behavior is tested. |  |  |

## Automated Backend/API Test Plan

Preferred backend scope: focused tests under the existing backend test structure for `market-data-foundation`. If exact filenames differ after implementation, QA records the closest focused command and why.

Suggested command:

```powershell
npm test -- market-data-foundation --runInBand
```

### Required Backend Scenarios

| Scenario | Expected result | Pass/Fail | Evidence field |
| --- | --- | --- | --- |
| Start run returns quickly | `POST /api/market-data-foundation/stocks/sync-runs` returns `202` with `success=true`, `runId`, `status`, `region`, `assetType`, counts, `startedAt`, and `statusUrl`; provider processing continues outside the original HTTP request. |  | Command, test name, elapsed time, response sample. |
| Required scope preserved | Start/status/cancel all preserve normalized `region`, `assetType`, and `scopeType=CATALOG`; worker/service calls cannot drift scope. |  | Command, assertions, response sample. |
| Active same-scope run dedupes | Starting a second run for the same `region + assetType + CATALOG` returns the existing `runId`, includes `alreadyRunning=true`, and does not create overlapping provider work. |  | Command, assertion proving one coordinator task. |
| Different scopes do not collide | Runs for different supported scopes are either independently accepted or explicitly blocked only by documented resource policy; same-scope dedupe remains strict. |  | Command, response samples. |
| Batch size cap | `batchSize` defaults to `25`, hard max `50`, min `1`; unsafe input is rejected or clamped per implementation contract with clear API evidence. |  | Command, payloads, responses. |
| Worker cap | `workerCount` defaults to `1`, hard max `2`; unsafe input is rejected or clamped. |  | Command, payloads, responses. |
| Worker concurrency cap | `workerConcurrency` defaults to `2`, hard max `3`; effective provider concurrency never exceeds `workerCount * workerConcurrency`. |  | Command, assertions/log evidence. |
| Coordinator delay | `delayBetweenBatchesMs` defaults to `3000`, min `1000`, max `30000`, and applies between coordinator batches rather than per-browser loop. |  | Command, assertion or timing proof. |
| Max batches bound | `maxBatches` defaults to `20`, hard max `100`; hitting the bound ends as `PARTIAL` with `hasMore=true` when eligible work remains. |  | Command, status response. |
| Bounded repository selection | Run loop never calls full active stock sync selection without `take`/equivalent; each batch selects only the next bounded eligible set. |  | Test assertion, mock verification, or static evidence. |
| Freshness-gated no-new-data | Recently synced/final-confirmed rows complete quickly without provider fetch and report skip/no-op counts. |  | Command, provider mock call count, response sample. |
| Completed EOD safety preserved | Catch-up can fetch missing completed daily candles but does not request current in-progress daily candles for EOD review workflows. |  | Command and assertion tied to MD-A1 behavior. |
| Batch failures aggregate | Per-symbol/batch failures increment `failedCount`, record capped `recentErrors`, continue where safe, and do not hang the run. |  | Command, recentErrors sample. |
| Run-level early failure | Unrecoverable failure before meaningful progress marks `FAILED` and exposes a useful message/recent error. |  | Command, response sample. |
| Zero-progress guard | If a batch processes zero rows while `hasMore` appears true, run stops as `PARTIAL` with warning instead of looping. |  | Command, warning sample. |
| Cancellation | `POST /sync-runs/:runId/cancel` requests cancellation, lets the in-flight batch finish, stops before the next batch, and reaches `CANCELED` or contract-approved `PARTIAL` state. |  | Command, status transition evidence. |
| Lost run state | Unknown/expired run id returns `404` with `code=RUN_NOT_FOUND` and the documented message. |  | Command, response sample. |
| Memory bounds | Terminal runs, warnings, and recent errors are capped to the implemented retention policy. |  | Command, assertion showing caps. |
| Worker cleanup | Worker-owned Prisma clients are disconnected in `finally`, including error/cancel paths. |  | Test assertion, mock verification, or implementation evidence. |

### Backend Rejection Criteria

- Start endpoint holds the HTTP request open for provider work.
- Visible workflow still depends on `/stocks/sync-all`.
- Provider-facing run can process an unlimited universe from one click.
- Effective provider concurrency can exceed `2 x 3` or frontend loops multiply provider calls.
- Status omits scoped `region`/`assetType`, progress counts, terminal state, warnings/errors, or partial information.
- Cancellation requires killing in-flight provider calls or leaves the run active indefinitely.
- Lost in-memory run status is hidden instead of returning `RUN_NOT_FOUND`.

## Automated Frontend/UI Mocked Test Plan

Preferred UI scope: `frontend/tests/ui/market-data-foundation.spec.ts` or the focused UI spec chosen by the implementation packet. UI tests must mock bulk sync-run APIs and must not run provider-heavy operations.

Suggested command:

```powershell
npm.cmd run test:ui -- market-data-foundation.spec.ts --workers=1
```

### Required UI Scenarios

| Scenario | Expected result | Pass/Fail | Evidence field |
| --- | --- | --- | --- |
| Start request uses new endpoint | Clicking `Sync Catalog` sends `POST /api/market-data-foundation/stocks/sync-runs` with `region`, `assetType`, and bounded defaults; test fails if `/stocks/sync-all` is called. |  | Playwright test name, intercepted request payload. |
| Immediate running feedback | Within one UI tick, button is disabled/running and a visible progress panel or alert appears. |  | Playwright assertion, screenshot if collected. |
| Accessible progress | Progress bar is present with accessible label `Catalog sync progress`. |  | Playwright locator assertion. |
| Scoped run identity | UI displays selected `region/assetType`, `batchSize`, and provider concurrency while active. |  | Playwright assertion. |
| Determinate progress | With mocked `totalCount > 0`, UI shows processed/total and percent from response or derived counts. |  | Mock statuses and assertion. |
| Live counts | UI renders processed, total, succeeded, failed, skipped, no-op, rows inserted, rows updated, rows skipped, and warnings. |  | Playwright assertion. |
| Batch progress | UI renders `batch X of Y` where status provides batch values. |  | Playwright assertion. |
| Polling stops on terminal | UI polls every 1-2 seconds while `PENDING`/`RUNNING` and stops after `COMPLETED`, `PARTIAL`, `FAILED`, or `CANCELED`. |  | Intercept count/timing evidence. |
| Completed summary | Terminal `COMPLETED` shows final counts and refreshes catalog/scheduler summary only after terminal status. |  | Playwright assertion and request count evidence. |
| Partial continue | Terminal `PARTIAL` with `hasMore=true` shows final partial summary and accessible `Continue catalog sync` action that starts another bounded same-scope run. |  | Playwright assertion and second start payload. |
| Cancel | `Cancel catalog sync` sends `POST /sync-runs/:runId/cancel` and UI shows cancellation/partial state without leaving active controls stuck. |  | Playwright assertion and intercepted request. |
| Lost run state | Mocked `404 RUN_NOT_FOUND` explains server run state was lost and allows starting a new run. |  | Playwright assertion. |
| Failure/recent errors | `FAILED` or `PARTIAL` with warnings/errors shows clear summary, recent errors, and retry/continue guidance without hiding counts. |  | Playwright assertion. |
| Non-conflicting controls remain usable | Table filters, tabs, and navigation remain usable while only conflicting catalog sync controls are disabled. |  | Playwright interaction assertions. |
| Import/backfill isolation | Existing import/backfill progress behavior remains separate and still passes existing tests. |  | Existing/focused test output. |

### UI Rejection Criteria

- UI shows only a spinner with no counts/status for a long-running run.
- UI posts to `/stocks/sync-all` from the visible button.
- Progress has no accessible label.
- `PARTIAL`, cancel, failure, or `RUN_NOT_FOUND` leaves the user without restart/continue guidance.
- Polling continues after terminal status.
- Normal page navigation/filtering is blocked during a catalog sync.

## Manual Bounded Live Checks

Manual/live QA must be bounded and recorded. Do not run destructive, very large, or full-universe provider-heavy checks. Prefer a freshness-gated scope or a small bounded run such as `batchSize <= 5`, `workerCount=1`, `workerConcurrency=1`, and `maxBatches=1` unless the work packet explicitly approves a larger bound.

### Live Evidence Checklist

| Check | Required evidence | Pass/Fail | Evidence field |
| --- | --- | --- | --- |
| Local services and scope | Record backend URL, frontend URL, authenticated/test user state if relevant, `region`, `assetType`, `batchSize`, `workerCount`, `workerConcurrency`, `delayBetweenBatchesMs`, and `maxBatches`. |  | URLs, payload, timestamp. |
| Start responsiveness | Browser/network or API evidence that start request returns in under 2 seconds on a normal local machine. |  | Request timing and response body. |
| No long pending browser request | Network evidence that no single browser request remains pending for the whole catalog duration. |  | Network observation/screenshot/log. |
| Status polling | Capture at least two status polls with increasing `processedCount`, or a valid no-new-data terminal result with skip/no-op counts. |  | Response bodies or summarized fields. |
| Visible progress | Browser-visible progress bar and counts while work is running, or immediate terminal no-new-data summary. |  | Screenshot path or manual observation note. |
| Terminal summary | Capture final `COMPLETED`, `PARTIAL`, `FAILED`, or `CANCELED` summary with counts and warnings/errors if present. |  | Response/UI evidence. |
| Scope in payloads | Confirm start/status include `region` and `assetType`. |  | Payload/response sample. |
| Bounds in backend evidence | Confirm backend API/log evidence shows bounded `batchSize`, capped provider concurrency, and `maxBatches`. |  | Log/API excerpt. |
| Legacy endpoint absent | Confirm visible `Sync Catalog` does not call `/stocks/sync-all`. |  | Network observation. |
| Post-terminal refresh | Confirm catalog table and scheduler/status summary refresh after terminal status, not after every poll. |  | Request count or observation. |

## Performance And Progress Acceptance

MD-A2 passes performance/progress acceptance only if all of these are true:

- Start response returns in under 2 seconds for the bounded/no-new-data local check.
- Provider work is done by the backend coordinator after the start response, not by holding the original browser request open.
- Default provider-facing concurrency is `2` and hard maximum effective provider concurrency is `6`.
- Default batch size is `25` and hard maximum provider-facing batch size is `50`.
- Default `maxBatches` is `20` and hard maximum is `100`.
- Status includes enough fields to explain progress: `processedCount`, `totalCount`, `currentBatchNumber`, `batchesPlanned`, `batchesExecuted`, success/failure/skip/no-op counts, row insert/update/skip counts, warning count, warnings, recent errors, `hasMore`, `percentComplete`, timestamps, and terminal message.
- Progress is determinate when totals are available and indeterminate only during start or unknown-total states.
- Large remaining work ends as `PARTIAL` with `hasMore=true`, not as a hidden endless run.

## Cancellation, Partial, And Lost-Run Acceptance

| Case | Required behavior | Pass/Fail | Evidence field |
| --- | --- | --- | --- |
| User cancellation | Cancel action is available while active, uses `POST /sync-runs/:runId/cancel`, does not abort in-flight provider calls mid-call, and stops before the next batch. |  | API/UI test evidence. |
| Canceled terminal state | Final state is `CANCELED` or contract-approved `PARTIAL`; UI stops polling, shows final counts, and leaves restart/continue path clear. |  | Status response and UI assertion. |
| Max-batch partial | Run reaching `maxBatches` with remaining eligible rows ends `PARTIAL`, `hasMore=true`, and `Continue catalog sync` starts a new same-scope bounded run. |  | Backend and UI evidence. |
| Recoverable provider partial | Mixed successes/failures continue safely, aggregate recent errors, and avoid whole-run failure when meaningful progress exists. |  | Backend status evidence. |
| No-progress partial | Zero processed rows with apparent remaining work stops as `PARTIAL` with warning, preventing infinite loops. |  | Backend status evidence. |
| Run-level failure | Unrecoverable coordinator failure before meaningful progress marks `FAILED`; UI shows failure summary and does not keep controls stuck. |  | Backend/UI evidence. |
| Lost in-memory state | `GET /sync-runs/:runId` returning `404 RUN_NOT_FOUND` tells the user the server run state was lost and permits starting a new bounded run. |  | API/UI evidence. |

## Explicit QA Evidence Record Template

QA evidence should include this table or an equivalent structured record in the MD-A2 QA evidence file.

| Evidence item | Status | Command/request | Key fields observed | Artifact link/path | Gaps or risk |
| --- | --- | --- | --- | --- | --- |
| Backend tests |  |  |  |  |  |
| Frontend tests |  |  |  |  |  |
| Start endpoint response |  |  |  |  |  |
| Status polling response |  |  |  |  |  |
| Cancel response |  |  |  |  |  |
| Partial/continue behavior |  |  |  |  |  |
| Lost-run behavior |  |  |  |  |  |
| Legacy endpoint not called |  |  |  |  |  |
| Manual bounded live check |  |  |  |  |  |
| Performance/progress acceptance |  |  |  |  |  |

Each row must be marked `PASS`, `FAIL`, `BLOCKED`, or `NOT RUN`. `NOT RUN` requires a blocker reason and owner.

## Final Rejection Criteria

Reject MD-A2 if any of these are true:

- The visible button can still trigger a whole-universe synchronous provider request.
- Start/status/cancel APIs do not match the architecture contract or omit required scope/progress fields.
- Provider concurrency, batch size, or max-batch bounds are missing, frontend-controlled, or unsafe.
- Same-scope overlapping runs can execute concurrently.
- Partial, cancellation, no-progress, failure, or lost-run states are not visible and recoverable in the UI.
- Manual/live QA cannot prove a quick start response and no long pending browser request.
- Developer handoff lacks required pre-QA validation evidence without an accepted blocker.

## QA Signoff Standard

QA signoff requires passing backend focused tests, mocked UI tests, and at least one bounded live/local check. The signoff must explicitly state whether MD-A2 meets the PO acceptance standard: the user can safely refresh catalog market data with visible bounded progress, partial/final counts, cancellation/retry guidance, and no hidden multi-hour request from the visible `Sync Catalog` action.
