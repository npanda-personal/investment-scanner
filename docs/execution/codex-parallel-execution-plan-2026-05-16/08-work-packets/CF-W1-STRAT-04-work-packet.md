# CF-W1-STRAT-04 Work Packet

Date: 2026-05-20

## Work Item

Strategy evidence freshness and stale-summary labels.

## State

Architecture-readiness prepared. Not Ready for Implementation.

This packet is bounded to a no-schema, no-route, no-shared-file first slice and must not be promoted as Ready by this artifact.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 06 Strategy / Signal / Risk
- Lane: Lane 2
- Backend module: `strategy-framework`
- Frontend feature: `strategy-framework`

## Exact Allowed File Reservations After Team 00 Promotion

- `backend/src/modules/strategy-framework/strategy-framework.service.ts`
- `backend/src/modules/strategy-framework/strategy-framework.types.ts`
- `backend/src/modules/strategy-framework/strategy-framework.md`
- `backend/tests/modules/strategy-framework/strategy-framework.service.test.ts`
- `frontend/src/features/strategy-framework/types.ts`
- `frontend/src/features/strategy-framework/components/StrategyFrameworkPage.tsx`
- `frontend/tests/ui/strategy-framework.spec.ts`

## Exact Forbidden Files

- `backend/src/modules/strategy-framework/strategy-framework.repository.ts`
- `backend/src/modules/strategy-framework/strategy-framework.evaluator.ts`
- `backend/src/modules/strategy-framework/strategy-framework.registry.ts`
- `backend/src/modules/strategy-framework/strategy-framework.controller.ts`
- `backend/src/modules/strategy-framework/strategy-framework.router.ts`
- `backend/src/modules/strategy-framework/strategy-framework.validation.ts`
- `backend/src/modules/strategy-framework/index.ts`
- repository or evaluator tests
- `frontend/src/features/strategy-framework/api/strategyFrameworkApi.ts`
- `frontend/src/features/strategy-framework/routes.tsx`
- all `backtesting-strategy-lab` source/tests
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend/frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- provider/live-data, startup/backfill, paid/cloud, broker, or telemetry scope

## Required Behavior

Future implementation must:

- add additive evidence-freshness metadata only;
- distinguish `CURRENT`, `STALE`, `PARTIAL`, and `STRUCTURALLY_LIMITED`;
- derive reason codes and summary text only from existing compact summary evidence;
- recommend rerun when summary age exceeds the documented first-slice freshness window;
- keep rating/proof math unchanged;
- render compact freshness labels on catalog, proof, and performance surfaces inside the existing Strategy Framework page;
- keep wording research-supportive and avoid advice, target-price, guarantee, broker, or automation language.

## No-Schema / No-Route / No-Shared-File Result

- no-schema: `Yes`
- no-route: `Yes`
- no-shared-file: `Yes`
- backend-only: `No`

Why backend-only is not recommended:

- the requirement's user-value surface is the visible Strategy Framework catalog/performance experience;
- additive backend metadata alone would not deliver that direct-value surface in one pass.

## Dependency Notes

- no active file conflict was found in this pass;
- the first slice must stay fully inside `strategy-framework` owned files;
- if Team 00 later wants persisted rerun history or backtest-run provenance, split a second child instead of widening this one.

## QA Handoff Notes

Future Team 04 planning should cover:

- current summary label
- stale summary label
- partial summary label from low sample
- partial summary label from warnings/caps or missing diagnostic basis
- structurally limited label from no summary or insufficient sample
- visible catalog/proof/performance rendering
- preserved existing next-action links and proof/rating behavior

## Stop Conditions

Stop and return to Team 00 if implementation requires:

- repository or schema changes
- route/controller/validation changes
- evaluator or registry edits
- Backtesting Strategy Lab source changes
- frontend API or route changes
- shared utility or shared UI changes

## Next Gate

Team 04 QA planning, then Team 00 Ready evaluation and sequencing.

