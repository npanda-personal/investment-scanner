# MD-A4 Provider Validation Drain And Retry Classification Architecture Contract

Date: 2026-05-13  
Mode: Architecture Planning Mode  
Owner: MD-A4 Solution Architect Agent  
Lane/module: Lane 1, `market-data-foundation`  
Work item: MD-A4 - Provider Validation Drain And Retry Classification  
Owned artifact: `docs/codex-agent-team-plan/architecture-contracts/2026-05-13-md-a4-provider-validation-drain-contract.md`

## 1. Current-State Root Cause Summary

Market Data Foundation still cannot prove a sufficiently large usable `IN / STOCK` universe because provider support is not durably classified for too much of the active catalog. Rows with `providerSupportStatus=null`, blank, or `UNKNOWN` are catalog-only. They are excluded from trusted review, price backfill, Today Review, Signal Quality, Strategy Decision, and Trade Plan workflows until a provider result proves they are supported.

Product clarification on 2026-05-13: Yahoo must not be treated as the only source of truth. If Yahoo does not provide enough reliable completed-EOD OHLCV, the architecture must switch to or fall back to another free source before accepting missing data. Paid providers, paid APIs, broker APIs, and paid hosted services remain forbidden.

Product clarification on 2026-05-13: the coverage target is 15 years of daily OHLCV for every active stock, or complete daily OHLCV from listing date through latest completed EOD when the company listed less than 15 years ago. This coverage target applies before downstream Signals, Decisions, Today Review, or Trade Plans can treat the instrument as deeply data-ready.

The existing code has the right first shape but not the full durable contract:

- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
  - `listStocksForProviderValidation` already separates `UNKNOWN_FIRST` from `RETRY_FAILED`.
  - `providerValidationWhere` selects active, non-delisted scoped rows and treats `VALIDATION_FAILED` as the retry queue.
  - `updateProviderSupportStatus` persists only `providerSupportStatus` and free-text `providerError`.
  - `markProviderSupportedFromStoredPrices` can repair `UNKNOWN` to `SUPPORTED` when usable price history already exists.
- `backend/src/modules/market-data-foundation/market-data-foundation.provider.ts`
  - `validateProviderSymbol` uses a recent 10-calendar-day Yahoo chart call and returns only `supported`, `failed`, and `message`.
  - Provider chart/profile calls do not expose a local timeout, latency counter, retry reason code, or next retry time.
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
  - `validateProviders` processes one bounded batch and maps supported to `SUPPORTED`, provider errors to `VALIDATION_FAILED`, and zero candles/no provider symbol to `UNSUPPORTED`.
  - `repairRun` orders `VALIDATE_PROVIDERS` before `RETRY_FAILED_PROVIDERS` and blocks retry-failed rows while unknown rows remain.
  - Drain no-progress logic currently judges provider validation by queue reduction, but it cannot distinguish clean unsupported rows, retryable transient failures, and manual symbol repair cases with enough evidence.
  - `repairPlan`, `universeHealth`, `reviewReadinessSummary`, `hardBlockersFromHealth`, and `universeSignoffFromHealth` already surface provider unknown, retry failed, unsupported excluded, and provider-supported counts.
- Backend routes:
  - `POST /api/v1/market-data/provider/validate` calls `validateProviders`.
  - `POST /api/v1/market-data/universe/repair-run` calls `repairRun`.
  - `GET /api/v1/market-data/universe/repair-plan`, `GET /api/v1/market-data/universe/health`, `GET /api/v1/market-data/review-readiness-summary`, and `GET /api/v1/market-data/review-universe` show the downstream impact.
- Frontend:
  - `frontend/src/features/market-data-foundation/api/marketDataFoundationService.ts` exposes `validateMarketDataProviders`, `runMarketDataUniverseRepair`, and repair plan/health APIs.
  - `MarketDataStatusPanel.tsx` shows unknown, retry failed, unsupported excluded, one-batch provider validation actions, operational drain actions, and the latest repair result.
  - `MarketDataFoundationPage.tsx` exposes provider support status in catalog filters/table/detail, but row-level retry reason/next retry evidence is not available as structured data.

Root cause:

The validation lane is bounded, but the state model and provider result taxonomy are too coarse. `VALIDATION_FAILED` is the only retry bucket, `UNSUPPORTED` can be assigned from a short recent no-candle window, and the UI cannot prove why rows are now supported, unsupported, retry-delayed, retry-eligible, or manual-symbol-repair-required. This leaves valid stocks unable to enter MD-A3 price backfill and leaves invalid or unrepairable rows blocking operator confidence.

## 2. Architecture Decision

Chosen option: harden the existing provider validation repair lane, not a new subsystem.

MD-A4 must keep the existing canonical operator actions:

- `POST /api/v1/market-data/provider/validate`
- `POST /api/v1/market-data/universe/repair-run`
- `GET /api/v1/market-data/universe/repair-plan`
- `GET /api/v1/market-data/universe/repair-workbench`
- Existing frontend repair workbench in `MarketDataStatusPanel.tsx`

The backend must make provider validation a durable classifier with these externally meaningful states:

- `SUPPORTED`: provider produced usable OHLCV evidence or existing usable stored OHLCV proves provider support.
- `UNSUPPORTED`: provider symbol is absent/unmappable or provider returned a clean no-security/no-chart/no-candle result after a wide completed-EOD-safe validation window.
- `VALIDATION_FAILED` with retry state: transient provider/system failure, timeout, rate limit, network error, or unknown provider exception. It must carry `nextRetryAt` and retry reason evidence.
- `VALIDATION_FAILED` with manual-required state: symbol identity is ambiguous, provider symbol is malformed, or repeated no-security evidence indicates local catalog/provider-symbol repair is needed before another automatic retry.
- `UNKNOWN`: not yet attempted. This queue must drain before retry-failed rows are retried.

Durability contract:

- Keep `Stock.providerSupportStatus` as the compatibility field with values `SUPPORTED`, `UNSUPPORTED`, `UNKNOWN`, and `VALIDATION_FAILED`.
- Use the existing `MarketDataRepairAttempt` and `MarketDataRepairState` tables for detailed durable provider-validation evidence with `repairType='PROVIDER_VALIDATION'`.
- No new paid providers, paid tools, hosted queues, broker APIs, or paid observability services.
- No downstream gate relaxation. Unknown, retry-failed, unsupported, and manual-required provider rows remain excluded from price backfill and trusted review until correctly classified.

Free provider fallback contract:

- Approved default fallback direction for `IN / STOCK` is public/free exchange EOD data, not a commercial paid-data API.
- Preferred sources to design around are NSE official reports, especially `CM-UDiFF Common Bhavcopy Final (zip)` available from `https://www.nseindia.com/all-reports`, and BSE Equity Bhav Copy / Historical Bhav Copy from `https://www.bseindia.com/markets/MarketInfo/BhavCopy.aspx`.
- Yahoo no-candle, shallow-history, throttling, or provider-error evidence is not enough to permanently classify a row as unsupported if an approved free exchange EOD fallback can supply the candle.
- A provider is insufficient for product acceptance if it cannot supply the required history window: `max(listingDate, latestCompletedEod - 15 years)` through `latestCompletedEod`. If listing date is missing, fetch from the 15-year lookback and keep listing-date repair visible as a separate context gap.
- Provider provenance must stay visible: source name, validation window, date range, rows found, and reason for fallback must be included in summary/sample evidence.
- Free tiers of commercial paid providers are not approved by default because they can become paid dependencies or rate-limit bottlenecks. They require explicit PO and Architect approval before use.

Rejected option: add a separate provider-validation job system or external queue.

Reason: local personal app constraints and the existing repair-run path already provide bounded batches, repair attempts, snapshots, and UI entry points. MD-A4 needs stronger classification and evidence, not new infrastructure.

Implementation and validation must also honor the companion intake docs:

- `docs/codex-agent-team-plan/po-briefs/2026-05-13-md-a4-provider-validation-drain-product-brief.md`
- `docs/codex-agent-team-plan/qa-plans/2026-05-13-md-a4-provider-validation-drain-qa-plan.md`

## 3. Provider Validation Drain Contract

### Queue Ordering

Provider validation must remain dependency ordered:

1. Drain `UNKNOWN_FIRST` rows first.
2. Retry `RETRY_FAILED` rows only when `providerUnknownValidationNeeded === 0`.
3. Run price backfill only for `SUPPORTED` rows.
4. Exclude `UNSUPPORTED` and manual-required provider rows from price-backfill blocker counts.

`repairRun(mode='DRAIN_UNTIL_BLOCKED')` must not execute `RETRY_FAILED_PROVIDERS` while unknown provider validations remain. If the requested actions include retry while unknown remains, return `PARTIAL` or `PARTIAL_BLOCKED` with a warning naming the unknown count.

### Candidate Selection

`listStocksForProviderValidation` must keep offset-zero semantics for mutating queues:

- `UNKNOWN_FIRST`: active, non-delisted, scoped rows where `providerSupportStatus` is null, blank, or `UNKNOWN`.
- `RETRY_FAILED`: active, non-delisted, scoped rows where `providerSupportStatus='VALIDATION_FAILED'` and provider-validation repair state is retry-eligible.
- Retry queue must exclude rows with `nextRetryAt > now`.
- Retry queue must exclude rows with durable `MANUAL_REQUIRED` provider-validation state unless `force=true` is explicitly supplied.

Ordering must be deterministic:

1. Existing usable price history but unknown status first, so `repairProviderSupportFromStoredPrices` can resolve them without provider calls.
2. Rows with valid `providerSymbol`.
3. Rows requiring deterministic provider-symbol mapping.
4. Symbol ascending as tiebreaker.

### Validation Window

The 10-calendar-day provider check is insufficient for Indian equities because holidays, suspensions, illiquidity, or stale local symbols can produce false unsupported results.

Validation and backfill must distinguish two windows:

- Provider support validation window: a bounded completed-EOD-safe proof window used to classify provider support without full history fetch cost.
- Required history window: the durable data-availability window used by backfill and readiness: 15 years ending at latest completed EOD, or listing-date-to-latest-completed-EOD for younger listings.

Required policy:

- Validate against a completed-EOD-safe window, not current in-progress daily candles.
- Default validation lookback: at least 45 calendar days for `IN / STOCK`.
- Hard minimum for clean unsupported classification: no usable daily candles over at least 30 calendar days ending at `latestCompletedTradingDateForRegion(region)`.
- If latest completed EOD cannot be resolved, do not call the provider; classify the batch as retryable/system blocked with `MARKET_CALENDAR_UNCERTAIN`.
- If Yahoo cannot prove support inside the validation window, attempt the approved free exchange EOD fallback path before clean unsupported classification, or classify as `FREE_FALLBACK_REQUIRED`/manual-required if the fallback path is not yet implemented.
- Once a row is classified `SUPPORTED`, price backfill must target the required history window, not only a recent proof window.
- A future implementation may use a longer local default such as 90 days if provider load remains acceptable.

### Classification Taxonomy

Provider results must be classified with machine-readable reason codes. The status remains compatible with current `ProviderSupportStatus`, while `MarketDataRepairState`/attempt JSON carries the detailed class.

Required classes:

- `SUPPORTED_WITH_CANDLES`
  - Stock status: `SUPPORTED`.
  - State status: `RESOLVED`.
  - Effect: row becomes eligible for MD-A3 price backfill. `supportedPriceBackfillNeeded` may increase after MD-A4; that is expected progress when formerly unknown valid stocks become repair candidates.
- `SUPPORTED_FROM_STORED_PRICES`
  - Stock status: `SUPPORTED`.
  - State status: `RESOLVED`.
  - Effect: zero provider call required when local usable OHLCV already proves support. Successful OHLCV ingestion for a previously `UNKNOWN` row must also repair provider support to `SUPPORTED`.
- `UNSUPPORTED_NO_PROVIDER_SYMBOL`
  - Stock status: `UNSUPPORTED`.
  - State status: `MANUAL_REQUIRED` only if symbol identity can be repaired; otherwise `RESOLVED`.
  - Effect: excluded from price blocker counts; catalog remains visible.
- `UNSUPPORTED_NO_CANDLES_WIDE_WINDOW`
  - Stock status: `UNSUPPORTED`.
  - State status: `RESOLVED`.
  - Effect: excluded from price blocker counts; provider evidence must include requested provider symbol and validation window.
- `FREE_FALLBACK_REQUIRED`
  - Stock status: `VALIDATION_FAILED` until fallback completes.
  - State status: `FAILED_RETRYABLE` or `MANUAL_REQUIRED` depending on whether the missing step is automatic fallback implementation or symbol/source mapping.
  - Effect: the row remains visible as a data-availability blocker; it must not be hidden as clean unsupported solely because Yahoo had no useful data.
- `RETRYABLE_TIMEOUT`
  - Stock status: `VALIDATION_FAILED`.
  - State status: `FAILED_RETRYABLE` or `RETRY_COOLDOWN`.
  - Effect: visible retry blocker with `nextRetryAt`.
- `RETRYABLE_PROVIDER_ERROR`
  - Stock status: `VALIDATION_FAILED`.
  - State status: `FAILED_RETRYABLE` or `RETRY_COOLDOWN`.
  - Effect: visible retry blocker with error family and `nextRetryAt`.
- `RETRYABLE_RATE_LIMITED`
  - Stock status: `VALIDATION_FAILED`.
  - State status: `RETRY_COOLDOWN`.
  - Effect: retry blocked until cooldown.
- `MANUAL_SYMBOL_REPAIR_REQUIRED`
  - Stock status: `VALIDATION_FAILED`.
  - State status: `MANUAL_REQUIRED`.
  - Effect: excluded from automatic retry queue and surfaced for catalog identity/provider-symbol repair.
- `VALIDATION_SKIPPED_CALENDAR_UNCERTAIN`
  - Stock status: unchanged.
  - State status: `FAILED_RETRYABLE`.
  - Effect: batch stops or skips provider calls with clear warning.

### Retry Budget And Backoff

Provider-validation retry state must be durable:

- Persist one `MarketDataRepairAttempt` per attempted stock with:
  - `repairType='PROVIDER_VALIDATION'`
  - `status` equal to the detailed class or a compatible short status
  - `provider='yahoo'`
  - `error`, `manualRequiredReason`, and evidence JSON where available
- Upsert one `MarketDataRepairState` per stock and repair type with:
  - `status='RESOLVED'`, `FAILED_RETRYABLE`, `RETRY_COOLDOWN`, or `MANUAL_REQUIRED`
  - `nextRetryAt` for retryable failures
  - `lastAttemptedAt`, `resolvedAt`, `error`, and `manualRequiredReason`

Default retry policy:

- Attempt 1 retry delay: 30 minutes.
- Attempt 2 retry delay: 2 hours.
- Attempt 3 retry delay: 12 hours.
- Attempt 4+ retry delay: 24 hours, unless the result becomes manual-required.
- `force=true` can bypass retry cooldown for a bounded explicit batch, but cannot bypass provider call timeout, validation window, or manual-required exclusion unless a specific `includeManualRequired=true` implementation flag is approved.

## 4. API And Data Contract

Canonical direct endpoint remains:

`POST /api/v1/market-data/provider/validate`

Request:

```json
{
  "region": "IN",
  "assetType": "STOCK",
  "batchSize": 50,
  "providerValidationQueue": "UNKNOWN_FIRST",
  "force": false
}
```

Field rules:

- `region`: required by UI; backend may default to `IN` for compatibility.
- `assetType`: required by UI; backend may default to `STOCK` for compatibility.
- `batchSize`: default `50`, hard max `100`.
- `offset`: accepted for compatibility but ignored for mutating provider queues; backend uses `offset=0`.
- `providerValidationQueue`: `UNKNOWN_FIRST` or `RETRY_FAILED`; default `UNKNOWN_FIRST`.
- `force`: optional. Bypasses retry cooldown only for `RETRY_FAILED`; does not bypass timeout, latest-completed-EOD cap, or batch size caps.

Response must extend `MarketDataRepairSummary` with structured provider-validation evidence:

```json
{
  "scope": { "region": "IN", "assetType": "STOCK" },
  "processedCount": 50,
  "totalCount": 2909,
  "batchSize": 50,
  "offset": 0,
  "nextOffset": 0,
  "hasMore": true,
  "updated": 47,
  "skipped": 1,
  "failed": 2,
  "noOp": 0,
  "providerValidationQueue": "UNKNOWN_FIRST",
  "providerValidated": 49,
  "providerSupported": 43,
  "providerUnsupported": 4,
  "validationFailed": 2,
  "supportedFromStoredPrices": 1,
  "unsupportedNoProviderSymbol": 1,
  "unsupportedNoCandlesWideWindow": 3,
  "retryableTimeout": 1,
  "retryableProviderError": 1,
  "retryableRateLimited": 0,
  "manualSymbolRepairRequired": 0,
  "retryCooldownSkipped": 0,
  "manualRequiredSkipped": 0,
  "providerCalls": 49,
  "providerTimeouts": 1,
  "providerRetryableFailures": 2,
  "freeFallbackRequired": 0,
  "fallbackSourceAttempted": "NSE_CM_UDIFF_BHAVCOPY",
  "slowProviderCalls": 3,
  "maxProviderCallMs": 4500,
  "p95ProviderCallMs": 2800,
  "validationWindowStartDate": "2026-03-28",
  "validationWindowEndDate": "2026-05-12",
  "requiredHistoryStartDate": "2011-05-12",
  "listingDate": "2018-08-10",
  "latestCompletedEodDate": "2026-05-12",
  "remainingUnknown": 2859,
  "remainingRetryEligible": 12,
  "remainingRetryBlocked": 8,
  "remainingManualRequired": 5,
  "nextRetryAtMin": "2026-05-13T12:45:00.000Z",
  "sampleResults": [
    {
      "symbol": "ABC.NS",
      "providerSymbol": "ABC.NS",
      "status": "SUPPORTED",
      "classification": "SUPPORTED_WITH_CANDLES",
      "candlesFound": 32,
      "providerCallMs": 820,
      "nextRetryAt": null,
      "message": null
    }
  ],
  "warnings": []
}
```

Required response fields:

- Existing fields: `processedCount`, `totalCount`, `batchSize`, `nextOffset`, `hasMore`, `updated`, `skipped`, `failed`, `noOp`, `warnings`, `durationMs`, `providerValidationQueue`, `providerValidated`, `providerSupported`, `providerUnsupported`, `validationFailed`.
- New provider result counts:
  - `supportedFromStoredPrices`
  - `unsupportedNoProviderSymbol`
  - `unsupportedNoCandlesWideWindow`
  - `retryableTimeout`
  - `retryableProviderError`
  - `retryableRateLimited`
  - `manualSymbolRepairRequired`
  - `retryCooldownSkipped`
  - `manualRequiredSkipped`
- New provider observability counts:
  - `providerCalls`
  - `providerTimeouts`
  - `providerRetryableFailures`
  - `slowProviderCalls`
  - `maxProviderCallMs`
  - `p95ProviderCallMs` where practical; if exact percentile is too expensive, use bounded in-batch sample calculation.
- New queue evidence:
  - `remainingUnknown`
  - `remainingRetryEligible`
  - `remainingRetryBlocked`
  - `remainingManualRequired`
  - `nextRetryAtMin`
- New validation window evidence:
  - `validationWindowStartDate`
  - `validationWindowEndDate`
  - `latestCompletedEodDate`
- `sampleResults`: capped to latest 20 rows. It is for UI/operator evidence, not full audit export.

`repairPlan` and `universeHealth` must add or preserve these counts:

- `providerUnknownValidationNeeded`
- `providerRetryValidationNeeded`
- `providerRetryBlocked`
- `providerManualRepairRequired`
- `providerUnsupportedExcluded`
- `providerValidationFailed`
- `providerValidationNeeded`
- `retryFailedValidations`
- `nextProviderRetryAtMin`

`latestRepairRun` evidence must preserve provider-validation run context:

- scoped `IN / STOCK` request fields,
- actions requested and actions executed,
- queue mode for each provider-validation action,
- bounded batch size and max-batch controls,
- before/after repair-plan snapshots,
- before/after health snapshots,
- warnings/errors and representative failed symbols,
- `anotherRunNeeded`,
- `expectedNextAction`,
- `universeSignoff`,
- `downstreamAllowed` where present in the signoff payload.

Compatibility:

- Existing frontend code that only reads current fields must keep working.
- New fields may be optional during rollout but must be present in accepted MD-A4 implementation responses.

## 5. UI Evidence Expectations

No new top-level screen is required. The Market Data status/repair workbench remains the home.

`MarketDataStatusPanel.tsx` must show:

- Unknown provider validations remaining.
- Retry-failed provider validations eligible now.
- Retry-failed provider validations blocked by cooldown with earliest `nextRetryAt`.
- Manual provider-symbol repair required.
- Unsupported excluded from downstream price/metadata blockers.
- Last provider validation batch outcome:
  - supported,
  - supported from stored prices,
  - unsupported no provider symbol,
  - unsupported no candles after wide window,
  - retryable timeout/provider error/rate limit,
  - manual symbol repair required,
  - skipped due to cooldown/manual state.
- Provider timing evidence:
  - timeout count,
  - slow-call count,
  - max call duration,
  - validation window start/end.

Behavior:

- `Validate unknown providers` is enabled when `providerUnknownValidationNeeded > 0`.
- `Retry failed providers` is disabled while unknown remains, unless it is shown as dependency-blocked with exact unknown count.
- `Retry failed providers` is disabled when only cooldown-blocked/manual-required rows remain, with earliest retry time and manual count visible.
- Direct one-batch actions may remain synchronous only for the bounded batch. Long drain actions must use the existing operational repair-run flow and must not block the UI for an unbounded provider loop.
- A completed provider validation batch must not be rendered green if trust/signoff remains blocked; show progress plus remaining blockers.
- Catalog row detail or tooltip must show `provider_error` plus structured state where available: classification, next retry, validation window, and provider symbol.

`MarketDataFoundationPage.tsx` must preserve provider support filters and row detail, with optional structured evidence when API fields exist. It must not imply that `UNSUPPORTED` rows are data errors; they are excluded provider limitations or manual identity cases.

Operator workflow that UI/API evidence must support:

1. Capture baseline repair plan, universe health, review-readiness summary, and repair workbench for `region=IN&assetType=STOCK`.
2. Inspect representative `UNKNOWN` rows with the existing catalog/instrument filter.
3. Run `Validate unknown providers` with `providerValidationQueue='UNKNOWN_FIRST'`.
4. Repeat bounded unknown validation until `providerUnknownValidationNeeded=0` or remaining unknowns are explicit provider/system blockers with evidence.
5. Only then run `Retry failed providers` with `providerValidationQueue='RETRY_FAILED'` when retry-eligible rows exist.
6. Refresh health, repair plan, readiness, and latest-run evidence after each terminal action.
7. Show that review remains blocked or limited until price depth, latest completed EOD, volume, and trust criteria pass.

## 6. Performance And Bounded Work Requirements

Provider validation must be bounded and locally safe:

- Direct provider validation default `batchSize=50`.
- Hard max direct batch size `100`.
- Repair-run `maxBatchesPerAction` default remains bounded; hard max `100`.
- Effective provider validation concurrency default `1`.
- Hard max provider validation concurrency `2` only if a service-owned limiter is implemented.
- No frontend-driven parallel provider-validation loops.
- Provider call timeout default `8 seconds`, hard max config `15 seconds`.
- Slow-call threshold default `3 seconds`.
- Batch worst-case wall time must be bounded by `batchSize * providerTimeoutMs + local overhead` when concurrency is `1`, or equivalent with the service-owned limiter.
- Warning arrays and sample results must be capped; machine-readable counts carry the totals.
- No route may perform an unbounded full-catalog provider validation in one HTTP request.
- Live/local QA provider-validation evidence must default to tiny batches, `batchSize <= 3`, unless Orchestrator explicitly authorizes a larger bounded batch.
- Operational drain must run bounded batches and stop on:
  - unknown queue drained and retry queue dependency reached,
  - max batches reached,
  - no eligible retry rows because all are cooldown/manual-required,
  - repeated provider/system failures with no durable classification progress,
  - market calendar uncertainty before provider calls.

No long synchronous button action:

- A single direct batch may complete within one request because it is capped.
- Any "drain until blocked" action must remain the operational repair-run path with bounded per-action batches and clear progress/result evidence.
- Do not add a new UI button that tries to validate all unknown/retry rows in one request.

## 7. Single-Writer Implementation Scopes

Packet MD-A4-BE-1: Backend provider validation taxonomy, retry state, and timeout wrapper.

Owner: backend market-data provider-validation developer.  
Write scope:

- `backend/src/modules/market-data-foundation/market-data-foundation.provider.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- Backend tests under `backend/tests/modules/market-data-foundation/`

Expected output:

- `validateProviderSymbol` returns structured classification, call duration, candle count, and validation window evidence.
- Provider chart call has timeout handling and retryable/non-retryable classification.
- `validateProviders` persists provider validation attempts/states for `PROVIDER_VALIDATION`.
- Retry queue honors `nextRetryAt` and manual-required state.
- Direct response exposes the fields in this contract.

Forbidden:

- Frontend files.
- Paid providers/services/tools.
- Broker APIs or live trading.
- Unbounded full-catalog validation routes.
- Prisma schema changes unless the existing `MarketDataRepairAttempt`/`MarketDataRepairState` tables are proven insufficient and Orchestrator explicitly approves a migration.

Packet MD-A4-BE-2: Repair plan, health, workbench, and signoff counts.

Owner: backend universe/repair-plan developer after MD-A4-BE-1 field names stabilize.  
Write scope:

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- Focused backend tests

Expected output:

- Repair plan distinguishes unknown, retry eligible, retry blocked, manual-required, and unsupported excluded.
- Universe signoff still fails when unknown/retry/manual provider blockers remain.
- Unsupported rows are excluded from price backfill blocker counts.

Packet MD-A4-FE-1: UI/API evidence for provider validation drain.

Owner: frontend market-data owner after backend response fields are available.  
Write scope:

- `frontend/src/features/market-data-foundation/types.ts`
- `frontend/src/features/market-data-foundation/api/marketDataFoundationService.ts`
- `frontend/src/features/market-data-foundation/components/MarketDataStatusPanel.tsx`
- `frontend/src/features/market-data-foundation/components/MarketDataFoundationPage.tsx`
- `frontend/tests/ui/market-data-foundation.spec.ts`

Expected output:

- UI shows unknown, retry-eligible, retry-blocked, manual-required, unsupported-excluded counts.
- UI renders provider validation batch classification and timing evidence.
- Retry button state reflects dependency/cooldown/manual blockers.

Forbidden:

- Backend files.
- New screen unless Orchestrator explicitly requests it.
- Exposing unbounded "validate all" provider actions.

Packet MD-A4-QA-1: Validation evidence capture.

Owner: QA/Orchestrator assigned agent after implementation.  
Write scope:

- Assigned QA evidence document under `docs/codex-agent-team-plan/qa-evidence/`

Forbidden:

- Production code.
- Long unbounded live provider runs.

## 8. Validation Plan

Backend service/provider tests:

- Unknown row with usable stored OHLCV becomes `SUPPORTED` without a provider call and increments `supportedFromStoredPrices`.
- Unknown row with valid provider symbol and candles over the wide window becomes `SUPPORTED`.
- Unknown row with no provider symbol becomes `UNSUPPORTED` or manual-required according to symbol mapping evidence and increments `unsupportedNoProviderSymbol`.
- Unknown row with zero candles over the completed-EOD-safe wide window becomes `UNSUPPORTED` and increments `unsupportedNoCandlesWideWindow`.
- Provider timeout becomes `VALIDATION_FAILED`, durable `FAILED_RETRYABLE` or `RETRY_COOLDOWN`, increments `retryableTimeout`, and sets `nextRetryAt`.
- Provider network/5xx/unknown exception becomes retryable provider error with capped warning and next retry.
- Rate-limit-like provider error becomes `RETRY_COOLDOWN`.
- Malformed or ambiguous provider symbol becomes `MANUAL_SYMBOL_REPAIR_REQUIRED` and is excluded from automatic retry.
- Retry queue excludes cooldown-blocked rows unless `force=true`.
- Retry queue excludes manual-required rows.
- `UNKNOWN_FIRST` ignores caller offset and always uses the current first remaining batch.
- `RETRY_FAILED` ignores caller offset and always uses the current first retry-eligible batch.
- `repairRun(DRAIN_UNTIL_BLOCKED)` does not execute retry failed providers while unknown remains.
- `repairRun(DRAIN_UNTIL_BLOCKED)` treats movement from `UNKNOWN` to `SUPPORTED`, `UNSUPPORTED`, `VALIDATION_FAILED`, or manual-required as provider-validation progress.
- Provider call timeout bounds batch duration under mocked slow calls.
- Validation uses `latestCompletedTradingDateForRegion` for the window end and does not request in-progress daily candles.
- A newly supported row increases the supported candidate pool for price backfill without claiming review readiness.
- Unsupported rows are excluded from supported-only catalog identity, business metadata, price backfill, trusted-review, and missing-data blocker counts.

Repository tests:

- Provider validation state upsert is unique by `stockId + PROVIDER_VALIDATION`.
- Retry eligible count includes only `FAILED_RETRYABLE` or `RETRY_COOLDOWN` rows whose `nextRetryAt <= now` or null.
- Retry blocked count includes retry rows with future `nextRetryAt`.
- Manual-required provider state is counted separately from retry eligible.
- Unsupported rows are counted as unsupported excluded, not price-backfill-needed.

API/route tests:

- `POST /api/v1/market-data/provider/validate` accepts `providerValidationQueue=UNKNOWN_FIRST` and `RETRY_FAILED`.
- Response includes required classification, timing, queue, and validation-window fields.
- Unsafe batch sizes are clamped or rejected according to existing API style.
- Errors are returned as structured failures and do not leave the request hanging.
- Latest-run API exposes provider-validation queue mode, action order, before/after snapshots, warnings, signoff, and remaining blockers.

Frontend/UI tests:

- Provider workbench shows unknown, retry eligible, retry blocked, manual-required, and unsupported excluded counts.
- Validate unknown providers sends `providerValidationQueue='UNKNOWN_FIRST'`.
- Retry failed providers sends `providerValidationQueue='RETRY_FAILED'`.
- Retry button is dependency-blocked while unknown count is greater than zero.
- Retry button shows cooldown-blocked state when no retry-eligible rows exist and `nextProviderRetryAtMin` is present.
- Last batch result shows supported, unsupported, retryable failure, manual-required, timeout, slow-call, and validation-window evidence when present.
- A provider validation batch with failures is not rendered as green trust/signoff success if universe signoff still fails.

Manual/live local evidence:

- Capture `GET /api/v1/market-data/universe/repair-plan?region=IN&assetType=STOCK` before and after at least one bounded provider-validation batch.
- Capture `GET /api/v1/market-data/universe/health?region=IN&assetType=STOCK` before and after the same batch.
- Capture `GET /api/v1/market-data/review-readiness-summary?region=IN&assetType=STOCK` before and after the same batch.
- Capture `GET /api/v1/market-data/universe/repair-workbench?region=IN&assetType=STOCK` before and after the same batch.
- Capture one `POST /api/v1/market-data/provider/validate` for `UNKNOWN_FIRST` with `batchSize <= 3` unless a larger bounded batch is explicitly authorized.
- If retry rows exist and unknowns are drained or explicitly blocked, capture one `POST /api/v1/market-data/provider/validate` for `RETRY_FAILED` with `batchSize <= 3`; otherwise capture repair-plan evidence showing no retry-eligible rows.
- Optional tiny drain evidence may use `POST /api/v1/market-data/universe/repair-run` with `mode='DRAIN_UNTIL_BLOCKED'`, `batchSize <= 3`, and `maxBatchesPerAction=1`.
- Capture refreshed final `GET /api/v1/market-data/universe/health?region=IN&assetType=STOCK` and `GET /api/v1/market-data/review-readiness-summary?region=IN&assetType=STOCK`.
- Capture `GET /api/v1/market-data/universe/repair-runs/latest?region=IN&assetType=STOCK` after a repair-run path or state why latest-run evidence is not applicable to the direct one-batch path.
- Capture representative rows for supported, unsupported, retryable provider failure, and manual-symbol-repair-required when present.
- Capture proof that successful OHLCV ingestion on a previously `UNKNOWN` row changes provider support to `SUPPORTED`, either through existing automated test evidence or a tiny local fixture.
- Capture UI evidence showing the workbench counts and last batch classification evidence.
- Do not run unbounded full-catalog provider validation for QA.

## 9. Residual Risks And Rollback Notes

Risks:

- Free Yahoo endpoints can throttle, timeout, or change response shape. Retryable classification must preserve operator confidence without marking valid rows unsupported too aggressively.
- Wider validation windows increase provider load. Keep batches bounded and default concurrency at `1`.
- A clean no-candle result can still be ambiguous for suspended or illiquid instruments. Manual repair and unsupported evidence must remain visible.
- Existing `providerSupportStatus='VALIDATION_FAILED'` rows may lack repair-state details until retried or migrated by a lightweight reconciliation pass.
- `MarketDataRepairState` reuse avoids schema changes but requires careful namespacing by `repairType='PROVIDER_VALIDATION'`.
- Force retry can create provider load if overused. Keep batch caps and UI wording strict.

Rollback notes:

- If detailed repair-state handling causes issues, compatibility remains through `Stock.providerSupportStatus` and `providerError`.
- Timeout default can be increased locally by config if false retry failures are too common.
- Unsupported classification should be conservative; reverting a bad unsupported classification to `UNKNOWN` or `VALIDATION_FAILED` is safer than deleting rows or prices.
- Do not delete or rewrite existing prices as part of MD-A4.
- Do not weaken downstream trusted-universe gates during rollback.

## 10. Final Architecture Decision

MD-A4 will harden the existing bounded provider-validation lane into a durable classifier. Unknown rows drain first; retry-failed rows run only after unknowns are drained and only when retry-eligible; clean unsupported/manual rows stop blocking price backfill and operator progress; successful validation or usable stored OHLCV moves rows to `SUPPORTED` so MD-A3 can backfill prices. The implementation must preserve current APIs, add structured retry/manual/unsupported evidence through existing repair-state tables, cap provider calls with timeout and batch limits, and render UI evidence without adding paid services or long synchronous all-catalog actions.
