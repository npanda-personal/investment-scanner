# CF-W1-L3-TREV-02 Work Packet

Date: 2026-05-18

## Work Item

Today Review candidate snapshot provenance normalization and detail-page provenance surfacing.

## State

Architecture packet prepared.

Readiness result: `Ready candidate`.

This means Team 04 QA planning can start and Team 00 can evaluate one bounded writer pass. It is not direct authorization to edit application source now.

## Owner / Lane / Modules

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 07 Portfolio / Watchlists / Alerts
- Lane: Lane 3
- Backend module: `today-trade-review`
- Frontend feature: `today-trade-review`

## Allowed Files After Ready Promotion

- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.repository.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- exact new focused compatibility-read test: `backend/tests/modules/today-trade-review/today-trade-review.repository.test.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

## Current Forbidden Files

- application source or tests before Team 00 promotion
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `backend/src/modules/today-trade-review/index.ts`
- `backend/src/modules/today-trade-review/today-trade-review.controller.ts`
- `backend/src/modules/today-trade-review/today-trade-review.router.ts`
- `backend/src/modules/today-trade-review/today-trade-review.validation.ts`
- `backend/tests/modules/today-trade-review/today-trade-review.controller.test.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/api/todayTradeReviewApi.ts`
- `frontend/src/features/today-trade-review/hooks/useTodayReview.ts`
- `frontend/src/features/today-trade-review/routes.tsx`
- `frontend/src/features/today-trade-review/index.ts`
- `backend/src/modules/market-data-foundation/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/market-context-intelligence/**`
- `backend/src/modules/strategy-decision-engine/**`
- `backend/src/modules/trade-plan-risk-engine/**`
- `backend/src/modules/signal-generation-engine/**`
- `backend/src/modules/signal-calibration-engine/**`
- `backend/src/modules/smart-money-intelligence/**`
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- provider/live-data work
- startup/backfill work
- paid/cloud scope
- broker or automation scope
- telemetry scope
- broad Today Review UI work

## Required Behavior

Future implementation must:

- normalize stored candidate provenance on read without recomputing upstream modules;
- expose additive provenance rows for data quality, market context, strategy proof, trade plan, and source-signal support;
- disclose whether timing came from underlying evidence, snapshot generation, or candidate publication fallback;
- label partial, legacy-shaped, and unavailable snapshot structures explicitly;
- keep blockers, watch reasons, and promotion reasons consistent with the same provenance chain;
- replace detail-page support booleans with provenance rows on `TodayReviewCandidateDetailPage`;
- preserve read-only research-support language.

## Dependency Notes

- `CF-W1-L3-TREV-01` is the run-level parent trust packet. Its docs must inform sequencing, but Team 07 must not assume any branch-only `TREV-01` implementation is already on `dev`.
- `CF-W1-L3-TREV-02` can be implemented against current `dev` source if Team 00 promotes it first, but it must not run in parallel with any `TREV-01` writer because the shared Today Review writer set overlaps.
- `CF-W1-TP-02` remains separate. No target-language cleanup belongs in this packet.

## QA Handoff Needed

Team 04 should prepare:

- backend service coverage for fresh candidate provenance timestamps and reason linkage;
- backend repository coverage for compatibility normalization on persisted rows lacking normalized provenance;
- UI smoke coverage for full provenance, partial provenance, unavailable snapshot, lite compatibility-only provenance, and publication-time fallback labels on candidate detail;
- regression coverage that preserves research-support-only wording and blocks advice/broker phrasing.

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

Stop and return to Team 00 / Architect if implementation asks for:

- Prisma or migration changes;
- route/controller/validation changes;
- frontend API or hook rewiring that implies route-contract change;
- Market Data, Data Quality, Market Context, Strategy Decision, Trade Plan, Signal Generation, Calibration, or Smart Money source edits;
- shared utility or shared UI edits;
- provider/live-data, startup/backfill, package, generated-file, paid/cloud, broker, telemetry, or broad UI scope.

## Notes For Team 00

- This packet is a bounded `Ready candidate`.
- The child is detail-only and should remain one Today Review writer pass.
- Team 00 should route it to Team 04 QA planning now.
- Team 00 must keep `CF-W1-L3-TREV-01` and `CF-W1-L3-TREV-02` out of parallel implementation because the writer sets overlap heavily.

## Next Gate

Team 04 QA planning, then Team 00 Ready evaluation.
