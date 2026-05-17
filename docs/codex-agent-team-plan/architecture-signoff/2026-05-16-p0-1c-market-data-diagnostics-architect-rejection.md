# Architect Review - P0.1C Market Data Diagnostics

Date: 2026-05-16
Mode: Architect Signoff Mode
Owner: Solution Architect / Orchestrator
Work item: P0.1C Market Data Business Metadata Diagnostics

## Inputs Reviewed

- Backend diagnostics:
  - `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- Frontend diagnostics:
  - `frontend/src/features/market-data-foundation/types.ts`
  - `frontend/src/features/market-data-foundation/components/MarketDataStatusPanel.tsx`
- Tests and validation:
  - `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
  - backend build
  - frontend build
- Current mixed worktree context:
  - Angel One read-only historical provider integration
  - price backfill concurrency/throttle behavior
  - catalog identity and repair-plan behavior changes

## Decision

Status: `REJECTED - SCOPE SPLIT REQUIRED`

The diagnostics implementation itself is not rejected on its own merits. The Architect rejected moving this item to signoff because the current review bundle mixes diagnostics with broader provider and repair-behavior changes. Per the team process, the item returns to Revision Mode until the review artifacts separate:

- Diagnostics-only acceptance criteria and validation.
- Angel/provider/backfill architecture acceptance criteria and validation.

## Rejection Reasons

1. The reviewed bundle includes Angel One provider runtime wiring, which is outside a diagnostics-only scope.
2. The reviewed bundle includes repair behavior changes for catalog identity, price backfill concurrency, retry handling, and required-history tolerance.
3. Retry-cooldown suppression in repair-plan counts needs explicit architecture validation because it can reduce blocker counts during provider churn.

## Passed Checks

- `businessMetadataBlockerDiagnostics` is scoped to `IN / STOCK`.
- Diagnostics are observability only and are not part of downstream signoff gating.
- The frontend panel is compact and useful.
- Required fields are exactly `sector`, `industry`, and positive `marketCap`.

## Revision Owner

Senior Fullstack Lead / Orchestrator.

## Required Revision

1. Keep the diagnostics code in Revision Mode until Lead validation explicitly scopes it as diagnostics-only.
2. Create or update a separate Angel/provider architecture review artifact covering:
   - user-owned Angel One account use for read-only Indian historical data,
   - no paid data-provider subscription,
   - orders disabled,
   - Yahoo retained for US and non-IN fallback,
   - rate-limit-safe concurrency and throttle policy.
3. Create or update a separate repair-behavior review artifact covering:
   - catalog identity actionable filtering,
   - price-backfill concurrency/throttle controls,
   - retry-cooldown count treatment,
   - 7-day required-history tolerance.

## Next Gate

Return diagnostics to Lead validation after scope separation, then resubmit to Architect signoff.
