# MD-A3 Deep Price Backfill For Supported Shallow Rows QA Plan - 2026-05-13

Mode: `QA Planning Mode`  
Owner: MD-A3 QA Planner  
Work item: MD-A3 - Deep Price Backfill For Supported Shallow Rows  
Lane/module: Lane 1, `market-data-foundation`  
Write scope for this QA pass: this file only.

## Sources Read

- [Market Data data-availability PO audit](../po-audits/2026-05-13-market-data-data-availability-audit.md)
- [Market Data full module PO audit](../po-audits/2026-05-13-market-data-full-module-po-audit.md)
- [Market Data availability root-cause notes](../architecture-contracts/2026-05-13-market-data-availability-root-cause-notes.md)
- [Market Data availability work packets](../work-packets/2026-05-13-market-data-availability-work-packets.md)
- `backend/src/modules/market-data-foundation/market-data-foundation.md`

## QA Objective

QA must prove MD-A3 fixes the shallow-history trap for provider-supported `IN / STOCK` rows. A row that already has a recent shallow sync and `lastSuccessfulDataLoadTimestamp` must be selected for deep price repair when it lacks required OHLCV depth, without requiring the operator to know or manually set `fullReload`.

MD-A3 is accepted only if deep backfill remains bounded, scope-limited, idempotent, capped to the latest completed trading date, honest about zero-row/failure outcomes, and visible in API/UI progress evidence. It must improve stored OHLCV depth and trusted-review eligibility from real Market Data rows, not from relaxed downstream gates.

## QA Entry Conditions

QA execution can start only after the developer handoff includes:

- Changed files grouped by backend, frontend/API, tests, and docs.
- Confirmation that production changes are limited to Market Data Foundation scope approved for MD-A3.
- Backend focused test output for shallow-history candidate selection, deep start-date behavior, completed-EOD end-date cap, idempotent persistence, zero-row rejection, and 120/200/252 threshold accounting.
- API or DTO examples showing rows received, inserted, updated, no-op, zero-row, failed, skipped, and remaining candidates.
- UI/API evidence showing the backfill action exposes progress and final/partial summary for deep price repair, not only generic success text.
- Confirmation that no provider-heavy live run was started during development validation unless Orchestrator explicitly authorized a bounded run.
- Any skipped check recorded with exact command, blocker, risk, and next owner.

QA rejects the handoff if it lacks focused automated evidence for the deep-backfill selection and end-date cap contracts.

## Developer Pre-QA Validation Checklist

| Check | Required developer evidence | Pass/Fail | Evidence link or notes |
| --- | --- | --- | --- |
| Backend focused tests | Exact command and output for market-data-foundation price backfill/deep history tests. |  |  |
| Shallow supported rows | Test fixture with provider-supported active `IN / STOCK` rows below 120, between 120-199, between 200-251, and at/above 252 bars. |  |  |
| No operator fullReload dependency | Evidence that supported rows below the target depth trigger deep repair without requiring user-supplied `fullReload=true`. |  |  |
| EOD cap | Test proving provider fetch `endDate` is latest completed trading date, not the current in-progress session date. |  |  |
| Result accounting | Response sample with received/inserted/updated/no-op/zero-row/failed/skipped/remaining counts. |  |  |
| Zero-row rejection | Test proving provider zero usable rows does not count as successful repair. |  |  |
| Threshold exposure | API/UI evidence for under-120, under-200, under-252, 120+, 200+, and 252+ counts where implemented. |  |  |
| Performance/progress | Bounded batch/max-batch/progress evidence, including `hasMore` or `anotherRunNeeded` when work remains. |  |  |
| UI/API smoke | Mocked UI test or API evidence showing visible deep price backfill status and terminal/partial summary. |  |  |
| Downstream gate safety | Confirmation that Today Review, Signal Quality, Strategy Decision, Data Quality, and Trade Plan thresholds were not relaxed. |  |  |

## Automated Backend/API Test Plan

Preferred backend scope: focused tests under `backend/tests/modules/market-data-foundation/`.

Suggested command:

```powershell
npm test -- market-data --runInBand
```

If a narrower MD-A3 spec exists after implementation, QA should run that focused command first, then the closest market-data regression subset.

### Required Backend Scenarios

| Scenario | Expected result | Pass/Fail | Evidence field |
| --- | --- | --- | --- |
| Select provider-supported shallow rows | Active supported `IN / STOCK` rows with fewer than 120 bars are selected for deep price backfill even if they have a recent `lastSuccessfulDataLoadTimestamp`. |  | Test name, fixture summary. |
| Exclude unsupported and unknown rows | `UNKNOWN`, `UNSUPPORTED`, inactive, delisted, wrong-region, and wrong-asset rows are not price-backfilled and remain counted in their correct blockers. |  | Test name, selected ids. |
| No `fullReload` operator requirement | Calling the normal price backfill/repair action without `fullReload` still uses deep repair policy for shallow supported rows. |  | Request payload and provider fetch args. |
| Preserve explicit full reload | If `fullReload=true` remains supported, it must not bypass scope, bounds, EOD cap, validation, or idempotent storage rules. |  | Test assertion. |
| Latest completed EOD cap | During `2026-05-13` IN market hours, provider fetch caps end date at the latest completed trading date, for example `2026-05-12`, and does not request the in-progress `2026-05-13` candle. |  | Provider mock args. |
| Completed post-close cap | After the final completed candle is eligible, fetch end date may advance only to the completed trading date confirmed by market-session logic. |  | Provider mock args. |
| Threshold under 120 | Rows ending below 120 bars remain shallow, are not trusted, and remain counted as under-120 or price-backfill-needed. |  | Health/repair-plan fields. |
| Threshold 120 to 199 | Rows reaching 120+ bars can become Trusted Review Lite candidates only if current EOD, recent volume, adjusted-close/fallback, and corporate-action gates also pass; they still remain below 200/252 deeper thresholds. |  | Review-universe fields. |
| Threshold 200 to 251 | Rows reaching 200+ bars satisfy SMA200-style depth but still remain below strict 252 `PRICE_READY` if the standard rolling window is incomplete. |  | Universe health fields. |
| Threshold 252+ | Rows reaching 252+ bars can satisfy strict price-history depth when freshness, rolling-window coverage, gaps, volume, and adjusted-close/fallback gates pass. |  | Universe health fields. |
| Rolling window and gaps | A row with 252 total bars but unacceptable rolling-window coverage or large gaps remains blocked. |  | Blocker assertion. |
| Recent volume required | Rows with missing or zero recent volume remain excluded from trusted review and counted separately. |  | Trusted exclusions. |
| Adjusted-close honesty | True adjusted close and close fallback are exposed accurately; fallback is a warning/status, not fake adjusted-close coverage. |  | DTO/readiness fields. |
| Zero-row provider result | Provider response with zero usable rows increments zero-row/no-data/failed accounting and does not update success counts or mark the row repaired. |  | Response summary. |
| Partial provider failure | Mixed success/failure batches persist successful rows, report failures/recent errors, and keep remaining candidates visible. |  | Summary and errors. |
| Idempotent rerun | Re-running after data is present yields no duplicate price rows and mostly no-op/update accounting. |  | Row counts before/after. |
| Progress bounds | `batchSize` and max-batch controls bound provider work; unfinished work returns `hasMore=true`, `anotherRunNeeded=true`, or equivalent. |  | Response fields. |
| Repair-plan movement | Before/after repair-plan shows `supportedPriceBackfillNeeded` and shallow-history counts decrease only for actually repaired rows. |  | Before/after samples. |
| Health movement | `review-readiness-summary`, `universe/health`, and `review-universe` reflect increased price depth/trusted eligibility without downstream workaround changes. |  | API field samples. |

### Backend Rejection Criteria

- Shallow rows remain shallow unless a user manually knows to set `fullReload=true`.
- Backfill can fetch the current in-progress daily candle for EOD review workflows.
- Zero-row provider responses are counted as successful repairs.
- Response summaries hide failed, skipped, no-op, zero-row, or remaining candidate counts.
- Unsupported, unknown, inactive, delisted, wrong-region, or wrong-asset rows are backfilled as part of MD-A3.
- 120/200/252 threshold states are conflated or hidden.

## Automated Frontend/UI And API Evidence Plan

Preferred UI scope: `frontend/tests/ui/market-data-foundation.spec.ts` or the focused spec chosen by the implementation packet. UI tests must mock provider/API responses and must not start provider-heavy runs.

Suggested command:

```powershell
npm.cmd run test:ui -- market-data-foundation.spec.ts --workers=1
```

### Required UI/API Scenarios

| Scenario | Expected result | Pass/Fail | Evidence field |
| --- | --- | --- | --- |
| Backfill action payload | Visible price backfill action sends scoped `region=IN`, `assetType=STOCK`, bounded batch fields, and no user-required deep-history toggle. |  | Intercepted payload. |
| Progress appears | UI shows running/progress state with processed/total or valid unknown-total state, plus inserted/updated/no-op/skipped/failed/zero-row counts when returned. |  | Playwright assertion or screenshot path. |
| Partial state | `PARTIAL` or `hasMore=true` renders warning treatment and a clear continue/next-run path. |  | Mocked response and assertion. |
| Zero-row state | Zero-row provider results appear as warning/failure/no-data, not green success. |  | Assertion. |
| Threshold display | UI or API evidence distinguishes under-120, 120+, 200+, and 252+ coverage where fields are exposed. |  | Assertion/response sample. |
| Trusted sample visibility | Trusted Review Universe evidence shows current EOD, 120+ bars, recent positive volume, and adjusted-close/fallback status for sampled rows. |  | API response or UI detail. |
| No in-progress candle wording | UI/API evidence includes latest completed/required data-through dates and does not claim current-day in-progress candles are required for EOD review. |  | Response fields. |
| Existing repair lanes safe | Provider validation, catalog identity, metadata, manual import, and MD-A2 sync progress controls remain separate and do not trigger deep price backfill unexpectedly. |  | Playwright/API assertion. |

## Manual Bounded Live Checks

Manual/live QA must be explicitly bounded and recorded. Do not start provider-heavy, full-universe, or long drain runs. Default live check bound should be `region=IN`, `assetType=STOCK`, `batchSize <= 3`, `workerCount=1` if applicable, `workerConcurrency=1` if applicable, and `maxBatchesPerAction=1` unless Orchestrator authorizes a larger bounded check.

If local services are unavailable or provider access is not authorized, mark live checks `BLOCKED` with owner `Orchestrator / Lane 1 Market Data developer`.

### Live Evidence Checklist

| Check | Required evidence | Pass/Fail | Evidence field |
| --- | --- | --- | --- |
| Before snapshot | Capture `review-readiness-summary`, `universe/health`, `review-universe`, and `universe/repair-plan` for `IN / STOCK` before the bounded run. |  | URL, timestamp, key fields. |
| Bounded request | Record exact backfill or repair-run payload with small batch and max-batch values. |  | Payload. |
| Start responsiveness | Request returns promptly and does not hold a browser/API request open for an unbounded provider job. |  | Timing and response. |
| EOD cap evidence | Response/log/provider args show fetch end date no later than latest completed trading date. |  | Excerpt. |
| Progress summary | Capture running or terminal response with received/inserted/updated/no-op/skipped/failed/zero-row/remaining counts. |  | Response fields. |
| After snapshot | Repeat the four health/repair APIs and compare supported price backfill/shallow history/trusted counts. |  | Before/after table. |
| Sampled rows | For up to 20 repaired/trusted rows, record latest EOD, bar count, recent volume, adjusted-close/fallback status, and blockers. |  | Sample table. |
| Deeper sample | For rows intended to support deeper workflows, record 200/252-bar coverage and remaining blockers. |  | Sample table. |
| No downstream relaxation | Today Review remains `NO_REVIEW` until trusted threshold is met; if it changes to `LIMITED_REVIEW`, candidates are inside trusted membership. |  | API/UI evidence. |

## Performance And Progress Acceptance

MD-A3 passes performance/progress acceptance only if all of these are true:

- Every operator-triggered deep backfill path is bounded by explicit batch/max-batch controls.
- Provider-facing concurrency is backend-owned and capped; frontend code does not multiply provider calls.
- Start/one-batch requests return a bounded response with actionable counts instead of one hidden whole-universe wait.
- Long remaining work ends as `PARTIAL` or equivalent with `hasMore`/`anotherRunNeeded`, not as green completion.
- Progress and terminal summaries expose received, inserted, updated, no-op, skipped, zero-row, failed, warnings/errors, remaining candidates, and scope.
- Re-running repaired rows is idempotent and does not duplicate `PriceTick` rows.
- Health and repair-plan snapshots move only when actual stored price rows improve.

## Explicit QA Evidence Record Template

QA evidence should include this table or an equivalent structured record in the MD-A3 QA evidence file.

| Evidence item | Status | Command/request | Key fields observed | Artifact link/path | Gaps or risk |
| --- | --- | --- | --- | --- | --- |
| Backend tests |  |  |  |  |  |
| Frontend/API tests |  |  |  |  |  |
| Before health snapshots |  |  |  |  |  |
| Bounded backfill request |  |  |  |  |  |
| Progress/terminal summary |  |  |  |  |  |
| EOD cap/no in-progress proof |  |  |  |  |  |
| 120/200/252 threshold proof |  |  |  |  |  |
| Zero-row/failure proof |  |  |  |  |  |
| Sampled trusted rows |  |  |  |  |  |
| Downstream gate safety |  |  |  |  |  |
| Performance/progress acceptance |  |  |  |  |  |

Each row must be marked `PASS`, `FAIL`, `BLOCKED`, or `NOT RUN`. `NOT RUN` requires a blocker reason and owner.

## Final Rejection Criteria

Reject MD-A3 if any of these are true:

- Provider-supported shallow rows below 120 bars are not deep-backfilled by the normal price repair path.
- Rows below 200/252 bars are not counted, repaired, or explicitly left as still shallow.
- Backfill fetches or stores current in-progress daily candles for EOD review workflows.
- Zero-row provider returns are reported as successful repair.
- Result evidence omits received, inserted, updated, no-op, zero-row, failed, skipped, or remaining-candidate counts.
- Live/API evidence cannot prove bounded execution, progress/partial state, and exact scope.
- Trusted Review Lite eligibility is reached by lowering thresholds or changing downstream gates instead of improving Market Data rows.
- Missing/zero volume or adjusted-close fallback status is hidden.
- Today Review, Data Quality, Signal Quality, Strategy Decision, or Trade Plans are changed to treat shallow/missing Market Data as usable.

## QA Signoff Standard

QA signoff requires passing focused backend tests, mocked UI/API tests where UI/API changed, and at least one authorized bounded live/local check or an accepted live-check blocker. The signoff must explicitly state whether MD-A3 meets the PO standard: supported shallow `IN / STOCK` rows can acquire current completed-EOD OHLCV depth for 120-bar Trusted Review Lite and deeper 200/252-bar downstream workflows, with honest progress, threshold, failure, volume, and adjusted-close evidence.
