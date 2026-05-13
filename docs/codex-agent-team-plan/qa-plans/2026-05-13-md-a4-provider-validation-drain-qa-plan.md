# MD-A4 Provider Validation Drain And Retry Classification QA Plan - 2026-05-13

Mode: `QA Verification Mode`  
Owner: MD-A4 QA Planner  
Work item: MD-A4 - Provider Validation Drain And Retry Classification  
Lane/module: Lane 1, `market-data-foundation`  
Write scope for this QA pass: this file only.

## Sources Read

- [Market Data full module PO audit](../po-audits/2026-05-13-market-data-full-module-po-audit.md)
- [Market Data data availability audit](../po-audits/2026-05-13-market-data-data-availability-audit.md)
- [Market Data missing data root-cause audit](../po-audits/2026-05-13-market-data-missing-data-root-cause-audit.md)
- [Module verification register](../../module-verification-register.md)
- [UX/UI best practices](../../ux-ui-best-practices.md)
- Existing backend market-data tests under `backend/tests/modules/market-data-foundation/`
- Existing market-data UI tests under `frontend/tests/ui/market-data-foundation.spec.ts`
- Existing Market Data Foundation API/UI implementation files, read-only.

## 1. Requirement Under Test

MD-A4 must prove that provider validation turns the `IN / STOCK` catalog into an explicitly classified universe: `SUPPORTED`, clean `UNSUPPORTED`, retry-failed/retry-eligible, retry-blocked, or manual/correctable where applicable.

The requirement is not just that validation endpoints exist. QA must verify the operator workflow drains fresh unknown providers first, keeps retry-failed rows separate, never lets retry failures hide a large unknown queue, and exposes enough before/after evidence for Product to decide whether the next blocker is provider coverage, catalog identity, business metadata, price backfill, or manual intervention.

Data completeness standard: every active stock needs 15 years of daily OHLCV, or complete daily OHLCV from listing date when the company listed less than 15 years ago. QA must reject any evidence that treats a row as deeply data-ready without this coverage target or a documented fallback/blocker.

Acceptance criteria under test:

- Default provider validation uses `providerValidationQueue=UNKNOWN_FIRST`.
- `UNKNOWN_FIRST` rows drain before `RETRY_FAILED` rows are retried during direct validation and `DRAIN_UNTIL_BLOCKED` repair runs.
- Retry-failed rows require the explicit `RETRY_FAILED` lane or repair-run action `RETRY_FAILED_PROVIDERS`.
- Clean unsupported provider results are classified as `UNSUPPORTED`, excluded from downstream supported-only metadata/price blockers, and still visible in health/repair-plan counts.
- Retryable failures persist as retry-failed/retry-eligible or retry-blocked with next retry evidence; they do not become success, unsupported, or invisible no-ops.
- Successful provider evidence, including successful OHLCV ingestion or existing usable price history where supported by the implementation contract, repairs `UNKNOWN` to `SUPPORTED`.
- Repair responses and latest-run records include before/after snapshots, remaining blockers, `universeSignoff`, `downstreamAllowed`, `anotherRunNeeded`, queue counts, warnings, and terminal status.
- A run is green only when `status=COMPLETED`, `anotherRunNeeded=false`, final `trustStatus=OK`, and `universeSignoff.status=PASS`; otherwise warning/error treatment is required.

Out of scope for this QA plan:

- Running full catalog/provider-heavy jobs.
- Changing implementation files.
- Relaxing Today Review, Data Quality, Signal Quality, Strategy Decision, Trade Plan, or universe signoff gates.
- Adding providers, paid services, broker APIs, queues, or schema changes unless separately approved.
- Accepting Yahoo insufficiency as final when an approved free source such as NSE/BSE exchange EOD files could supply completed-EOD candles.

## 2. Backend Service/API Checks

Preferred backend scope: focused market-data tests under `backend/tests/modules/market-data-foundation/`. QA should run the narrowest implemented MD-A4 test command first, then the closest existing market-data service/repository/routes subset.

Suggested focused command, subject to implementation handoff:

```powershell
npm test -- market-data --runInBand
```

Required service/repository/API scenarios:

| Check | Expected result | Required evidence |
| --- | --- | --- |
| Default queue selection | Direct provider validation without explicit queue uses `UNKNOWN_FIRST`, not retry-failed selection. | Test name, request, selected stock ids/statuses. |
| Unknown selector excludes retry failures | Repository/service selector for `UNKNOWN_FIRST` selects fresh unknown rows only and excludes retry-failed rows. | Repository test or service mock assertion. |
| Retry selector is explicit | `providerValidationQueue=RETRY_FAILED` selects only retry-failed/eligible rows allowed by retry policy. | Request/response sample and selector assertions. |
| Future retry blocking | Retry-failed rows with future `nextRetryAt` are counted as retry-blocked and not fetched unless forced by an explicitly approved path. | Test fixture with `nextRetryAt`. |
| Retry-eligible counting | Retry-failed rows whose retry window has elapsed appear in retry-eligible counts and in `RETRY_FAILED` selection. | Repair-plan and selector assertions. |
| Clean unsupported classification | Provider not found / unsupported outcome marks rows unsupported, increments unsupported counts, and removes them from supported-only catalog identity/business metadata/price queues. | Before/after repair-plan and health samples. |
| Supported classification | Provider success marks rows supported and updates provider-supported counts; existing usable price-history proof repairs unknown status where current contract supports it. | Test fixture and resulting stock status. |
| Retryable failure classification | Transient provider/network/rate-limit failures do not mark rows unsupported or supported; they persist as retry-failed with retry evidence. | Failure fixture, persisted state, response summary. |
| Zero-result ambiguity | Provider zero usable rows is classified per contract as unsupported, retryable, or manual/correctable with explicit diagnostics; it is not hidden as success. | Response counts and state assertion. |
| Free fallback handling | Yahoo no-data/no-candle evidence either attempts an approved free fallback source or returns `FREE_FALLBACK_REQUIRED`/equivalent visible blocker rather than clean unsupported. | Service/provider test and response fields. |
| Required history window | Summary/evidence exposes the required history start date, using listing date when later than the 15-year lookback, and latest completed EOD as the target end. | Service test and API response sample. |
| Offset-zero mutating queue | Repeated unknown validation batches use current queue head semantics so shrinking predicates do not skip rows. | Two-batch test with selected ids. |
| Bounded batch fields | Direct validation honors `batchSize`/`limit` caps, reports `processedCount`, `totalCount`, `nextOffset`, and `hasMore`; mutating queues should keep `nextOffset=0` or equivalent. | API response sample. |
| Repair-plan separation | `providerUnknownValidationNeeded`, `providerRetryValidationNeeded`, retry-blocked/eligible, and unsupported-excluded counts are distinct. | `GET /universe/repair-plan` sample. |
| Health and signoff blockers | `universe/health` and signoff show provider unknown and retry-failed blockers separately; `downstreamAllowed=false` until both are zero and other gates pass. | Health response sample. |
| Repair-run dependency order | `mode=DRAIN_UNTIL_BLOCKED` executes `VALIDATE_PROVIDERS` first and does not run `RETRY_FAILED_PROVIDERS` until unknown queue is drained or blocked per contract. | Repair-run actions array and mocked call order. |
| Retry after unknown drain | When unknown count reaches zero and retry-failed rows remain, drain mode runs `RETRY_FAILED_PROVIDERS` and reports its own batches/result. | Repair-run response showing both actions in order. |
| No-decrease blocker | If a provider validation batch does not decrease the queue and produces no useful classification, repair-run stops as `PARTIAL_BLOCKED` or approved equivalent warning state. | Test response and warning. |
| Partial failure accounting | Mixed supported/unsupported/retry-failed rows aggregate success, unsupported, retryable failure, no-op, skipped, and remaining counts without failing the entire bounded batch. | Summary fields and persisted state. |
| Dry-run no mutation | Repair-run dry run reports estimated actions and before snapshot without mutating provider support status or retry state. | Before/after DB state assertion. |
| Latest-run persistence | Latest repair-run API exposes operator fields, status, actions requested/executed, before/after snapshots, warnings/errors, signoff, and remaining blockers. | `GET /universe/repair-runs/latest` sample. |
| Route validation | Invalid queue modes, unsafe batch sizes, and unsupported scopes are rejected or clamped per implementation contract with clear API errors/warnings. | Routes test output. |

Backend rejection triggers:

- Default validation touches retry-failed rows while unknown rows remain.
- Retry-failed rows are retried without an explicit retry lane/action.
- Unsupported rows remain in supported-only metadata or price repair queues.
- Retryable provider errors are converted to unsupported, supported, or silent no-op.
- Yahoo no-data cases are permanently classified as unsupported without free-fallback evidence or a visible fallback-required blocker.
- Queue summaries omit unknown, retry-failed, retry-eligible/retry-blocked, unsupported, failed, skipped, no-op, or remaining counts.
- Drain mode can loop indefinitely when the queue does not decrease.
- `universeSignoff` or `downstreamAllowed` is missing from health, repair-plan, repair-run, or latest-run evidence.

## 3. Frontend Workflow Checks

Preferred UI scope: existing mocked Playwright coverage in `frontend/tests/ui/market-data-foundation.spec.ts` or a focused MD-A4 spec chosen by implementation. UI tests must mock APIs and must not run live provider work.

Suggested focused command:

```powershell
npm.cmd run test:ui -- market-data-foundation.spec.ts --workers=1
```

Required UI/API workflow checks:

| Check | Expected result | Required evidence |
| --- | --- | --- |
| Distinct queue counts | Market Data workbench shows provider unknown, retry-failed providers, and unsupported-excluded counts separately. | Playwright assertion or screenshot path. |
| Unknown default button | `Validate unknown providers` sends `POST /api/v1/market-data/provider/validate` with `providerValidationQueue=UNKNOWN_FIRST`, scoped `region=IN`, `assetType=STOCK`, and bounded batch size. | Intercepted payload. |
| Retry button is separate | `Retry failed providers` is a separate action and sends `providerValidationQueue=RETRY_FAILED`; it is disabled or warning-styled when no retry rows are eligible. | Intercepted payload and UI assertion. |
| Retry does not mask unknowns | When unknown count is greater than zero, primary guidance remains unknown validation; retry-failed count stays visible but secondary/warning. | Mocked repair-plan assertion. |
| Repair-run dry run | Dry-run/start request for operational repair includes `mode=DRAIN_UNTIL_BLOCKED`, bounded `batchSize`/`maxBatchesPerAction`, and scoped region/asset type. | Intercepted repair-run payload. |
| Repair-run action order display | UI renders `VALIDATE_PROVIDERS` before `RETRY_FAILED_PROVIDERS` in planned/executed actions. | Mocked latest-run/repair-run assertion. |
| Before/after evidence | Repair-run result displays before/after provider unknown, provider supported, retry-failed, unsupported, review-ready, and signoff/downstream fields. | UI assertion. |
| Provider queue summary | Direct validation result shows provider queue mode, processed/total, supported, unsupported, validation failed/retry-failed, skipped/no-op, `hasMore`, and remaining counts when returned. | UI assertion. |
| Partial warning states | `PARTIAL`, `PARTIAL_BLOCKED`, `PARTIAL_MANUAL_REQUIRED`, `hasMore=true`, or `anotherRunNeeded=true` render warning/error treatment, not green success. | Mocked terminal response assertion. |
| Completed but untrusted | A completed run with `universeSignoff.status=FAIL` or `downstreamAllowed=false` remains blocked/warning in UI. | Mocked latest-run assertion. |
| Health refresh | After validation/repair-run terminal response, UI refreshes repair-plan, health, trusted/review-readiness, and latest-run data. | Request count and assertion. |
| No hidden provider-heavy loop | UI sends one bounded action request per user action and does not create frontend loops over symbols or retry rows. | Network intercept count. |
| Accessible progress | Active repair state disables conflicting repair buttons, exposes active action/progress text, and keeps unrelated filters/navigation usable. | Playwright assertion. |

UI rejection triggers:

- A single generic provider button hides the distinction between unknown and retry-failed queues.
- The default button sends `RETRY_FAILED` or an ambiguous queue mode.
- Retry failures are shown as success or disappear from repair-plan/health counts.
- A completed repair run is styled green while `anotherRunNeeded=true`, trust is not OK, or signoff fails.
- UI requires a full provider drain or full server run for smoke coverage.

## 4. Bounded Live/Local Evidence Plan Using Very Small Batches

Live/local QA is required only after implementation is ready and Orchestrator authorizes it. Do not start heavy dev servers, full catalog validation, full provider syncs, or provider-heavy jobs for this planning pass.

Default live bounds:

- Scope: `region=IN`, `assetType=STOCK`.
- Direct provider validation: `batchSize <= 3`, no advancing offset for mutating unknown/retry queues.
- Operational repair-run: `mode=DRAIN_UNTIL_BLOCKED`, `batchSize <= 3`, `maxBatchesPerAction=1`, no manual CSV unless explicitly supplied.
- Provider concurrency: backend default only; if exposed, `workerCount=1` and `workerConcurrency=1`.
- Stop after one direct unknown batch and, only if unknown reaches zero in the tiny test scope or a seeded local fixture, one explicit retry-failed batch.

Required evidence checklist:

| Evidence item | Required capture | Pass/Fail | Notes |
| --- | --- | --- | --- |
| Before repair-plan | `GET /api/v1/market-data/universe/repair-plan?region=IN&assetType=STOCK`; record unknown, retry-failed, retry-eligible/blocker if exposed, unsupported, supported-only blockers, and signoff. |  |  |
| Before health | `GET /api/v1/market-data/universe/health?region=IN&assetType=STOCK`; record provider blockers, trust status, `universeSignoff`, and `downstreamAllowed`. |  |  |
| Before readiness | `GET /api/v1/market-data/review-readiness-summary?region=IN&assetType=STOCK`; record next action and provider blocker counts. |  |  |
| Unknown request | Exact `POST /api/v1/market-data/provider/validate` payload with `providerValidationQueue=UNKNOWN_FIRST`, `batchSize <= 3`, and scope. |  |  |
| Unknown response | Record processed/total, supported, unsupported, retry/validation-failed, skipped/no-op, `hasMore`, `nextOffset`, remaining/warnings. |  |  |
| After unknown snapshots | Repeat repair-plan, health, and readiness; verify unknown decreases or becomes explicitly retry/unsupported/classified. |  |  |
| Retry request, if eligible | Exact explicit retry payload with `providerValidationQueue=RETRY_FAILED`, `batchSize <= 3`; run only when authorized and eligible rows exist. |  |  |
| Retry response, if run | Record retry classification, retry-blocked/eligible changes, errors, warnings, and remaining retry count. |  |  |
| Tiny drain run | Optional authorized `POST /api/v1/market-data/universe/repair-run` with `mode=DRAIN_UNTIL_BLOCKED`, `batchSize <= 3`, `maxBatchesPerAction=1`; capture action order and terminal status. |  |  |
| Latest-run | `GET /api/v1/market-data/universe/repair-runs/latest`; record actions, before/after snapshots, warnings, signoff, and `anotherRunNeeded`. |  |  |
| UI smoke | Browser/network evidence that the same tiny workflow displays distinct queues and warning states without full provider drain. |  |  |

If local services or provider access are unavailable, mark live checks `BLOCKED` with owner `Orchestrator / Lane 1 Market Data developer`. Passing automated tests alone is not enough for final product health claims, but it can be enough to accept implementation mechanics when live provider access is blocked and the blocker is documented.

## 5. Performance/Progress Requirements And Rejection Triggers

MD-A4 passes performance/progress acceptance only if:

- Every direct provider validation and repair-run path is bounded by `batchSize` and, for drain mode, max-batch controls.
- Mutating provider-validation queues use current queue-head semantics, not advancing offsets that skip rows as predicates shrink.
- `UNKNOWN_FIRST` drains before retry-failed validation in drain mode.
- Provider-facing concurrency is backend-owned and capped; the UI does not loop over symbols or multiply provider calls.
- A one-batch request returns bounded counts and terminal/partial status instead of hiding a whole-universe wait.
- Long remaining work ends with `hasMore=true`, `anotherRunNeeded=true`, `PARTIAL`, or another explicit warning state.
- No-progress batches stop as `PARTIAL_BLOCKED` or approved equivalent with warning text and remaining blockers.
- Retry windows are honored so future retry-blocked rows do not churn provider calls.
- Progress summaries expose processed, total, supported, unsupported, retry-failed/validation-failed, retry-blocked/eligible where available, skipped, no-op, failed, warnings/errors, queue mode, scope, and remaining counts.
- Latest-run and repair-run records include before/after snapshots and `universeSignoff`; success styling requires completed work plus passing trust/signoff, not merely an HTTP 200.

Immediate QA rejection triggers:

- Any path can launch unbounded provider validation from one UI click or one API call.
- Drain mode retries failed providers while unknown rows remain and are still decreasing.
- Retry-failed rows are hidden inside unknown counts or unknown rows are hidden by retry-failed counts.
- `UNSUPPORTED` rows still inflate supported-only catalog identity, business metadata, or price backfill blockers.
- Queue count does not decrease, but the run continues looping or reports green success.
- Provider/rate-limit failures are retried immediately in a tight loop.
- Responses omit enough counts to determine whether the universe improved, stalled, or merely reclassified rows.
- Downstream modules are unblocked by relaxed gates rather than by provider classification and subsequent data repair.
- A stock is marked deeply ready with less than 15 years of daily OHLCV when it is old enough to have 15 years, or less than full listing-date history when it is younger.

## 6. Residual Risk List

| Risk | Impact | QA handling |
| --- | --- | --- |
| Live Yahoo/provider coverage may classify many Indian catalog rows as unsupported or retry-failed. | Trusted universe may remain small even if MD-A4 works correctly. | Accept classification if honest; require PO decision on catalog/provider/manual fallback. |
| Provider rate limiting or intermittent network failures may dominate tiny live runs. | Retry-failed counts can grow without proving true support coverage. | Require retry state, `nextRetryAt`, warnings, and no tight retry loops. |
| Yahoo may not provide enough Indian stock coverage. | MD-A4 may still leave too many rows unavailable. | Require explicit free-fallback evidence or `FREE_FALLBACK_REQUIRED`; reject paid provider substitution. |
| Listing dates may be missing for some rows. | Required start date may fall back to 15-year lookback, and younger listings may need MD-A5 identity/listing-date repair. | Record listing-date gaps separately; do not hide them as provider unsupported. |
| Existing local database state may be stale or already partially classified. | Before/after movement may be small or non-representative. | Record exact snapshots and avoid extrapolating from tiny batches. |
| Full drain performance remains unproven by tiny QA batches. | Small-batch pass does not guarantee full catalog drain duration. | Require bounded progress mechanics and leave full drain as Orchestrator-authorized operational evidence. |
| Unsupported classification policy may be too aggressive for provider symbol/catalog identity errors. | Correctable rows could be excluded from repair queues prematurely. | QA checks that ambiguous failures remain retry/manual/correctable, not clean unsupported. |
| UI may pass mocked states while backend response field names differ. | Runtime display can miss real counts. | Require at least one local API/UI smoke or documented blocker after implementation. |
| Universe signoff may still fail after provider validation because metadata and price blockers remain. | Product may confuse MD-A4 success with full Market Data readiness. | QA requires signoff/downstream messaging to remain negative until all gates pass. |
| Existing tests cover much of the contract but may not assert live drain behavior. | Regression suite can pass without proving MD-A4 product value. | Final QA gate requires bounded live/local evidence or explicit live blocker. |

## Required QA Gates

MD-A4 cannot be signed off until these gates are complete or explicitly blocked:

| Gate | Required result |
| --- | --- |
| Backend focused tests | Provider validation queue selection, retry classification, unsupported exclusion, drain order, no-progress partial, dry-run/no-mutation, and latest-run evidence pass. |
| Backend API samples | Direct validation, repair-plan, health, repair-run, and latest-run responses expose scope, counts, queue mode, before/after state, signoff, and remaining blockers. |
| Frontend mocked workflow | Separate unknown and retry actions, bounded payloads, warning partial states, completed-but-untrusted treatment, and health refresh pass. |
| Bounded live/local evidence | Very small `IN / STOCK` unknown validation run shows queue movement or explicit classification; retry/drain checks run only within bounds or are blocked with owner/reason. |
| Performance/progress acceptance | No unbounded UI/API provider path; no infinite drain loop; no green state while work remains or signoff fails. |
| Residual risk review | Provider coverage, rate limits, unsupported ambiguity, full-drain duration, and remaining downstream blockers are documented for PO/Architect decision. |

## QA Signoff Standard

QA signoff requires focused backend evidence, mocked UI evidence where the workflow changed, and one authorized bounded live/local check or an accepted blocker. The signoff must state whether MD-A4 meets the PO standard: `IN / STOCK` provider validation can drain fresh unknowns first, classify retry/unsupported/provider-supported outcomes honestly, keep retry failures visible and separate, and preserve fail-closed universe signoff until downstream readiness genuinely improves.
