# CF-W3-MI-01E - Institutional Flow And Derivatives Read-Only Frontend Slice

Date: 2026-05-29

## Status

Accepted for scoped local commit after focused validation and standard QA/Product/Architect review.

## Scope

Fourth Market Intelligence target-state slice.

Implemented:

- Institutional Flow now renders a formal missing-state surface for FII/FPI and DII evidence.
- Institutional Flow does not call shared market-context snapshot or materializing market APIs.
- Derivatives Context now renders a read-only not-enabled surface plus existing F&O eligible underlyings from the local instrument catalog.
- Derivatives Context calls only the existing `GET /api/v1/instruments` read with `derivativesEligible=true`.
- Playwright coverage now guards trader pages from shared writes, materializing/run/sync/generate/evaluate/calibrate/provider/live-style endpoints, operator wording, and advice-like language.

Not included:

- Prisma schema or migration changes.
- Backend source, backend tests, route registry, package, provider, worker, scheduler, startup, or pipeline changes.
- FII/FPI or DII source ingestion.
- Futures, options-chain, PCR, OI, strike, expiry, or derivatives snapshot persistence.
- New authorization behavior for `/admin/*`.

## Files Changed

- `frontend/src/features/market-intelligence/components/MarketIntelligencePages.tsx`
- `frontend/tests/ui/market-intelligence.spec.ts`

## TDD Evidence

- QA-owned Playwright assertions were expanded before final implementation to prove:
  - Institutional Flow does not show fake institutional-flow values or regime labels.
  - Institutional Flow makes no shared market-data API reads beyond authentication.
  - Derivatives Context stays read-only and does not imply option-chain/futures evidence.
  - Derivatives Context only uses local F&O catalog eligibility.
  - Market Intelligence user pages do not call materializing or mutation-style endpoints.

## Validation

- `frontend`: `npm.cmd run test:ui -- market-intelligence.spec.ts --workers=1 --project=chromium --reporter=list` passed, 8 tests.
- `frontend`: `npm.cmd run build` passed.
- Build emitted the existing large chunk warning; no new package or build configuration change was made.
- Backend tests/build were not run because this slice changed frontend-only files and no backend contract.

Temporary Vite process was stopped after UI validation.

## Review Gates

- QA final review: accepted.
- Product Owner review: accepted.
- Architect signoff: accepted.

## Known Follow-Ups

- Persisted institutional-flow read model remains required before showing FII/FPI or DII numbers.
- Persisted derivatives-context read model remains required before showing futures trend, option-chain summary, PCR, OI, strikes, expiry, or derivatives-derived market interpretation.
- Full derivatives context remains blocked from production-style claims until an approved source/storage/QA strategy exists.

## Next Slice

Continue with the next Market Intelligence target-state persisted read model after this commit is fast-forwarded into `dev`.
