# TEAM-06 Outbox - CF-W2-CAL-02A

Date: 2026-05-25  
Team: Team 06 - Strategy / Signal / Risk (Lane 2)  
Work item: `CF-W2-CAL-02A` - Signal Calibration scoped evidence-basis projection  
State: Implementation complete, validation complete with one blocked UI command  
Branch: `codex/team06-strategy-signal/CF-W2-CAL-02A`  
Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W2-CAL-02A`  
Base commit: `4519b14`

## Exact Files Changed

- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`
- `frontend/src/features/signal-calibration-engine/types.ts`
- `frontend/src/features/signal-calibration-engine/hooks/useSignalCalibrationEngine.ts`
- `frontend/src/features/signal-calibration-engine/components/SignalCalibrationEnginePage.tsx`
- `frontend/tests/ui/signal-calibration-engine.spec.ts`

## Exact Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-06-current-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W2-CAL-02A-ready-promotion.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-CAL-02-signal-calibration-evidence-freshness-and-scope-basis-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-CAL-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-CAL-02-signal-calibration-evidence-basis-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W2-CAL-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-CAL-02-qa-plan.md`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`
- `frontend/src/features/signal-calibration-engine/types.ts`
- `frontend/src/features/signal-calibration-engine/api/signalCalibrationEngineService.ts`
- `frontend/src/features/signal-calibration-engine/hooks/useSignalCalibrationEngine.ts`
- `frontend/src/features/signal-calibration-engine/components/SignalCalibrationEnginePage.tsx`
- `frontend/tests/ui/signal-calibration-engine.spec.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts` (read-only contract verification)

## Behavior Changed

- Added additive row evidence-basis projection under `calibrationEvidence.evidenceBasis` with:
  - `status`: `MEASURED | HORIZON_LIMITED | MISSING_SIGNAL_QUALITY_EVIDENCE`
  - `signalQualityGeneratedAt`
  - `latestMeasurablePriceDate`
  - `nextEvaluableDate`
  - `reasonSummary`
- Preserved row `generatedAt` as calibration generation time; evidence-through timing remains separate in evidence-basis.
- Added additive scoped `pageSummary` to `top(...)` responses with selected `region`, `assetType`, `horizon`, scoped counts, scoped evidence, and scoped readiness.
- Removed frontend dependency on `/signals/calibration/health` for scoped summary rendering.
- Removed first-row proxy usage (`items[0]`) for page readiness/influence/warning/blocker behavior.
- Kept compare/list evidence-basis parity by deriving row evidence-basis in both surfaces from the same Signal Quality summary inputs.
- Kept existing score math, evidence thresholds, and DQ semantics unchanged.

## Docs Changed

- Updated module doc to describe scoped `pageSummary` and `calibrationEvidence.evidenceBasis` semantics, including generated-at vs evidence-through distinction.

## Contract Changes

- Additive backend and frontend contract changes only:
  - `CalibrationEvidenceBasis` type
  - `calibrationEvidence.evidenceBasis`
  - optional `PaginatedCalibrationResponse.pageSummary`
  - `CalibrationPageSummary` type
- No route/validation/controller/repository/schema contract widening.

## Validation Run

- `cd backend && npm.cmd test -- signal-calibration-engine.service.test.ts --runInBand` ✅ (26 passed)
- `cd backend && npm.cmd run build` ✅
- `cd frontend && npm.cmd run build` ✅
- `cd frontend && npm.cmd run test:ui -- signal-calibration-engine.spec.ts --workers=1` ❌ blocked (`spawn EPERM`)
- Phrase scan command from Ready promotion ✅ executed; one pre-existing safe-language string matched:
  - `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts` contains `direct financial advice language`.

## Skipped / Blocked Checks

- Focused Playwright UI smoke blocked in sandbox:
  - command: `npm.cmd run test:ui -- signal-calibration-engine.spec.ts --workers=1`
  - error: `spawn EPERM`
  - escalation attempt with `require_escalated` was auto-rejected by approvals reviewer.

## Forbidden-Scope Confirmation

- Confirmed untouched: calibration repository/controller/router/validation/module/index files, route registries, Signal Quality source/tests, Data Quality source/tests, Market Data source/tests, Prisma schema/migrations/generated, package manifests/lockfiles, shared backend/shared frontend files, calibration routes/index/app routes, provider/live/scheduler/worker/queue/startup/backfill.

## Assumptions / Risks / Blockers

- Assumption: additive optional `pageSummary` preserves repository-layer compatibility while enabling scoped page summary.
- Risk: Playwright smoke remains unexecuted due sandbox worker spawn restriction; Team 04 should rerun in an environment that allows Playwright worker process spawn.
- No functional blocker inside reserved code scope.

## Shared-File Requests

- None.

## Next Gate

Team 04 QA Verification.

---

## Remediation Update (Post Team 10 Reject) - 2026-05-25

State: Remediation complete, ready for Team 04 QA re-verification

### Rework Applied

1. Frontend fail-closed summary reset
   - File: `frontend/src/features/signal-calibration-engine/hooks/useSignalCalibrationEngine.ts`
   - `/signals/calibration/top` failure path now clears stale scoped `pageSummary` and replaces it with a fail-closed summary for the currently requested `region`, `assetType`, and `horizon`.
   - This prevents stale readiness/evidence/warning/blocker cards from carrying forward after scoped fetch failures.

2. Compare/list evidence-basis parity
   - File: `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
   - `compare(...)` no longer injects hidden signal `sector`/`country` into Signal Quality summary lookup.
   - Added shared summary-query helper and wired compare/top through it so scope basis is consistent and visible.

3. Coverage additions
   - Backend:
     - `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`
     - Added compare/top parity assertion for same scope/horizon query shape.
   - Frontend UI:
     - `frontend/tests/ui/signal-calibration-engine.spec.ts`
     - Added scenario: successful load followed by `/top` failure fail-closes page summary.

4. Behavior docs
   - `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
   - Added explicit note that compare/list evidence-basis sourcing uses the same visible scope basis.

### Validation Rerun

- Memory check:
  - `Get-Counter '\Memory\% Committed Bytes In Use'` -> `58.9510249576883`
- Phrase scan:
  - pass; one safe guardrail match only
- Backend focused test:
  - `cd backend && npm.cmd test -- signal-calibration-engine.service.test.ts --runInBand` -> pass (`27` tests)
- Backend build:
  - `cd backend && npm.cmd run build` -> pass
- Frontend build:
  - `cd frontend && npm.cmd run build` -> pass
- Playwright focused UI smoke:
  - default shared-base run hit artifact permission/stale-server issues
  - isolated rerun on temporary `127.0.0.1:5174` base URL:
    - `npm.cmd run test:ui -- signal-calibration-engine.spec.ts --workers=1` -> pass (`2` tests)

### Residual Notes

- Shared default Playwright base environment remained noisy; verification evidence is from isolated local frontend run on `5174`.

### Next Gate

Team 04 QA re-verification.
