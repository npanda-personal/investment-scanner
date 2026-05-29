# CF-W3-MI-01D - Persisted Index And Breadth Read

Date: 2026-05-29

## Status

Accepted for scoped local commit after QA, Architect, and Product Owner review.

## Scope

Third Market Intelligence target-state slice.

Implemented:

- `GET /api/v1/market-context/persisted-breadth`.
- Read-only ready/missing response envelope for saved market participation evidence.
- Official advance, decline, and unchanged counts remain unavailable/null with explicit gap notes.
- Breadth And Participation page uses the persisted breadth route instead of materializing `/market-context/breadth` or `/market-context/summary`.
- Breadth page shows SMA50/SMA200 denominator evidence and trader-facing missing states.
- Indices Workspace continues to use the existing local `INDEX` instrument catalog and shows honest gaps for constituents, weights, contributors, and index breadth.

Not included:

- Prisma schema or migration changes.
- Backend route registry changes.
- Shared utility or shared UI changes.
- Market Data Foundation source changes.
- Official NSE advance/decline ingestion.
- Index constituents, weights, contributor/detractor models, or index breadth persistence.
- FII/DII, derivatives, or market-map durable snapshot persistence.

## Files Changed

- `backend/src/modules/market-context-intelligence/index.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.controller.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.md`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.router.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.service.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.types.ts`
- `backend/tests/modules/market-context-intelligence/market-context-intelligence.controller.test.ts`
- `backend/tests/modules/market-context-intelligence/market-context-intelligence.routes.test.ts`
- `backend/tests/modules/market-context-intelligence/market-context-intelligence.service.test.ts`
- `frontend/src/features/market-context-intelligence/api/marketContextIntelligenceService.ts`
- `frontend/src/features/market-context-intelligence/index.ts`
- `frontend/src/features/market-context-intelligence/types.ts`
- `frontend/src/features/market-intelligence/api/marketIntelligenceService.ts`
- `frontend/src/features/market-intelligence/components/MarketIntelligencePages.tsx`
- `frontend/src/features/market-intelligence/types.ts`
- `frontend/tests/ui/market-intelligence.spec.ts`

## TDD Evidence

- QA first added failing tests for `latestPersistedBreadth`, `persistedBreadth`, route registration, and the user-facing Breadth page.
- Red run failed on missing service/controller methods and missing route registration before production code changed.
- Production implementation then made the focused backend tests pass.

## Validation

- `backend`: `npm.cmd test -- market-context-intelligence.service.test.ts market-context-intelligence.controller.test.ts market-context-intelligence.routes.test.ts --runInBand` passed, 3 suites / 20 tests.
- `backend`: `npm.cmd run build` passed.
- `frontend`: `npm.cmd run build` passed.
- `frontend`: `npm.cmd run test:ui -- market-intelligence.spec.ts daily-overview-dashboard.spec.ts user-admin-route-segregation.spec.ts --workers=1 --project=chromium --reporter=list` passed, 10 tests before Product Owner copy rework.
- `frontend`: `npm.cmd run test:ui -- market-intelligence.spec.ts --workers=1 --project=chromium --reporter=list` passed, 8 tests after Product Owner copy rework.
- `frontend`: `npm.cmd run test:ui -- market-intelligence.spec.ts --workers=1 --project=chromium --reporter=list` passed, 8 tests after QA operator-wording coverage rework.
- `git diff --check` passed with normal CRLF warnings only.

Temporary Vite process was stopped after UI validation.

## Review Gates

- Architect final review: accepted.
- Product Owner first review: rejected trader-facing internal copy.
- Product Owner rereview: accepted after Breadth page wording was changed to trader-facing evidence language.
- QA first final review: rejected missing operator-wording coverage.
- QA rereview: accepted after the trader page wording guard was scoped to main content and expanded for operator/developer/advice wording.

## Known Follow-Ups

- Region-aware breadth source labeling is needed before non-IN scopes can make equally precise source claims.
- Official advance/decline/unchanged persistence remains a future source-storage slice.
- Exact persisted denominator rows remain a future fidelity improvement.
- Index constituents, weights, contributors, detractors, and index-level breadth remain future durable read-model work.

## Next Slice

Continue with institutional flow and derivatives context persistence strategy, unless Product Owner redirects.
