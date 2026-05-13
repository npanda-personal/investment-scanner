# MD-A3 Deep Price Backfill For Supported Shallow Rows Architecture Contract

Date: 2026-05-13  
Mode: Architecture Planning Mode  
Owner: MD-A3 Solution Architect Agent  
Lane/module: Lane 1, `market-data-foundation`  
Work item: MD-A3 - Deep Price Backfill For Supported Shallow Rows  
Owned artifact: `docs/codex-agent-team-plan/architecture-contracts/2026-05-13-md-a3-deep-price-backfill-contract.md`

## 1. Current State From Read-Only Inspection

PO audit decision: MD-A3 is required because provider-supported rows can be shallow even after prior scheduled/bootstrap sync. A row with `lastSuccessfulDataLoadTimestamp` can later receive only a short incremental overlap and never reach the 120/200/252 bar windows required by Today Review Lite, Data Quality, Strategy Decision, Signal Quality, Smart Money, and Trade Plans.

Current backend facts:

- `POST /api/v1/market-data/prices/backfill` exists and calls `service.backfillPrices`.
- `backfillPrices` scopes by `region` and `assetType`, builds a mutating batch with `offset=0`, selects `priceBackfillCandidates`, and caps the provider `endDate` to `latestCompletedTradingDateForRegion(scope.region)`.
- `priceBackfillCandidates` includes active, non-delisted, provider-supported rows whose `readiness.priceReadiness !== READY`.
- `repairPlan` and `universeHealth` already count provider-supported rows needing price backfill through `supportedPriceBackfillNeeded`.
- `repairRun` already has `BACKFILL_PRICES` in the operational repair-run action set and calls `backfillPrices` for bounded batches.
- `trustedReviewUniverseEvaluation` requires current latest EOD, 120+ OHLCV bars, recent volume, and no critical corporate-action blocker. It separately counts under-252-bar rows for lite/full distinction.
- `ingestSymbol` uses a 15-year default start only for first-time load or `fullReload=true`. Otherwise, a stock with `lastSuccessfulDataLoadTimestamp` uses that timestamp minus a 3-day overlap.
- The existing UI `Backfill prices` action sends a bounded repair request with `force=true`, but it does not send `fullReload=true`.
- Provider mapping currently fills `adjustedClose` from `adjClose`/`adjclose`/`adjustedClose` and falls back to `close`; this can make close fallback look like adjusted-close coverage after storage.

Root defect for MD-A3:

The system has a bounded price-backfill lane, but the lane is not domain-deep by default. Operator-facing repair should not require knowing or setting `fullReload`. Supported shallow rows must automatically fetch enough historical EOD data to satisfy trusted review and deeper downstream windows, while still respecting the latest completed EOD cap and provider safety limits.

## 2. Architecture Decision

Chosen option: strengthen the existing price-backfill repair lane into a deep-backfill policy, not a new subsystem.

MD-A3 must keep using:

- `POST /api/v1/market-data/prices/backfill`
- `POST /api/v1/market-data/universe/repair-run` with action `BACKFILL_PRICES`
- existing `repairPlan`, `review-readiness-summary`, `trusted-review-universe`, and `universe/health` counts
- existing local/free Yahoo provider integration only

The backend service, not the operator or frontend, owns the deep lookback decision. For provider-supported shallow rows, `backfillPrices` must request a deep history window even when `request.fullReload` is absent. `fullReload` remains an advanced compatibility flag, but normal repair semantics become domain action semantics: "Backfill prices" means "repair shallow or stale supported price history to the configured review depth."

Rejected option: add a separate "deep backfill" endpoint.

Reason: the product already exposes a price-backfill lane and repair-run action. A second endpoint would split queue counts, UI actions, tests, and operator guidance while solving the same provider-supported price-readiness gap.

## 3. Backend Service Contract

### Candidate Selection

`priceBackfillCandidates(scope)` must select only rows that meet all of these rules:

- `region` and `assetType` match the request scope after normalization.
- `isActive !== false` and `isDelisted !== true`.
- `providerSupportStatus === SUPPORTED`.
- Price readiness is not ready because at least one of these is true:
  - no latest stored EOD price,
  - latest stored EOD is older than latest completed trading date,
  - fewer than 120 bars,
  - fewer than 200 bars,
  - fewer than 252 bars,
  - missing/recently zero volume prevents trusted review.

Candidate ordering must be deterministic and product-oriented:

1. Missing latest EOD first.
2. Rows under 120 bars.
3. Rows under 200 bars.
4. Rows under 252 bars.
5. Stale latest EOD with otherwise sufficient depth.
6. Symbol ascending as a stable tiebreaker.

This keeps `batchSize=50` useful by repairing the rows most likely to unlock non-zero trusted membership first.

### Deep Lookback Policy

Default policy for `BACKFILL_PRICES`:

- If a candidate has fewer than 252 bars, use a deep start date without requiring `request.fullReload`.
- Deep start date default: 15 years before the latest completed trading date, matching the existing `defaultBackfillStartDate` intent.
- The service may implement this by passing `fullReload=true` internally or by passing an explicit `startDate`; the externally visible behavior must be the same.
- For a row with at least 252 bars but stale latest EOD, use a bounded incremental catch-up window. The start date should be the later of:
  - latest stored EOD minus 7 calendar days, or
  - latest completed trading date minus 30 calendar days.
- For a row with no stored prices, use the deep start date.
- `request.fullReload=true` remains accepted and forces deep start for every selected candidate.
- `request.fullReload=false` must not prevent deep repair for rows below the required depth. It only prevents deep reload for rows that already have enough depth and need stale-EOD catch-up.

Implementation note: do not rely on `lastSuccessfulDataLoadTimestamp` for shallow-row repair. That timestamp is the cause of the shallow-history trap and is appropriate for normal incremental sync, not for MD-A3 deep repair.

### Latest Completed EOD Cap

Every provider fetch performed by MD-A3 must cap `endDate` to `latestCompletedTradingDateForRegion(scope.region)` converted to end-of-day UTC.

Required behavior:

- Do not request an in-progress current-day candle for EOD review workflows.
- If `latestCompletedTradingDateForRegion` returns `null`, stop the batch before provider calls and return a warning/error summary that names `MARKET_CALENDAR_UNCERTAIN`.
- The response must expose `targetEndDate` or equivalent warning evidence so QA can prove the cap used a completed EOD date.
- Scheduler/session catch-up logic from MD-A1 remains valid; MD-A3 must not bypass the completed-EOD cap through `force` or `fullReload`.

### Provider Symbol And Storage Rules

- Fetch with `stock.providerSymbol || stock.symbol`; store under the canonical local `stock.symbol`, preserving the current application key model.
- Keep existing idempotent upsert behavior by `symbol + timestamp`.
- A successful non-zero OHLCV ingest remains provider-support proof and may keep/repair `providerSupportStatus=SUPPORTED`.
- Zero usable provider rows must not count as success. It must increment zero-row/skipped/failure diagnostics and leave the row visible as still shallow unless product policy explicitly reclassifies provider support.
- Missing or zero recent volume remains a blocker for trusted review.
- Adjusted-close honesty must improve without a schema migration:
  - New provider mapping should store `adjustedClose=null` when the provider does not supply an adjusted close field, rather than copying `close` into `adjustedClose`.
  - Readiness and sample evidence should continue to expose `usesAdjustedCloseFallback`.
  - Legacy rows whose adjusted-close provenance cannot be known may be reported with a warning; a schema-backed provenance flag is deferred and not part of MD-A3.

## 4. API/Data Contract

Existing route remains canonical:

`POST /api/v1/market-data/prices/backfill`

Request:

```json
{
  "region": "IN",
  "assetType": "STOCK",
  "batchSize": 50,
  "force": true,
  "fullReload": false,
  "policy": "AUTO_DEEP_FOR_SHALLOW"
}
```

Field rules:

- `region`: required by UI, defaulted by backend to `IN` for compatibility.
- `assetType`: required by UI, defaulted by backend to `STOCK` for compatibility.
- `batchSize`: optional, default `50`, hard max `100` from existing repair batch helper. UI should continue sending `50`.
- `offset`: ignored for mutating price queues; backend always processes from the current first remaining candidates with `offset=0`.
- `force`: defaults to true for repair. It bypasses cooldown but not the completed-EOD cap.
- `fullReload`: compatibility/advanced field. It must not be required for deep shallow-row repair.
- `policy`: optional future-readable string. If implemented, supported values are `AUTO_DEEP_FOR_SHALLOW` and `FORCE_DEEP`. If omitted, default is `AUTO_DEEP_FOR_SHALLOW`.

Response must extend or populate `MarketDataRepairSummary` with enough diagnostics for operator and QA evidence:

```json
{
  "scope": { "region": "IN", "assetType": "STOCK" },
  "processedCount": 50,
  "totalCount": 585,
  "batchSize": 50,
  "offset": 0,
  "nextOffset": 0,
  "hasMore": true,
  "updated": 43,
  "skipped": 4,
  "failed": 3,
  "noOp": 0,
  "priceRowsReceived": 7250,
  "priceRowsInserted": 6900,
  "priceRowsUpdated": 10,
  "priceRowsNoOp": 340,
  "zeroRowProviderReturns": 4,
  "deepReloaded": 39,
  "incrementalCaughtUp": 8,
  "stillUnder120": 2,
  "stillUnder200": 6,
  "stillUnder252": 11,
  "latestCompletedEodDate": "2026-05-12",
  "targetEndDate": "2026-05-12T23:59:59.999Z",
  "remainingCandidates": 542,
  "warnings": []
}
```

Required new/filled response evidence:

- rows received, inserted, updated, no-op,
- provider zero-row count,
- failed count,
- skipped count,
- deep-reloaded candidate count,
- incremental-catch-up candidate count,
- remaining candidates,
- still-under-120, still-under-200, and still-under-252 counts after the batch,
- latest completed EOD date and target end date used for provider calls,
- warnings capped to a reasonable size.

If implementation avoids type expansion, these fields may initially live in `warnings` and test-only summaries are not enough. The API response must expose machine-readable counts for QA and UI.

## 5. Existing Repair/Backfill Integration

`repairPlan`:

- `supportedPriceBackfillNeeded` remains the primary queue count.
- It must include supported rows below 120, below 200/252, stale latest EOD, missing latest price, and missing recent volume where price repair can plausibly fix the row.
- It must not count unsupported, unknown-provider, retry-failed-provider, inactive, or delisted rows in the supported price queue.

`review-readiness-summary`:

- Next action remains `BACKFILL_PRICES` when provider-supported price depth/freshness blocks trusted review.
- Bounded request remains `{ region, assetType, batchSize: 50 }`; it must not include `fullReload` for normal user actions.

`repairRun`:

- `BACKFILL_PRICES` continues to execute after provider validation and catalog identity repair in dependency order.
- Operational `DRAIN_UNTIL_BLOCKED` may run multiple bounded price batches up to `maxBatchesPerAction`.
- No-progress detection must treat a batch as blocked when candidate count does not decrease and the batch yields no inserted/updated/no-op rows, only zero-row/failure/skips.
- A completed repair run can still leave `universeSignoff.status=FAIL`; UI must not show it as green unless trust/signoff also pass.

UI workbench:

- Existing "Backfill prices" button remains the action.
- Button label can remain concise, but adjacent counts must show that the lane repairs shallow history and stale EOD, not only missing prices.
- Normal UI request should send `force=true`, `region`, `assetType`, and `batchSize=50`; it should not expose `fullReload` as a normal operator choice.

## 6. Batching, Concurrency, And Performance Rules

- Keep `batchSize=50` default for UI and repair-run price batches.
- Keep hard cap `100` for one direct price-backfill batch unless Orchestrator approves a lower provider-safety cap.
- Process price-backfill candidates sequentially inside the batch unless a centralized provider limiter is added. Do not introduce frontend-driven parallel provider loops.
- If backend concurrency is added later, default effective provider concurrency must be `1`, hard max `2`, with one service-owned limiter shared by the batch.
- Do not combine MD-A3 with MD-A2 catalog sync worker multiplication. Catalog sync concurrency settings must not apply to repair price backfill.
- Do not fetch the full active catalog. Select only supported price-backfill candidates for the requested scope.
- Mutating price queues must continue using offset-zero semantics so repaired rows leaving the queue do not cause skipped rows.
- Per-symbol provider failures should not fail the entire batch. Aggregate them and continue until the bounded batch finishes.
- Cap warning arrays in API responses. Machine-readable counts must carry the important totals.
- No paid providers, broker APIs, hosted queues, paid test services, or paid UI/chart libraries.

## 7. Frontend UX Requirements

No new screen is required. The existing Market Data status/repair workbench is the right home.

Required UX behavior:

- Show `supportedPriceBackfillNeeded`, stale latest price count, under-120 count, under-252 count, and missing recent volume count where available from current health/trusted universe responses.
- The price lane text should make clear that the repair backfills shallow supported rows and catches up completed EOD.
- While a direct price batch is running, disable competing repair buttons and show the active action.
- After completion, show processed, total, updated, failed, skipped, no-op, rows inserted/updated/no-op, zero-row provider returns, remaining candidates, and still-under-120/200/252 counts when present.
- If `hasMore=true`, show that another bounded run is needed. This can reuse existing repair-run partial/another-run-needed treatment.
- Do not show "completed" as success if the refreshed trusted universe remains `NO_REVIEW` or `universeSignoff.status=FAIL`.
- Do not expose a normal "Full reload" toggle. The backend owns deep repair. An advanced/debug-only flag may exist in API tests but should not be a visible user workflow.

## 8. Tests Required

Backend service/API tests:

- Supported row with 20 stored bars and a recent `lastSuccessfulDataLoadTimestamp` is deep-backfilled without `request.fullReload`.
- Supported row with 119 bars remains in queue before repair and is counted under 120; after provider returns enough rows, the queue decreases.
- Supported row with 180 bars is counted under 200/252 and uses deep repair or enough historical lookback to cross deeper thresholds.
- Row with 252+ bars but stale latest EOD uses incremental catch-up capped to latest completed EOD.
- End date is capped to `latestCompletedTradingDateForRegion`; current-day in-progress candles are not requested.
- If latest completed trading date is unavailable, provider fetch is skipped and `MARKET_CALENDAR_UNCERTAIN` is reported.
- `fullReload=false` does not block deep repair for shallow rows.
- `fullReload=true` forces deep repair for all selected candidates.
- Zero provider rows are not counted as successful updates and are exposed in zero-row diagnostics.
- Provider-supported filter excludes `UNKNOWN`, `VALIDATION_FAILED`, `UNSUPPORTED`, inactive, and delisted rows.
- Mutating queue uses offset-zero semantics across repeated batches.
- Repair-run `BACKFILL_PRICES` aggregates deep-backfill diagnostics and marks another run needed when batch limits are reached.
- Adjusted-close mapping does not fake adjusted-close coverage when provider adjusted close is absent.

Frontend/UI tests:

- `Backfill prices` request payload includes `region`, `assetType`, `batchSize`, and `force`, but not `fullReload`.
- Price lane displays supported price-backfill count and trusted-universe shallow counts.
- Direct backfill result displays processed/total and inserted/updated/no-op row evidence.
- Result with `hasMore=true` shows another bounded run is needed.
- Result with zero-row provider returns shows warning/neutral treatment, not green success.
- A completed repair action followed by `NO_REVIEW`/failed signoff still renders blocked/trust warning treatment.

Regression tests:

- Existing provider validation, catalog identity, provider business metadata, manual metadata, and MD-A2 catalog sync progress tests must remain valid.
- Today Review, Trade Plans, and Signal Quality must continue to fail closed before trusted membership improves.

## 9. QA Evidence Required

Automated evidence:

- Backend test output for all MD-A3 service/API cases above.
- UI test output proving normal user payload does not require `fullReload`.
- Test fixture or mocked provider evidence showing requested `period1` is deep for shallow rows and `period2` is latest completed EOD.

Manual/live local evidence before Market Data is considered healthier:

- Capture `GET /api/v1/market-data/universe/repair-plan?region=IN&assetType=STOCK` before and after at least one bounded price batch.
- Capture `GET /api/v1/market-data/review-readiness-summary?region=IN&assetType=STOCK` before and after.
- Capture `GET /api/v1/market-data/review-universe?region=IN&assetType=STOCK` before and after.
- Capture one `POST /api/v1/market-data/prices/backfill` or repair-run response with:
  - bounded `batchSize`,
  - latest completed EOD cap,
  - rows received/inserted/updated/no-op,
  - zero-row/skipped/failed counts,
  - remaining candidates,
  - still-under-120/200/252 counts.
- Sample at least 20 trusted instruments after repair and prove current latest EOD, 120+ bars, recent positive volume, and adjusted-close/fallback status.
- Sample a deeper set and prove 200/252-bar coverage for Data Quality, Strategy Decision, Trade Plans, and SMA-style logic.

Do not run a destructive or unbounded full-universe provider operation for QA. Use bounded batches and record the scope and batch size.

## 10. Implementation Packets And Write Scopes

Packet MD-A3-BE-1: Backend deep price-backfill policy and diagnostics.

Owner: Lane 1 backend developer.  
Write scope:

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.provider.ts`
- Backend tests under the existing backend test structure for market-data foundation

Forbidden:

- Prisma schema or migrations for MD-A3 unless Orchestrator explicitly approves a follow-up.
- Frontend files.
- Paid providers/services/tools.
- Broker APIs or live trading integrations.

Packet MD-A3-FE-1: Repair workbench UX evidence for deep price backfill.

Owner: Lane 1 frontend/fullstack developer after backend diagnostics are available.  
Write scope:

- `frontend/src/features/market-data-foundation/types.ts`
- `frontend/src/features/market-data-foundation/api/marketDataFoundationService.ts`
- `frontend/src/features/market-data-foundation/components/MarketDataStatusPanel.tsx`
- `frontend/tests/ui/market-data-foundation.spec.ts`

Forbidden:

- Backend files.
- New screens unless Orchestrator explicitly requests them.
- Exposing `fullReload` as a normal operator control.

Packet MD-A3-QA-1: Local evidence capture.

Owner: QA/Orchestrator assigned agent after implementation.  
Write scope:

- QA evidence document assigned by Orchestrator under `docs/codex-agent-team-plan/`

Forbidden:

- Production code.
- Long unbounded provider runs.

## 11. Forbidden Scope For MD-A3

MD-A3 must not:

- Modify production source during architecture planning.
- Add paid providers, paid APIs, paid hosted tools, broker APIs, or live trading services.
- Relax Today Review, Strategy Decision, Signal Quality, Smart Money, Trade Plan, or universe signoff gates to hide missing data.
- Treat catalog count or provider-supported count as trusted review universe count.
- Fetch in-progress current-day daily candles for EOD review.
- Mark zero-row provider returns as successful price repair.
- Rewrite canonical stock symbols or solve NSE/BSE identity collisions outside the assigned catalog identity lane.
- Combine deep price backfill with broad catalog sync or full catalog import redesign.
- Add schema changes for adjusted-close provenance in MD-A3. If provenance remains insufficient for legacy rows, report it as deferred architecture debt with warnings.

## 12. Final Architecture Decision

MD-A3 will harden the existing bounded `BACKFILL_PRICES` repair lane so provider-supported shallow rows automatically receive deep historical EOD backfill without operator-supplied `fullReload`. The backend owns deep lookback selection, caps every request to the latest completed trading date, keeps offset-zero bounded queue semantics, and exposes machine-readable diagnostics for rows received/inserted/updated/no-op, zero-row provider returns, failures, remaining candidates, and 120/200/252-bar depth. The frontend keeps one repair action and renders the deeper evidence; downstream gates remain fail-closed until trusted membership actually improves.
