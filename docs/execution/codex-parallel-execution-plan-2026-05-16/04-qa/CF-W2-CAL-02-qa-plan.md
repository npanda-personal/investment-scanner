# CF-W2-CAL-02 QA Plan

Date: 2026-05-25

Owner: Team 04 QA Factory

## Work Item

`CF-W2-CAL-02A` - Signal Calibration scoped evidence-basis projection.

## QA Status

`ACCEPT / READY-FOR-TEAM00-EVALUATION`

Docs-only QA planning is prepared from the requirement, architecture packet, contract, work packet, Team 03 outbox, and the current calibration backend/frontend/test surface. Executable QA remains blocked until Team 00 promotes one exact implementation handoff for the reserved `signal-calibration-engine` service/types/doc/test files plus the feature-local calibration UI files only.

No Team 04 planning blocker remains. Team 00 can now evaluate this packet for Ready promotion as one bounded Signal Calibration child, provided it preserves the exact writer set and one-writer rule from the architecture packet.

## Verdict

The `CF-W2-CAL-02A` QA plan is ready for Team 00 Ready evaluation as one bounded `signal-calibration-engine` evidence-basis child.

Remaining Team 00 readiness work after this QA plan:

- copy the exact backend + frontend writer set from the architecture/work-packet packet into the Ready record
- reserve one dedicated Lane 2 writer for the full calibration backend + feature-local frontend set in a single pass
- keep the packet separate from Team 07 Today Review work, Team 04 DQ QA work, and any route/schema/shared/package/provider widening

## Scope

First-slice QA for additive scoped evidence-basis projection on Signal Calibration list, compare, and page-summary surfaces.

Planned in-scope implementation surfaces, once Team 00 promotes an exact handoff:

- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`
- `frontend/src/features/signal-calibration-engine/types.ts`
- `frontend/src/features/signal-calibration-engine/api/signalCalibrationEngineService.ts`
- `frontend/src/features/signal-calibration-engine/hooks/useSignalCalibrationEngine.ts`
- `frontend/src/features/signal-calibration-engine/components/SignalCalibrationEnginePage.tsx`
- `frontend/tests/ui/signal-calibration-engine.spec.ts`

Optional only if the implementation adds explicit HTTP payload assertions:

- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.routes.test.ts`

Out of scope for this child:

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
- Prisma schema, migrations, generated files, or durable stored evidence-basis fields
- package manifests, shared backend utilities, shared frontend components
- `frontend/src/features/signal-calibration-engine/routes.tsx`
- `frontend/src/features/signal-calibration-engine/index.ts`
- `frontend/src/app/routes.tsx`
- provider/live/scheduler/worker/queue/startup/backfill files

## Contract Inputs Reviewed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-04-current-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-CAL-02-signal-calibration-evidence-freshness-and-scope-basis-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-CAL-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-CAL-02-signal-calibration-evidence-basis-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W2-CAL-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`
- current calibration source/tests for packet-shape and gap confirmation:
  - `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
  - `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
  - `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`
  - `frontend/src/features/signal-calibration-engine/types.ts`
  - `frontend/src/features/signal-calibration-engine/api/signalCalibrationEngineService.ts`
  - `frontend/src/features/signal-calibration-engine/hooks/useSignalCalibrationEngine.ts`
  - `frontend/src/features/signal-calibration-engine/components/SignalCalibrationEnginePage.tsx`
  - `frontend/tests/ui/signal-calibration-engine.spec.ts`

## Current Source Alignment

- `withEvidenceFromSummary(...)` currently derives sample counts, warnings, and readiness from scoped Signal Quality summary data, but it does not project a separate evidence-basis object with:
  - Signal Quality summary generation time
  - latest measurable price date
  - next evaluable date
  - explicit measured versus horizon-limited versus missing basis status
- `PaginatedCalibrationResponse` currently returns only `items`, paging, and sort metadata. It has no scoped page-summary object for the selected `region`, `assetType`, and `horizon`.
- `health()` remains module-level compatibility health. It is unscoped and does not tell a truthful active-market page-summary story.
- `useSignalCalibrationEngine.ts` still loads `/signals/calibration/health` without `region`, `assetType`, or `horizon`.
- `SignalCalibrationEnginePage.tsx` still derives page-level readiness and influence from `items[0]` and still lifts warning/blocker banners from the first matching row rather than a truthful scoped aggregate.
- current Playwright coverage proves the page requests scoped `/top` data for `region` and `assetType`, but it does not yet prove:
  - selected `horizon` drives the scoped summary basis
  - row `generatedAt` stays distinct from evidence-through timing
  - compare/list parity for evidence-basis fields
  - mixed-row page states avoid first-row summary proxies
  - the page no longer depends on unscoped `/signals/calibration/health`

Those findings match the Team 02 requirement and Team 03 architecture verdict: the gap is projection and truthful scoped summary framing, not calibration math, schema, or route ownership.

## Required QA Assertions

- Scoped page summary is additive only. Existing row fields, run response fields, score math, and readiness semantics remain present and unrenamed.
- Scoped summary uses the selected `region`, `assetType`, and `horizon`.
- Row `generatedAt` remains calibration row generation time only.
- Evidence-through timing is carried separately from row `generatedAt`.
- Row evidence basis distinguishes, at minimum:
  - `MEASURED`
  - `HORIZON_LIMITED`
  - `MISSING_SIGNAL_QUALITY_EVIDENCE`
- `signalQualityGeneratedAt`, `latestMeasurablePriceDate`, and `nextEvaluableDate` are additive only and sourced from existing Signal Quality public outputs.
- Horizon-limited evidence exposes `nextEvaluableDate` and does not imply current proof.
- Missing Signal Quality evidence fails closed:
  - row readiness/influence remains conservative
  - row/page wording stays explicit about missing evidence
  - no page summary card reads as current/proven when Signal Quality evidence is absent
- Mixed-row page states do not use first-row readiness, influence, warning, or blocker proxies.
- Page summary no longer relies on unscoped `/signals/calibration/health` for active scoped cards or page-level banners.
- Compare/list parity holds for the row evidence-basis fields. The same scoped/horizon evidence story appears in compare and list outputs.
- Current calibration score math, evidence-status thresholds, and accepted DQ semantics remain unchanged.
- Research-support wording remains intact:
  - no direct advice
  - no target-price language
  - no guaranteed-outcome framing
  - no automation or broker framing

## Scenario Matrix

| Scenario | Expected QA assertion after implementation |
| --- | --- |
| Scoped measurable evidence | `/top` returns a scoped page summary whose `scope.region`, `scope.assetType`, and `scope.horizon` match the request, and row/page evidence basis shows measured evidence with distinct generation-time versus evidence-through fields. |
| Horizon-limited evidence | Row and page evidence basis show `HORIZON_LIMITED`; `nextEvaluableDate` is present; wording does not imply that the selected horizon is already fully measurable. |
| Missing Signal Quality evidence | Row and page evidence basis show missing Signal Quality evidence; readiness remains fail-closed; the page does not upgrade the scope summary from row score deltas or stale health. |
| Mixed-row page state | A page containing mixed `USABLE`, `LIMITED`, and `UNAVAILABLE` rows does not derive readiness, influence, warnings, or blockers from `items[0]` or the first warning row. |
| Compare/list parity | The same scoped/horizon calibration row shows the same evidence-basis fields in list and compare surfaces. |
| Scoped summary versus module health | Active page summary cards and banners are driven by scoped `/top` response data, not by unscoped `/signals/calibration/health`. |
| Generated-at distinction | UI or DTO assertions prove `generatedAt` is still the calibration timestamp while evidence-through date is a separate field. |
| Existing payload compatibility | Existing list/run/model consumers remain backward-compatible because new evidence-basis and page-summary fields are additive only. |
| Forbidden-scope attempt | Any repository/controller/router/validation/module/index, route-registry, Signal Quality source/test, Prisma/schema/generated/package/shared utility/shared UI/provider/startup/backfill widening is a QA reject. |

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Focused backend tests after Team 00 promotion and implementation handoff:

```powershell
cd backend
npm.cmd test -- signal-calibration-engine.service.test.ts --runInBand
```

Recommended backend build after accepted implementation and resource checks:

```powershell
cd backend
npm.cmd run build
```

Recommended frontend build after accepted implementation and resource checks:

```powershell
cd frontend
npm.cmd run build
```

Focused Signal Calibration UI smoke after implementation:

```powershell
cd frontend
npm.cmd run test:ui -- signal-calibration-engine.spec.ts --workers=1
```

## Exact Reject Conditions

Reject the packet immediately and return it to Team 00 / Architect if implementation does any of the following:

- edits any file outside the exact reserved Signal Calibration backend + feature-local frontend writer set
- edits:
  - `backend/src/modules/signal-calibration-engine/signal-calibration-engine.repository.ts`
  - `backend/src/modules/signal-calibration-engine/signal-calibration-engine.controller.ts`
  - `backend/src/modules/signal-calibration-engine/signal-calibration-engine.router.ts`
  - `backend/src/modules/signal-calibration-engine/signal-calibration-engine.validation.ts`
  - `backend/src/modules/signal-calibration-engine/signal-calibration-engine.module.ts`
  - `backend/src/modules/signal-calibration-engine/index.ts`
  - `backend/src/api/routes.ts`
  - any `backend/src/modules/signal-quality-lab/**`
  - any `backend/tests/modules/signal-quality-lab/**`
  - `backend/prisma/schema.prisma`
  - `backend/prisma/migrations/**`
  - generated files
  - package manifests
  - shared backend utilities
  - `frontend/src/features/signal-calibration-engine/routes.tsx`
  - `frontend/src/features/signal-calibration-engine/index.ts`
  - `frontend/src/shared/components/**`
  - `frontend/src/app/routes.tsx`
  - provider/live/scheduler/worker/queue/startup/backfill files
- scoped summary still depends on unscoped `/signals/calibration/health`
- page summary or banners still derive readiness, influence, warnings, or blockers from `items[0]` or the first matching row proxy
- row `generatedAt` is repurposed to mean evidence-through timing
- evidence-through timing is omitted, merged into generation time, or otherwise ambiguous
- horizon-limited evidence does not expose `nextEvaluableDate` when maturity is still pending
- missing Signal Quality evidence is allowed to imply usable/current proof
- compare and list rows tell different evidence-basis stories for the same scoped/horizon evidence
- implementation changes score math, evidence thresholds, or accepted DQ readiness semantics
- implementation introduces schema/storage, route widening, shared utility/UI, package/generated, provider/live/startup/backfill, or broad frontend routing scope

These are rejection conditions for the bounded first child, not soft warnings.

## Stop Conditions

Stop QA and return the packet to Team 00 / Architect if:

- truthful scoped page summary cannot be delivered inside the exact reserved service/types/doc/test + feature-local UI writer set
- implementation requires repository edits, controller/router/validation widening, route-registry changes, shared UI changes, or Signal Quality source/test edits
- implementation requires schema/storage changes or generated-file/package changes
- compare/list/page-summary truthfulness cannot be achieved without broadening the calibration route surface beyond the bounded packet

## Evidence Required Later

- Exact implementation handoff limited to the reserved Signal Calibration backend + feature-local frontend files only
- Scenario evidence for:
  - scoped measurable evidence
  - horizon-limited evidence
  - missing Signal Quality evidence
  - mixed-row page state
  - compare/list parity
  - generated-at versus evidence-through distinction
- Focused backend service test output
- Backend build output
- Frontend build output
- Focused Playwright smoke output
- Explicit note that no forbidden scope, no Signal Quality source/test widening, and no schema/route/shared/package/provider drift occurred
