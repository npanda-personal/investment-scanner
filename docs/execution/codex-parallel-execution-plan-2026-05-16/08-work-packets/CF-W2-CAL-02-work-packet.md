# CF-W2-CAL-02 Work Packet

Date: 2026-05-25

## Work Item

`CF-W2-CAL-02A` Signal Calibration scoped evidence-basis projection.

## State

Ready candidate after QA.

No implementation is authorized from this packet until Team 04 accepts the QA handoff and Team 00 records Ready promotion.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 00-assigned Lane 2 writer
- Lane: Lane 2
- Module: `signal-calibration-engine`

## Exact Allowed Files After Ready Promotion

Backend:

- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`

Frontend:

- `frontend/src/features/signal-calibration-engine/types.ts`
- `frontend/src/features/signal-calibration-engine/api/signalCalibrationEngineService.ts`
- `frontend/src/features/signal-calibration-engine/hooks/useSignalCalibrationEngine.ts`
- `frontend/src/features/signal-calibration-engine/components/SignalCalibrationEnginePage.tsx`
- `frontend/tests/ui/signal-calibration-engine.spec.ts`

Optional only if the implementer expands explicit HTTP payload assertions:

- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.routes.test.ts`

## Exact Forbidden Files

- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.repository.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.controller.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.router.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.validation.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.module.ts`
- `backend/src/modules/signal-calibration-engine/index.ts`
- `backend/src/api/routes.ts`
- all `backend/src/modules/signal-quality-lab/**`
- all `backend/tests/modules/signal-quality-lab/**`
- all `backend/src/modules/data-quality-engine/**`
- all `backend/src/modules/market-data-foundation/**`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated files
- package manifests
- shared backend utilities
- `frontend/src/features/signal-calibration-engine/routes.tsx`
- `frontend/src/features/signal-calibration-engine/index.ts`
- `frontend/src/shared/components/**`
- `frontend/src/app/routes.tsx`
- provider / live / worker / queue / scheduler / startup / backfill files
- Today Review, Backtesting, Pipeline Ops, and all other module source/tests outside the allowed set

## Required Implementation Shape

The first child must:

- add row-level evidence-basis metadata sourced from current Signal Quality summary outputs;
- keep row `generatedAt` as calibration row generation time;
- expose evidence-through and next-evaluable timing separately from row generation time;
- add a scoped page-summary object to `PaginatedCalibrationResponse`;
- derive page readiness/influence from the response rows plus scoped evidence basis, not from the first row;
- stop using unscoped module health as the page summary source;
- preserve current calibration scoring math and current readiness semantics.

## Required QA Scenarios

Team 04 should verify:

- scoped summary basis for selected `region`, `assetType`, and `horizon`
- current measurable evidence
- horizon-maturity-limited evidence
- missing Signal Quality evidence
- mixed-row page states inside one scope
- frontend no-first-row-proxy behavior
- compare view parity with row evidence-basis fields

Specific QA checks:

- `generatedAt` and evidence-through date are distinct
- `nextEvaluableDate` appears when the selected horizon is not yet fully measurable
- page warning/blocker cards do not read from the first row
- page readiness/influence does not come from `/signals/calibration/health`

## Test Expectation

Required focused tests later:

- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`
- `frontend/tests/ui/signal-calibration-engine.spec.ts`

Optional only if controller payload assertions are added:

- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.routes.test.ts`

## One-Writer Rule

Reserve the whole calibration backend and feature-local frontend writer set to one implementer in one pass.

Do not split backend and frontend across different writers for this child.

## Stop Conditions

Stop and return to Team 00 immediately if implementation requires:

- repository edits
- controller/router/validation edits
- route-registry or shared UI changes
- Prisma/schema/migration work
- generated-file or package-manifest work
- Signal Quality, Data Quality, Market Data, provider, or startup/backfill source changes

If any of those become necessary, Team 00 must reopen the packet as a split or consent-gated child instead of widening this one silently.

## Next Gate

Team 04 QA planning for `CF-W2-CAL-02A`, then Team 00 Ready evaluation.
