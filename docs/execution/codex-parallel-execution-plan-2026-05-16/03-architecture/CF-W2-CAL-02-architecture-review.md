# CF-W2-CAL-02 Architecture Review

Date: 2026-05-25

Owner: Team 03 Architecture Factory

## Status

Ready candidate after QA.

This packet is docs-only architecture readiness for `CF-W2-CAL-02`. It does not move the item to Ready for Implementation.

## Verdict

`Ready candidate after QA`

Reason:

- current calibration source already reuses scoped Signal Quality summary data inside `top(...)` and `compare(...)`;
- the trust gap is projection and page-summary truthfulness, not schema/storage;
- the smallest honest child can stay additive inside `signal-calibration-engine` service/types/doc/tests plus feature-local calibration UI/test files;
- no Prisma/schema, route registry, shared UI, package/generated, provider/live, startup/backfill, or broad UI scope is required if the scoped page summary is delivered through the existing `/signals/calibration/top` response instead of widening the module health route.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-03-current-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-CAL-02-signal-calibration-evidence-freshness-and-scope-basis-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/active-work-board.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/99-decision-inbox/open-decisions.md`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.controller.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.router.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.validation.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.routes.test.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `frontend/src/features/signal-calibration-engine/api/signalCalibrationEngineService.ts`
- `frontend/src/features/signal-calibration-engine/hooks/useSignalCalibrationEngine.ts`
- `frontend/src/features/signal-calibration-engine/components/SignalCalibrationEnginePage.tsx`
- `frontend/src/features/signal-calibration-engine/types.ts`
- `frontend/tests/ui/signal-calibration-engine.spec.ts`

## Current Source Findings

- `signal-calibration-engine.service.ts` already calls `SignalQualityLabService.summary(...)` with `region`, `assetType`, and `horizon` inside `top(...)`, `compare(...)`, and `run(...)`.
- `withEvidenceFromSummary(...)` and `runEvidenceFromSummary(...)` currently project sample counts and horizon availability, but they do not project the upstream summary generation time, latest measurable price date, or next evaluable date.
- `health()` is module-level and unscoped. It reports persisted row count plus conservative placeholder evidence for missing persisted readiness, not a truthful active-scope summary.
- `useSignalCalibrationEngine.ts` currently loads `/signals/calibration/health` without `region`, `assetType`, or `horizon`.
- `SignalCalibrationEnginePage.tsx` currently uses `items[0]` as the page-level readiness and influence proxy, and it also uses first matching row warnings/blockers for page banners.
- `compare(...)` is already scope-aware. It can inherit truthful evidence-basis fields through the calibrated row contract without any route or router-registry change.

## Architecture Decision

Do not widen the module health endpoint in the first child.

Instead, treat the existing `/signals/calibration/top` response as the truthful scoped aggregate surface for the calibration page:

- keep `/signals/calibration/health` as module-level compatibility health;
- stop using that module-level health payload as the scoped page summary source;
- add scoped evidence-basis fields to calibration row evidence;
- add one additive page-summary object to `PaginatedCalibrationResponse`, derived from:
  - the existing scoped Signal Quality summary;
  - the selected `region`, `assetType`, and `horizon`;
  - the already-loaded page rows after evidence decoration.

This is the smallest bounded child because it:

- reuses current `top(...)` summary work already done in service;
- avoids controller/router/validation widening;
- avoids repository changes because `top(...)` already returns the page rows and `totalCount`;
- avoids schema/storage because the required evidence basis is already available from Signal Quality public outputs at read time;
- keeps the frontend fix inside the calibration feature only.

## Smallest Bounded Child

Child label:

`CF-W2-CAL-02A scoped evidence-basis projection`

Bounded behavior:

- project row-level evidence basis for list and compare;
- project page-level scoped summary from the existing `/top` response;
- stop using global module health and first-row fallbacks for page-level readiness/influence banners/cards;
- preserve current calibration math, readiness semantics, and persisted model behavior.

## Required Contract Shape

Minimum additive contract:

- extend row evidence with a nested evidence-basis object carrying:
  - Signal Quality summary generation time;
  - latest measurable price date;
  - next evaluable date;
  - basis status/reason that distinguishes measurable evidence, horizon-limited evidence, and missing Signal Quality evidence;
- extend `PaginatedCalibrationResponse` with a scoped page-summary object carrying:
  - selected `region`, `assetType`, and `horizon`;
  - page-level readiness/influence derived from the decorated page rows, not `items[0]`;
  - the scoped evidence basis used for the page summary;
  - page item count and scoped total count so the frontend can label the summary honestly.

Important naming rule:

- existing row `generatedAt` remains calibration row generation time;
- evidence-through time must be a separate field sourced from Signal Quality summary diagnostics.

## Exact Future Allowed Files

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

Optional only if implementation adds explicit HTTP payload assertions beyond current service coverage:

- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.routes.test.ts`

## Exact Future Forbidden Files

Especially forbidden for the first child:

- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.repository.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.controller.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.router.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.validation.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.module.ts`
- `backend/src/modules/signal-calibration-engine/index.ts`
- `backend/src/api/routes.ts`
- all `backend/src/modules/signal-quality-lab/**`
- all `backend/tests/modules/signal-quality-lab/**`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma or generated type files
- package manifests
- shared backend utilities
- `frontend/src/features/signal-calibration-engine/routes.tsx`
- `frontend/src/features/signal-calibration-engine/index.ts`
- `frontend/src/shared/components/**`
- `frontend/src/app/routes.tsx`
- provider, live-data, worker, queue, scheduler, startup, or backfill files in any module
- Today Review, Data Quality, Market Data, Backtesting, Pipeline Ops, and all other module source/tests outside the listed writer set

Result:

- schema/storage: forbidden, not required
- route registry: forbidden, not required
- shared UI: forbidden, not required
- shared backend utility: forbidden, not required
- package/generated: forbidden, not required
- provider/live/startup/backfill: forbidden, not required
- broad UI scope: forbidden, not required

## One-Writer Notes

- Keep the backend calibration writer set with one implementer in one pass.
- Keep the calibration feature writer set with the same implementer in the same pass.
- Do not split backend and frontend halves across different writers because the page-summary contract and UI behavior must land together.
- Team 07 `CF-W2-TSC-05A` and Team 05 `CF-W1-DQ-02-RS1` have no file overlap with this packet.

## Testing Decision

Required focused tests for the first child:

- calibration service tests for row evidence basis and scoped page summary;
- calibration UI smoke test for scoped page summary behavior and no-first-row-proxy behavior.

Route/controller tests are not required unless the implementation widens controller behavior or starts asserting literal HTTP payload shaping there.

## QA Handoff Notes

Team 04 should verify:

- scoped summary uses selected `region`, `assetType`, and `horizon`;
- calibration row generation time and evidence-through date are shown as distinct concepts;
- horizon-limited evidence surfaces `nextEvaluableDate` and does not imply current proof;
- missing Signal Quality summary fails closed and preserves honest missing-evidence wording;
- mixed row page states do not collapse to `items[0]` for readiness, influence, warnings, or blockers;
- the calibration page no longer relies on unscoped module health for scoped summary cards.

Required scenario set:

- current measurable evidence
- horizon-maturity-limited evidence
- missing Signal Quality evidence
- mixed-row page states in one scope
- compare view using the same evidence-basis fields as table rows

## Stop Conditions

Stop and return to Team 00 if implementation proves any of these are required:

1. repository changes to compute truthful scoped counts beyond the current `top(...)` response contract;
2. controller/router/validation widening to make the first child honest;
3. shared UI or route-registry changes;
4. schema/storage or generated-file work.

Current audit does not prove any of those are required, so the bounded child remains viable now.

## Next Gate

Team 04 QA planning for `CF-W2-CAL-02A`, then Team 00 Ready evaluation if QA accepts the bounded packet.
