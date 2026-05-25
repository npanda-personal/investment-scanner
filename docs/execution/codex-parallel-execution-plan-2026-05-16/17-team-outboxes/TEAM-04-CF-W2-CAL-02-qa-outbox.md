# TEAM-04 QA Outbox - CF-W2-CAL-02

Date: 2026-05-25

## Work Item

`CF-W2-CAL-02A` - Signal Calibration scoped evidence-basis projection.

## Verdict

`QA-PLAN READY`

Team 04 completed docs-only QA planning for the bounded Signal Calibration evidence-basis packet. No executable QA was run. The packet is ready for Team 00 Ready evaluation only if the implementation stays inside the exact reserved Signal Calibration backend + feature-local frontend writer set and preserves one-writer ownership.

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-CAL-02-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W2-CAL-02-qa-outbox.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-04-current-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-CAL-02-signal-calibration-evidence-freshness-and-scope-basis-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-CAL-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-CAL-02-signal-calibration-evidence-basis-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W2-CAL-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`
- `frontend/src/features/signal-calibration-engine/types.ts`
- `frontend/src/features/signal-calibration-engine/api/signalCalibrationEngineService.ts`
- `frontend/src/features/signal-calibration-engine/hooks/useSignalCalibrationEngine.ts`
- `frontend/src/features/signal-calibration-engine/components/SignalCalibrationEnginePage.tsx`
- `frontend/tests/ui/signal-calibration-engine.spec.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-DQ-02-read-side-currentness-qa-plan.md`

## Scope Summary

The QA plan is aligned to one bounded Signal Calibration child that must deliver:

- a scoped page summary using the selected `region`, `assetType`, and `horizon`
- row-level evidence-basis fields that distinguish calibration generation time from evidence-through timing
- explicit `nextEvaluableDate` for horizon-limited evidence
- fail-closed behavior when Signal Quality evidence is missing
- mixed-row page summaries that do not use first-row readiness, influence, warning, or blocker proxies
- compare/list parity for row evidence-basis fields
- page summary behavior that no longer relies on unscoped `/signals/calibration/health`

Current source evidence supports the Team 03 packet shape:

- `withEvidenceFromSummary(...)` currently decorates rows from scoped Signal Quality summary inputs but does not yet project evidence-basis timing fields
- `PaginatedCalibrationResponse` still lacks a scoped page-summary object
- the hook still fetches unscoped calibration health
- the page still uses `items[0]` and first matching warning/blocker rows for page-level summary behavior
- current UI smoke does not yet prove horizon-scoped summary basis, generated-at versus evidence-through distinction, or compare/list parity

## Recommended Commands

Recommend, but do not run in this planning pass:

```powershell
cd backend
npm.cmd test -- signal-calibration-engine.service.test.ts --runInBand
```

```powershell
cd backend
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run test:ui -- signal-calibration-engine.spec.ts --workers=1
```

## Exact Reject Conditions

Reject the future implementation handoff if any of the following is true:

- scope widens outside:
  - `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
  - `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
  - `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
  - `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`
  - `frontend/src/features/signal-calibration-engine/types.ts`
  - `frontend/src/features/signal-calibration-engine/api/signalCalibrationEngineService.ts`
  - `frontend/src/features/signal-calibration-engine/hooks/useSignalCalibrationEngine.ts`
  - `frontend/src/features/signal-calibration-engine/components/SignalCalibrationEnginePage.tsx`
  - `frontend/tests/ui/signal-calibration-engine.spec.ts`
  - optional only if payload assertions are added: `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.routes.test.ts`
- any calibration repository/controller/router/validation/module/index, route registry, Signal Quality source/test, Prisma/schema/generated/package/shared utility/shared UI/provider/startup/backfill scope is touched
- scoped page summary still depends on unscoped `/signals/calibration/health`
- page summary or page banners still use first-row readiness, influence, warning, or blocker proxies
- row `generatedAt` is no longer distinct from evidence-through timing
- horizon-limited evidence does not expose `nextEvaluableDate`
- missing Signal Quality evidence is allowed to imply current or usable proof
- compare and list rows do not expose the same evidence-basis fields for the same scoped/horizon evidence
- score math, evidence thresholds, or accepted DQ readiness semantics drift

## Blockers

- No Team 04 planning blocker remains.
- Executable QA remains blocked until Team 00 promotes one exact implementation handoff for the reserved Signal Calibration files only.
- If implementation proves truthful scoped summary needs repository edits, controller/router/validation widening, route-registry/shared UI changes, Signal Quality source/test edits, or schema/storage/package/generated scope, the packet must stop and return to Team 00 / Architect instead of widening silently.

## Tests Run

- none

## Tests Skipped

- `npm.cmd test -- signal-calibration-engine.service.test.ts --runInBand`
- `npm.cmd run build` in `backend`
- `npm.cmd run build` in `frontend`
- `npm.cmd run test:ui -- signal-calibration-engine.spec.ts --workers=1`

## Skipped-Test Reason

- docs-only QA planning pass; no implementation handoff exists and the assignment explicitly forbids running tests/builds/services/providers/Prisma/UI smoke/live data

## Next Gate For Team 00

- Evaluate `CF-W2-CAL-02A` for Ready promotion as one bounded `signal-calibration-engine` child only
- Copy the exact reserved backend + feature-local frontend writer set into the Ready record
- Reserve one Lane 2 writer for the full calibration service/types/doc/test + feature-local UI pass
- Keep the packet out of Ready if implementation needs repository/controller/router/validation edits, route widening, Signal Quality source/test changes, schema/storage, shared/package/generated scope, or provider/startup/backfill drift
