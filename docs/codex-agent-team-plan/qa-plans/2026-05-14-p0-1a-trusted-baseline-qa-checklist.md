# P0.1A QA Checklist - Market Data Trusted Baseline DTO And Residual States

Date: 2026-05-14
Mode: QA Verification Planning Mode
Owner: QA Shadow (P0.1A)
Status: Ready for implementation handoff evidence

## Scope

Packet under QA planning: `P0.1A - Market Data Trusted Baseline DTO And Residual States`
Implementation scope anchor:
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts`
- focused tests under `backend/tests/modules/market-data-foundation/`

QA planning constraints:
- No runtime source edits
- No Playwright
- No heavy provider jobs

## Verification Objectives

1. Confirm additive trusted-baseline instrument fields are exposed for downstream consumers without breaking existing review-readiness summary contract.
2. Confirm every active scoped stock resolves to an explicit residual state (no generic partial/failure collapse).
3. Confirm missing listing date cannot promote deep-history readiness.
4. Confirm Yahoo insufficiency remains distinct from approved free/public fallback exhaustion.
5. Confirm blocker codes and state mapping remain stable and deterministic.

## Expected Residual-State Scenarios (Must Be Explicitly Verifiable)

For `region=IN&assetType=STOCK`, implementation must allow QA to identify each state from API payload evidence:

1. `REVIEW_READY`: provider-supported, fresh/latest completed EOD aligned, required history complete, listing-date policy satisfied.
2. `REQUIRED_HISTORY_INCOMPLETE`: provider-supported but stored-through date precedes required-history start/end window.
3. `LISTING_DATE_MISSING_REQUIRED_15Y`: provider-supported with missing listing date; required baseline remains 15-year target and stays blocked.
4. `FALLBACK_REQUIRED_AFTER_YAHOO_ZERO_ROWS`: Yahoo returns zero usable rows and approved free official/public fallback is still required.
5. `FALLBACK_ATTEMPTED_STILL_INCOMPLETE`: fallback source attempted, but required history still incomplete.
6. `CATALOG_IDENTITY_REPAIR_REQUIRED`: provider symbol/ISIN/listing date/exchange identity repair needed.
7. `RETRY_BLOCKED_PROVIDER_VALIDATION`: retry cooldown/blocked validation state visible as explicit residual.
8. `UNSUPPORTED_OR_INACTIVE_EXCLUDED`: unsupported or inactive/delisted remains excluded and non-promotable.

Reject if any active in-scope stock can only be interpreted as generic `PARTIAL`, `ERROR`, or an unclassified bucket.

## Focused Backend Tests To Run After Implementation

Primary suite (must pass):
1. `backend/tests/modules/market-data-foundation/market-data.universe.test.ts`
2. `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
3. `backend/tests/modules/market-data-foundation/market-data.routes.test.ts`
4. `backend/tests/modules/market-data-foundation/market-data.validation.test.ts`

Secondary guard (run if DTO/routing touched):
1. `backend/tests/modules/market-data-foundation/market-data.repository.test.ts`

Recommended command pattern (focused):
- `npm.cmd run test -- backend/tests/modules/market-data-foundation/market-data.universe.test.ts backend/tests/modules/market-data-foundation/market-data.service.test.ts backend/tests/modules/market-data-foundation/market-data.routes.test.ts backend/tests/modules/market-data-foundation/market-data.validation.test.ts`

## API Sample Evidence Required (Bounded)

Capture one bounded local evidence pass (existing running services only):

1. `GET /api/v1/market-data/review-readiness-summary?region=IN&assetType=STOCK`
   - Must show backward-compatible fields: `reviewMode`, `trustStatus`, `userDecision`, `reviewUniverse`, `readinessCounts`, `nextAction`, `blockers`.
   - Must not regress summary semantics while adding baseline detail.

2. `GET /api/v1/market-data/review-universe?region=IN&assetType=STOCK`
   - Must show `requiredDataThroughDate`, `storedDataThroughDate`, `targetTradingDate`, `trustedCount`, `excludedCounts`, `contextGapCounts`.
   - Must show blocker/warning signal that distinguishes listing-date-missing and fallback-required paths.

3. `GET /api/v1/market-data/review-universe/instruments?region=IN&assetType=STOCK&limit=25&offset=0`
   - Must expose per-instrument trusted-baseline evidence needed to classify residual state (latest completed EOD relation, required history status, listing-date status, fallback/provider state, stable blocker codes).

Evidence must include at least one concrete sample instrument for:
- listing-date missing path,
- Yahoo zero-row/fallback-required path,
- required-history-incomplete path,
- review-ready path.

## Rejection Conditions (Hard Fail)

1. Any baseline field required by P0.1A is missing or ambiguous in instrument-level DTO.
2. Residual-state classification is not exhaustive for active scoped stocks.
3. Missing listing date can still result in effective deep-history readiness promotion.
4. Yahoo zero-row insufficiency is merged with unsupported/failure without explicit fallback-required semantics.
5. Blocker codes drift or become non-deterministic across equivalent inputs.
6. Existing `review-readiness-summary` contract breaks (field removal, rename, or semantic contradiction).
7. Evidence relies on heavy provider runs or unbounded jobs instead of bounded local snapshots.

## Current Test-Gap Notes (Pre-Implementation)

1. Existing tests strongly cover trusted-universe readiness and blocker behavior, but do not yet assert a dedicated P0.1A instrument-level residual-state DTO contract end-to-end.
2. Existing tests verify listing-date missing blocker behavior; add/adjust assertions to prove it cannot promote required-history completion in new baseline mapping.
3. Existing coverage distinguishes fallback-required messaging; add/adjust assertions to lock explicit residual-state codes, not only warning text.
4. Route tests currently verify endpoint wiring; add shape assertions for new additive baseline fields in `/review-universe/instruments`.
5. Add deterministic-code assertions to prevent accidental blocker/residual label drift.

## Blockers And Dependencies

Current blocker: implementation not yet delivered for P0.1A residual-state DTO additions and associated tests.
QA execution blocker: runtime/API evidence cannot be finalized until backend handoff lands.

## Handoff Notes (QA Shadow)

Artifact prepared: `docs/codex-agent-team-plan/qa-plans/2026-05-14-p0-1a-trusted-baseline-qa-checklist.md`
State: Complete (planning artifact), Blocked (execution pending implementation evidence)
Implementation risks to watch:
- additive DTO fields accidentally leaking into breaking summary changes,
- implicit state collapse into generic partial/failure buckets,
- listing-date logic incorrectly relaxing required-history thresholds,
- fallback-required semantics being downgraded to non-actionable warnings.
