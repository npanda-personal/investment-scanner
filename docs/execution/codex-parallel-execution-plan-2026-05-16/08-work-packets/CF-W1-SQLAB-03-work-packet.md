# CF-W1-SQLAB-03 Work Packet

Date: 2026-05-20

## Work Item

Signal Quality review-loop actionability for noisy and limited outcomes.

## State

Architecture-readiness prepared. Not Ready for Implementation.

This packet is bounded to a no-schema, no-route, no-shared-file first slice and must not be promoted as Ready by this artifact.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 06 Strategy / Signal / Risk
- Lane: Lane 2
- Backend module: `signal-quality-lab`
- Frontend feature: `signal-quality-lab`

## Exact Allowed File Reservations After Team 00 Promotion

- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`
- `frontend/src/features/signal-quality-lab/types.ts`
- `frontend/src/features/signal-quality-lab/components/SignalQualityLabPage.tsx`
- `frontend/tests/ui/signal-quality-lab.spec.ts`

## Exact Forbidden Files

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.repository.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.controller.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.router.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.validation.ts`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.routes.test.ts`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.validation.test.ts`
- `frontend/src/features/signal-quality-lab/api/signalQualityLabService.ts`
- `backend/src/modules/signal-generation-engine/**`
- `backend/src/modules/signal-calibration-engine/**`
- `backend/src/modules/trade-plan-risk-engine/**`
- `backend/src/modules/today-trade-review/**`
- backend/frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- provider/live-data, startup/backfill, paid/cloud, broker, or telemetry scope

## Required Behavior

Future implementation must:

- add additive review-loop actionability metadata only;
- distinguish shorter-horizon, rerun-later, missing-price-history, insufficient-evidence, and ignore-noisy follow-up states;
- derive action labels and reason summaries only from existing Signal Quality diagnostics and noisy-signal evidence;
- keep current outcome math, diagnostics, and query behavior unchanged;
- render the actionability surface inside the existing Signal Quality Lab page only;
- keep wording research-supportive and avoid advice, target-price, guarantee, broker, or automation language.

## No-Schema / No-Route / No-Shared-File Result

- no-schema: `Yes`
- no-route: `Yes`
- no-shared-file: `Yes`
- backend-only: `No`

Why backend-only is not recommended:

- the requirement is explicitly about a review-loop next-step surface, not only an API decoration;
- the existing Signal Quality page already owns that user workflow and can render the labels without widening into shared UI.

## Sequencing And Dependency Notes

- `CF-W1-SQLAB-03` must be sequenced behind active `CF-W1-SQLAB-02A`.
- The overlap is exact enough that Team 00 must not route `SQLAB-03` as a parallel writer against `SQLAB-02A`.
- No schema, route, frontend API, or shared-file approval is needed for the first slice.
- If Team 00 later wants durable learning-memory or journal persistence, keep that as a separate child and do not widen this packet.

## QA Handoff Notes

Future Team 04 planning should cover:

- try-shorter-horizon actionability
- rerun-after-more-data actionability
- check-price-history actionability
- insufficient-evidence actionability
- ignore-for-review noisy actionability
- visible overview/noise/instrument rendering
- preserved existing diagnostics and existing selected-horizon banners

## Stop Conditions

Stop and return to Team 00 if implementation requires:

- outcome persistence or journal write-path work
- repository/schema/generated changes
- route/controller/validation changes
- signal-generation, calibration, trade-plan, or today-review source changes
- frontend API/route changes
- shared utility or shared UI changes

Also stop if Team 00 attempts to run `CF-W1-SQLAB-03` in parallel with active `CF-W1-SQLAB-02A`.

## Next Gate

Team 04 QA planning, then Team 00 Ready evaluation and explicit sequencing behind `CF-W1-SQLAB-02A`.

