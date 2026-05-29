# CF-W3-MI-01F - Market Map Dedicated Read Path

Date: 2026-05-29

## Status

Accepted for scoped local commit after focused validation and standard QA/Product/Architect review.

## Scope

Fifth Market Intelligence target-state slice.

Implemented:

- `GET /api/v1/market-data/market-map`.
- Read-only `MarketMapSummary` envelope with `materialized=false`.
- Sector-grouped, performance-only Market Map tiles from stored daily price movement evidence.
- Market Map page now uses the dedicated Market Map read path instead of the broad Market Intelligence snapshot fanout.
- Market Map Playwright coverage now blocks page-load calls to Today Review, universe health, persisted market context, persisted breadth, materializing market-context reads, and generic instruments reads.

Not included:

- Prisma schema or migration changes.
- Backend route registry changes outside the existing Market Data v1 router.
- Shared UI, app route, navigation, package, provider, worker, scheduler, startup, or pipeline changes.
- Trigger density, Smart Money overlays, portfolio/watchlist overlays, official institutional flow, derivatives context, market-cap modes, or industry modes.

## Files Changed

- `backend/src/modules/market-data-foundation/index.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.controller.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/src/modules/market-data-foundation/market-data-foundation.router.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/tests/modules/market-data-foundation/market-data.routes.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
- `frontend/src/features/market-intelligence/api/marketIntelligenceService.ts`
- `frontend/src/features/market-intelligence/components/MarketIntelligencePages.tsx`
- `frontend/src/features/market-intelligence/types.ts`
- `frontend/tests/ui/market-intelligence.spec.ts`

## TDD Evidence

- Backend tests were added before production code and failed on missing `marketMap` service/controller/route.
- Playwright Market Map tests were added before production code and failed because the page still called broad snapshot fanout, including `/api/v1/today-review/latest`.
- Production changes were then added to satisfy the red tests.

## Validation

- `backend`: `npm.cmd test -- market-data.service.test.ts market-data.routes.test.ts --runInBand` passed, 2 suites / 163 tests.
- `backend`: `npm.cmd run build` passed.
- `frontend`: `npm.cmd run build` passed.
- `frontend`: `npm.cmd run test:ui -- market-intelligence.spec.ts --workers=1 --project=chromium --reporter=list` passed, 9 tests.
- Frontend build emitted the existing large chunk warning; no package or build configuration change was made.

Temporary Vite process was stopped after UI validation.

## Review Gates

- QA first final review: rejected because the real backend missing envelope put generic overlay gaps before the required no-data message, while the UI rendered `gaps[0]`.
- QA rerun: accepted after the no-data gap was moved first and backend/Playwright tests locked the contract.
- Product Owner review: accepted.
- Architect signoff: accepted.

## Known Follow-Ups

- A true persisted `MarketMapSnapshot` remains future work.
- Additional grouping modes require separate source/read-model design.
- Trigger, Smart Money, portfolio, watchlist, institutional-flow, derivatives, and official breadth overlays remain future slices and must not be inferred in this v1 map.

## Next Slice

Continue with the next Market Intelligence target-state persisted/read-only model after this commit is fast-forwarded into `dev`.
