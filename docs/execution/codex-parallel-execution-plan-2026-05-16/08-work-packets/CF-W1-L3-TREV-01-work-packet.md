# CF-W1-L3-TREV-01 Work Packet

Date: 2026-05-18

## Work Item

Today Review publication evidence and readiness-coherence normalization.

## State

Architecture packet prepared. Not Ready for Implementation.

This is a bounded Today Review vertical slice. It stays inside the Today Review backend module, Today Review frontend feature, module docs, and focused module/UI tests.

## Owner / Lane / Modules

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 07 Portfolio / Watchlists / Alerts
- Lane: Lane 3
- Backend module: `today-trade-review`
- Frontend feature: `today-trade-review`

## Allowed Files After Ready Promotion

- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.repository.ts`
- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- optional new focused legacy-read-path test only if repository synthesis is added: `backend/tests/modules/today-trade-review/today-trade-review.repository.test.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

## Current Forbidden Files

- application source or tests before Team 00 promotion
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `backend/src/modules/market-data-foundation/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/strategy-decision-engine/**`
- `backend/src/modules/trade-plan-risk-engine/**`
- `backend/src/modules/today-trade-review/today-trade-review.controller.ts`
- `backend/src/modules/today-trade-review/today-trade-review.router.ts`
- `backend/src/modules/today-trade-review/today-trade-review.validation.ts`
- `backend/tests/modules/today-trade-review/today-trade-review.controller.test.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/src/features/today-trade-review/api/todayTradeReviewApi.ts`
- `frontend/src/features/today-trade-review/hooks/useTodayReview.ts`
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- provider, live-market, paid/cloud, telemetry, broker, or automation flows

## Required Behavior

Future implementation must:

- add stable additive `publicationEvidence` metadata to the run `sourceSnapshot`;
- persist that metadata for new runs without schema or route changes;
- synthesize equivalent publication evidence on read for legacy runs that lack the field;
- make the Today Review page prefer the normalized publication evidence object while preserving additive compatibility with existing snapshot fields;
- keep `NO_REVIEW`, `LIMITED_REVIEW`, `FULL_REVIEW`, and configured-partial behavior explicitly distinguishable;
- keep outside-trusted-universe Strategy Decision entries excluded from all candidate sections;
- preserve candidate detail as read-only research support only.

## QA Handoff Needed

Team 04 should prepare:

- focused backend service coverage for publication-evidence mapping on full, limited, no-review, and configured-partial runs;
- focused backend repository coverage if legacy read-path synthesis is included;
- UI smoke coverage for missing-readiness warning, mismatch warning, configured partial scan, no-review suppression, and continued candidate-detail research-support wording.

Suggested focused commands after implementation exists:

```powershell
cd backend
npm.cmd test -- today-trade-review.service.test.ts today-trade-review.repository.test.ts --runInBand
```

```powershell
cd frontend
npm.cmd run test:ui -- today-trade-review.spec.ts --workers=1
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- Prisma or migration changes;
- route/controller/validation changes;
- Market Data Foundation, Data Quality Engine, Strategy Decision Engine, or Trade Plan source changes;
- shared UI or shared backend utility changes;
- candidate-detail run-evidence expansion;
- package, generated-file, provider, startup/backfill, live-provider, paid/cloud, telemetry, or broker scope.

## Notes For Team 00

- This packet is bounded enough for a future Ready review.
- It is not ready now because Team 04 QA planning and Team 00 sequencing/promotion are still missing.
- The first slice should stay on run/list publication evidence. Do not widen it into a candidate-detail contract change in the same writer pass.

## Next Gate

Team 04 QA planning, then Team 00 Ready evaluation. Team 03 does not promote it to Ready.
