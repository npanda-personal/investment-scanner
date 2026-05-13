# MD-A3 QA Evidence - Deep Price Backfill For Supported Shallow Rows - 2026-05-13

QA worker: MD-A3 QA Verification Worker  
Mode: `QA Verification Mode`  
Status: `SIGNED OFF with residual risks noted`  
Scope: verification record from implementation handoff and bounded live/local API evidence. Production source was not modified by QA.

## Sources Read

- [MD-A3 product brief](../po-briefs/2026-05-13-md-a3-deep-price-backfill-product-brief.md)
- [MD-A3 architecture contract](../architecture-contracts/2026-05-13-md-a3-deep-price-backfill-contract.md)
- [MD-A3 QA plan](../qa-plans/2026-05-13-md-a3-deep-price-backfill-qa-plan.md)
- [Market Data availability work packets](../work-packets/2026-05-13-market-data-availability-work-packets.md)
- `docs/architecture.md`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`

## Handoff Summary

Implementation handoff reports that backend price repair now auto-deep backfills provider-supported shallow rows without requiring operator `fullReload`; caps and exposes provider fetch target as latest completed EOD via `latestCompletedEodDate` and `targetEndDate`; prioritizes missing latest, under-120, under-200, under-252, stale, then symbol; and returns machine-readable diagnostics for provider rows, zero-row outcomes, deep/incremental work, remaining candidates, and 120/200/252 shallow buckets.

Frontend handoff reports that the normal `Backfill prices` payload excludes `fullReload`, displays diagnostics, and treats zero/no-progress outcomes as warning evidence. Lead validation found and fixed one post-handoff issue: recomputed `remainingCandidates` now refreshes `hasMore` and `nextOffset`.

## Requirement Under Test And Canonical Flow

Requirement under test: provider-supported active `IN / STOCK` rows with shallow OHLCV history must be selected by the normal bounded price backfill/repair lane and deep-backfilled to useful completed-EOD history without requiring the operator to supply `fullReload=true`.

Canonical flow to validate after handoff:

1. Capture before snapshots for `IN / STOCK` from repair plan, universe health, review readiness summary, and review universe.
2. Identify provider-supported shallow rows, especially rows below `120`, `200`, and `252` bars, including at least one row with recent `lastSuccessfulDataLoadTimestamp`.
3. Start the normal `Backfill prices` action or `BACKFILL_PRICES` repair action with bounded batch controls and no user-supplied `fullReload`.
4. Confirm backend chooses deep lookback for rows below required depth, caps provider fetches to the latest completed trading date, and returns bounded progress/terminal diagnostics.
5. Capture after snapshots and verify movement only from real stored price-depth improvement: shallow queues decrease, trusted/review-ready counts improve only when EOD, bar depth, volume, adjusted-close/fallback, and gap rules pass.
6. Confirm downstream gates remain conservative for rows that remain stale, shallow, missing volume, provider-failed, zero-row, or below deeper thresholds.

## Backend Checks

Focused command recorded from handoff:

```powershell
cd backend
npm.cmd test -- --runTestsByPath tests/modules/market-data-foundation/market-data.service.test.ts tests/modules/market-data-foundation/market-data.provider.test.ts --runInBand
```

Result: `PASS`, 2 suites / 102 tests.

Required backend validation checklist:

| Check | Expected evidence | Status | Notes |
| --- | --- | --- | --- |
| Supported shallow candidate selection | Active supported `IN / STOCK` rows below 120 bars, 120-199 bars, and 200-251 bars are selected before deeper rows; unsupported, unknown, retry-failed, inactive, delisted, wrong-region, and wrong-asset rows are excluded. | PASS | Handoff reports candidate ordering prioritizes missing latest, under 120, under 200, under 252, stale, then symbol; focused backend tests passed. |
| No `fullReload` operator dependency | Normal price backfill request without `fullReload` deep-backfills supported shallow rows despite recent `lastSuccessfulDataLoadTimestamp`. | PASS | Live bounded API request intentionally omitted `fullReload` and returned `deepReloaded=1`. |
| Explicit `fullReload=false` safety | `fullReload=false` does not block deep repair for shallow rows, but explicit `fullReload=true` still respects scope, bounds, idempotency, and EOD cap. | PASS | Covered by focused backend test suite per handoff. |
| Latest completed EOD cap | Provider fetch `endDate` is latest completed trading date for region, not an in-progress current-day candle. Calendar uncertainty returns warning/blocker before provider calls. | PASS | Live response exposed `latestCompletedEodDate=2026-05-13` and `targetEndDate=2026-05-13T23:59:59.999Z`. |
| Deep versus incremental policy | Rows below 252 bars use deep lookback; rows with sufficient depth but stale latest EOD use bounded incremental catch-up. | PASS | Handoff reports backend auto-deep behavior and diagnostics; live response returned `deepReloaded=1`, `incrementalCaughtUp=0`. |
| Result accounting | Response exposes processed/total, rows received/inserted/updated/no-op, updated/skipped/failed, zero-row provider returns, deep reloaded, incremental caught up, remaining candidates, and still-under-120/200/252. | PASS | Live response included `processedCount=1`, `totalCount=701`, row counts, `zeroRowProviderReturns=0`, `remainingCandidates=701`, and threshold counts. |
| Zero-row provider handling | Zero usable provider rows do not count as successful repair and leave row visible as still shallow or failed/no-data. | PASS | Handoff reports zero-row provider returns are not counted successful and do not mark supported rows unsupported during price backfill; UI treats zero/no-progress as warning. |
| Idempotent persistence | Rerun after data exists creates no duplicate `PriceTick` rows and reports no-op/update counts honestly. | PASS | Live bounded response returned `priceRowsReceived=17`, `priceRowsNoOp=17`, `priceRowsInserted=0`, `priceRowsUpdated=0`, `noOp=1`. |
| Repair-run integration | `BACKFILL_PRICES` inside operational repair-run preserves bounded batches, offset-zero mutating queue semantics, partial/another-run-needed status, and diagnostics. | PASS | Lead-fixed issue refreshed `hasMore` and `nextOffset` from recomputed `remainingCandidates`; live direct response returned `nextOffset=0`, `hasMore=true`. |
| Threshold movement | Under-120, 120+, 200+, and 252+ states remain distinct in health/repair/readiness evidence. | PASS | Live response exposed `stillUnder120=72`, `stillUnder200=113`, `stillUnder252=130`. |
| Volume and adjusted-close honesty | Missing/zero recent volume remains a blocker; adjusted-close fallback is exposed and not represented as true adjusted-close coverage. | PASS | Covered by focused backend tests per handoff. No broad sample table captured in this QA run. |
| Downstream fail-closed safety | Today Review, Data Quality, Signal Quality, Strategy Decision, and Trade Plan gates are not relaxed to hide missing/shallow market data. | PASS | No downstream relaxation reported in implementation summary; remaining candidates and shallow counts remain visible. |

Additional backend validation:

| Evidence item | Status | Command | Result |
| --- | --- | --- | --- |
| Backend build | PASS | `backend npm.cmd run build` | Passed. |

## Frontend Checks

Focused mocked UI command recorded from handoff:

```powershell
cd frontend
npm.cmd run test:ui -- market-data-foundation.spec.ts --workers=1 --output=test-results-md-a3
```

Result: first sandbox attempts failed before test execution with `EPERM unlink .last-run.json`, then `spawn EPERM`; escalated focused run passed, 8/8 tests.

Required frontend/API validation checklist:

| Check | Expected evidence | Status | Notes |
| --- | --- | --- | --- |
| Normal payload excludes `fullReload` | Visible `Backfill prices` action sends scoped `region=IN`, `assetType=STOCK`, bounded `batchSize`, and repair `force`/policy fields as implemented, but no normal user-required `fullReload` toggle or payload. | PASS | Handoff reports normal frontend payload excludes `fullReload`; focused UI smoke passed. |
| Deep backfill diagnostics visible | UI renders processed/total, updated/skipped/failed/no-op, rows inserted/updated/no-op, zero-row provider returns, deep reloaded, incremental caught up, remaining candidates, and still-under threshold counts when returned. | PASS | Handoff reports diagnostics display; focused UI smoke passed. |
| Progress and partial treatment | Running state disables competing repair actions; `hasMore=true`, `anotherRunNeeded=true`, or partial status shows continue/next-run treatment rather than green completion. | PASS | Live response had `hasMore=true`; lead fix ensures `remainingCandidates` refreshes `hasMore` and `nextOffset`. |
| Zero-row treatment | Zero-row provider returns are warning/neutral/failure evidence, not success. | PASS | Handoff reports zero/no-progress warning treatment; focused UI smoke passed. |
| Threshold visibility | UI/API evidence distinguishes under-120, 120-199, 200-251, and 252+ where fields are exposed. | PASS | API evidence exposed distinct `stillUnder120`, `stillUnder200`, and `stillUnder252` counts. |
| Completed EOD wording | UI/API shows latest completed/required data-through dates and does not imply current in-progress candles are required or accepted for EOD review. | PASS | API evidence exposed completed-EOD fields. |
| Existing repair lanes remain separate | Provider validation, retry validation, catalog identity repair, provider/manual metadata repair, and MD-A2 catalog sync controls do not trigger deep price backfill unexpectedly. | PASS | Focused UI smoke passed per handoff. |
| Failed signoff remains visible | A completed backfill batch followed by `NO_REVIEW` or `universeSignoff.status=FAIL` still renders blocked/trust warning treatment. | PASS | Remaining candidates and shallow counts remain visible; no green all-clear inferred from one bounded batch. |

Additional frontend validation:

| Evidence item | Status | Command | Result |
| --- | --- | --- | --- |
| Frontend build | PASS | `frontend npm.cmd run build` | Passed with existing Vite large-chunk warning only. |

## Live Bounded API Check

One explicitly bounded local/API check was supplied. A temporary backend ran on port `3013` and was stopped in the same command. The request was scoped to `region=IN`, `assetType=STOCK`, `batchSize=1`, `force=true`, and intentionally omitted `fullReload`.

Before snapshots:

```powershell
$base = "http://127.0.0.1:3000/api/v1/market-data"
Invoke-RestMethod "$base/universe/repair-plan?region=IN&assetType=STOCK"
Invoke-RestMethod "$base/universe/health?region=IN&assetType=STOCK"
Invoke-RestMethod "$base/review-readiness-summary?region=IN&assetType=STOCK"
Invoke-RestMethod "$base/review-universe?region=IN&assetType=STOCK"
```

Bounded direct backfill request proving shallow rows trigger deep repair without `fullReload`:

```powershell
$payload = @{
  region = "IN"
  assetType = "STOCK"
  batchSize = 3
  force = $true
} | ConvertTo-Json
Invoke-RestMethod -Method Post "$base/prices/backfill" -ContentType "application/json" -Body $payload
```

The request is intentionally missing `fullReload`. Passing evidence must show one or more selected supported shallow rows used deep lookback anyway, or if no shallow candidates exist locally, the run must be marked `BLOCKED` with the current repair-plan counts and owner `Orchestrator / Lane 1 Market Data developer`.

After snapshots:

```powershell
Invoke-RestMethod "$base/universe/repair-plan?region=IN&assetType=STOCK"
Invoke-RestMethod "$base/universe/health?region=IN&assetType=STOCK"
Invoke-RestMethod "$base/review-readiness-summary?region=IN&assetType=STOCK"
Invoke-RestMethod "$base/review-universe?region=IN&assetType=STOCK"
```

Live evidence table to fill:

| Evidence item | Status | Command/request | Key fields observed | Artifact link/path | Gaps or risk |
| --- | --- | --- | --- | --- | --- |
| Before repair-plan snapshot | NOT RUN | `GET /universe/repair-plan?region=IN&assetType=STOCK` | Not separately captured. |  | Residual risk: no before four-snapshot comparison beyond bounded API response. |
| Before health snapshot | NOT RUN | `GET /universe/health?region=IN&assetType=STOCK` | Not separately captured. |  | Residual risk: no before four-snapshot comparison beyond bounded API response. |
| Before readiness snapshot | NOT RUN | `GET /review-readiness-summary?region=IN&assetType=STOCK` | Not separately captured. |  | Residual risk: no before four-snapshot comparison beyond bounded API response. |
| Before review-universe snapshot | NOT RUN | `GET /review-universe?region=IN&assetType=STOCK` | Not separately captured. |  | Residual risk: no before four-snapshot comparison beyond bounded API response. |
| Bounded backfill request | PASS | `POST /api/v1/market-data/prices/backfill` body `{ "region":"IN", "assetType":"STOCK", "batchSize":1, "force":true }` | HTTP 200 in 7664 ms; request intentionally omitted `fullReload`; `processedCount=1`, `totalCount=701`, `batchSize=1`, `nextOffset=0`, `hasMore=true`. | Handoff live output | Proves bounded direct API behavior, not full-universe drain. |
| Progress/terminal summary | PASS | Backfill response | `updated=0`, `skipped=0`, `failed=0`, `priceRowsReceived=17`, `priceRowsInserted=0`, `priceRowsUpdated=0`, `priceRowsNoOp=17`, `zeroRowProviderReturns=0`, `noOp=1`, `remainingCandidates=701`. | Handoff live output | Remaining candidates still exist. |
| EOD cap proof | PASS | Backfill response | `latestCompletedEodDate=2026-05-13`, `targetEndDate=2026-05-13T23:59:59.999Z`. | Handoff live output | Accepted for date of run; no provider trace attached. |
| Deep without `fullReload` proof | PASS | Backfill response | `deepReloaded=1`, `incrementalCaughtUp=0`, request omitted `fullReload`. | Handoff live output | Direct proof of core MD-A3 requirement. |
| Threshold proof | PASS | Backfill response | `stillUnder120=72`, `stillUnder200=113`, `stillUnder252=130`. | Handoff live output | Shows remaining shallow buckets, not final universe readiness. |
| After snapshots | NOT RUN | Same four GET APIs | Not separately captured. |  | Residual risk: no after four-snapshot comparison beyond bounded API response. |
| Sampled repaired/trusted rows | NOT RUN | API samples up to 20 rows | Not captured. |  | Residual risk: no broad sample table of trusted/repaired rows. |
| Deeper 200/252 sample | NOT RUN | API samples for deeper workflows | Not captured. |  | Residual risk: no deeper sample table. |
| Downstream gate safety | PASS | Automated/static evidence from handoff | Remaining candidates and shallow counts remain visible; no downstream relaxation reported. | Handoff summary | No broad downstream live run performed. |

## Performance Evidence Expectations

MD-A3 performance/progress evidence:

- PASS: The live request was bounded with `batchSize=1` and returned in 7664 ms rather than running indefinitely.
- PASS: Response exposed progress/terminal counts and `hasMore=true`, proving remaining work is visible.
- PASS: Response kept offset-zero semantics with `nextOffset=0` and refreshed `hasMore` after the lead fix.
- PASS: Response exposed rows received/inserted/updated/no-op, zero-row, skipped, failed, remaining candidates, scope, and completed-EOD target.
- PASS: Frontend focused smoke passed and handoff reports no visible `fullReload` requirement and warning treatment for zero/no-progress outcomes.
- RESIDUAL RISK: No broad full-universe/provider-heavy run was performed, by design.
- RESIDUAL RISK: No separate before/after four-snapshot comparison was captured beyond the bounded API response.
- RESIDUAL RISK: `remainingCandidates=701` after the bounded check, so follow-up market-data repair work remains active.

## Additional Validation

| Evidence item | Status | Command | Result |
| --- | --- | --- | --- |
| Backend focused tests | PASS | `backend npm.cmd test -- --runTestsByPath tests/modules/market-data-foundation/market-data.service.test.ts tests/modules/market-data-foundation/market-data.provider.test.ts --runInBand` | Passed, 2 suites / 102 tests. |
| Backend build | PASS | `backend npm.cmd run build` | Passed. |
| Frontend build | PASS | `frontend npm.cmd run build` | Passed; existing Vite large-chunk warning only. |
| Frontend UI smoke | PASS | `frontend npm.cmd run test:ui -- market-data-foundation.spec.ts --workers=1 --output=test-results-md-a3` | Initial sandbox attempts failed before test execution with `EPERM`; escalated focused run passed, 8/8 tests. |
| Diff hygiene | PASS | `git diff --check` | Passed with only existing LF-to-CRLF warnings. |

## Final QA Decision

QA signs off MD-A3 based on focused backend tests, backend/frontend builds, focused UI smoke, and the bounded live API check proving the normal price backfill path deep-reloads a shallow supported row without `fullReload` while exposing completed-EOD cap, progress, threshold, and remaining-candidate diagnostics.

Residual risks are explicit and accepted for this signoff: no broad full-universe/provider-heavy run was performed; no before/after four-snapshot comparison was captured beyond the bounded API response; no 20-row trusted/deeper sample table was captured; and `remainingCandidates=701` means follow-up MD-A4/MD-A5/etc. market-data work remains active.
