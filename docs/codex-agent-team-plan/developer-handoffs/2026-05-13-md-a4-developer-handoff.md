# MD-A4 Developer Handoff - Provider Validation Drain And Retry Classification

Date: 2026-05-13  
Mode: Lead Work Packet / Implementation Handoff  
Owner: Senior Fullstack Lead / Orchestrator  
Work item: MD-A4 - Provider Validation Drain And Retry Classification

## Inputs

- Product brief: [MD-A4 product brief](../po-briefs/2026-05-13-md-a4-provider-validation-drain-product-brief.md)
- Architecture contract: [MD-A4 architecture contract](../architecture-contracts/2026-05-13-md-a4-provider-validation-drain-contract.md)
- QA plan: [MD-A4 QA plan](../qa-plans/2026-05-13-md-a4-provider-validation-drain-qa-plan.md)
- Missing-data PO audit: [Market Data missing-data root-cause audit](../po-audits/2026-05-13-market-data-missing-data-root-cause-audit.md)
- Missing-data architecture audit: [Market Data missing-data architecture audit](../architecture-contracts/2026-05-13-market-data-missing-data-architecture-audit.md)

## Product Goal

Convert `IN / STOCK` provider validation from coarse status changes into a durable classifier. Unknown rows must drain before retry-failed rows. Valid rows become `SUPPORTED` so MD-A3 price backfill can repair them. Clean unsupported rows stop inflating supported-only blockers. Retryable/provider-system failures and manual symbol repair cases remain visible with enough evidence to decide the next action.

Yahoo is not a final source-of-truth constraint. If Yahoo does not provide enough reliable completed-EOD OHLCV, the implementation must switch to or clearly prepare an approved free fallback source rather than accepting missing data. Preferred fallback sources for `IN / STOCK` are official/free exchange EOD files: NSE `CM-UDiFF Common Bhavcopy Final (zip)` and BSE Equity Bhav Copy / Historical Bhav Copy. Do not add paid providers, paid APIs, paid hosted services, or paid-provider free tiers without explicit PO and Architect approval.

History completeness target: every active stock must have 15 years of daily OHLCV, or all daily OHLCV from listing date through latest completed EOD if the company listed less than 15 years ago. If listing date is missing, default the required start to the 15-year lookback and keep listing-date repair visible as a separate context gap.

## Canonical Flow

`UNKNOWN_FIRST provider validation -> supported/unsupported/retry/manual classification -> repair-plan/health evidence -> RETRY_FAILED only after unknowns drain -> price backfill only for SUPPORTED rows`

## Backend Assignment

Owner: Lane 1A Market Data Backend developer

Allowed write scope:

- `backend/src/modules/market-data-foundation/market-data-foundation.provider.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- focused backend tests under `backend/tests/modules/market-data-foundation/`
- backend module docs only if API behavior is changed

Required backend changes:

- Keep `UNKNOWN_FIRST` as the default direct validation queue.
- Use offset-zero semantics for mutating provider-validation queues.
- Exclude `RETRY_FAILED` rows with provider-validation `MANUAL_REQUIRED` state from retry selection.
- Exclude retry-failed rows with future `nextRetryAt` unless an explicit bounded `force=true` retry path is used.
- Validate provider symbols over a completed-EOD-safe 45-calendar-day window for `IN / STOCK`, capped to `latestCompletedTradingDateForRegion`.
- Do not mark a row clean unsupported solely because Yahoo returns no useful data when an approved free exchange EOD fallback can be attempted or should be surfaced as required.
- Add/prepare free fallback diagnostics such as `freeFallbackRequired`, `fallbackSourceAttempted`, and provider/source provenance in summary/sample evidence.
- Include required-history diagnostics such as `requiredHistoryStartDate`, `listingDate`, and whether the selected provider/source can support the 15-year/listing-date coverage target.
- Add provider validation timeout/latency classification without adding paid services or external queues.
- Persist provider-validation attempts/states through existing `MarketDataRepairAttempt` and `MarketDataRepairState` using `repairType='PROVIDER_VALIDATION'`.
- Extend repair summary with machine-readable provider diagnostics from the architecture contract, including `supportedFromStoredPrices`, `unsupportedNoProviderSymbol`, `unsupportedNoCandlesWideWindow`, retryable reason counts, provider-call timing, remaining unknown/retry/manual counts, and sample results.
- Ensure zero/no-candle results over the wide validation window are not green success; they must classify as clean unsupported or manual/retry based on the contract.
- Preserve downstream fail-closed gates.

Backend validation before QA:

- `npm.cmd test -- --runTestsByPath tests/modules/market-data-foundation/market-data.service.test.ts tests/modules/market-data-foundation/market-data.repository.test.ts tests/modules/market-data-foundation/market-data.provider.test.ts --runInBand`
- `npm.cmd run build`

## Frontend Assignment

Owner: Lane 1B Market Data Frontend developer

Allowed write scope:

- `frontend/src/features/market-data-foundation/types.ts`
- `frontend/src/features/market-data-foundation/api/marketDataFoundationService.ts` only if request/response types require it
- `frontend/src/features/market-data-foundation/components/MarketDataStatusPanel.tsx`
- `frontend/src/features/market-data-foundation/components/MarketDataFoundationPage.tsx` only if provider-status row evidence needs display
- `frontend/tests/ui/market-data-foundation.spec.ts`

Required frontend changes:

- Keep `Validate unknown providers` and `Retry failed providers` as separate actions.
- Ensure normal unknown validation sends `providerValidationQueue='UNKNOWN_FIRST'`, scoped `region`, `assetType`, bounded `batchSize`, and no broad symbol loop.
- Ensure retry sends `providerValidationQueue='RETRY_FAILED'` and stays visually secondary while unknown rows remain.
- Render provider-validation diagnostics: supported, unsupported, validation failed, supported from stored prices, retryable timeout/provider error/rate limit, manual symbol repair required, retry blocked/eligible/manual remaining, provider-call latency, validation window, and sample warning/results where returned.
- Render required-history diagnostics when returned: 15-year/listing-date target start, latest completed EOD target, and whether coverage is complete or still needs backfill/fallback.
- Treat `hasMore=true`, retryable/manual remaining, or signoff failure as warning/error evidence, not green completion.
- Preserve existing MD-A2 catalog sync progress and MD-A3 price backfill diagnostics.

Frontend validation before QA:

- `npm.cmd run build`
- `npm.cmd run test:ui -- market-data-foundation.spec.ts --workers=1 --output=test-results-md-a4`

## Forbidden Scope

- No Prisma schema/migration unless the Architect reopens the design.
- No paid provider, paid service, paid hosted queue, broker integration, or live trading integration.
- No downstream Signals, Strategy, Today Review, Trade Plan, Portfolio, Watchlist, or Alert gate relaxation.
- No broad full-universe provider run during tests.

## Handoff Requirements

Each implementation worker must self-test before QA and report:

- Files changed.
- Exact validation commands and results.
- Any skipped checks with blocker reason.
- Whether provider validation remains bounded and no button/API can run an unbounded provider drain.
- Residual risks, especially if live provider state cannot be fully exercised locally.
