# CF-W2-CAL-02A QA Re-Verification

Date: 2026-05-25

Owner: Team 04 - QA Factory

## Work Item

`CF-W2-CAL-02A` - Signal Calibration scoped evidence-basis projection.

## QA Verdict

`ACCEPT / READY-FOR-TEAM10-CODE-REVIEW`

Team 04 re-verified the Team 10 reject items after Team 06 remediation. The stale-summary fail-closed defect is closed in frontend hook behavior and focused UI coverage. Compare/list evidence-basis parity is now sourced through the same visible summary-query shape for the same scope and horizon, with backend test coverage proving the call parity. Focused backend test, backend build, frontend build, and isolated Playwright smoke all passed.

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W2-CAL-02A-code-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-10-CF-W2-CAL-02A-code-review-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W2-CAL-02A-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-CAL-02A-developer-handoff.md`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`
- `frontend/src/features/signal-calibration-engine/components/SignalCalibrationEnginePage.tsx`
- `frontend/src/features/signal-calibration-engine/hooks/useSignalCalibrationEngine.ts`
- `frontend/src/features/signal-calibration-engine/types.ts`
- `frontend/tests/ui/signal-calibration-engine.spec.ts`
- `frontend/tests/ui/support/auth.ts`
- `frontend/tests/ui/support/moduleAssertions.ts`
- `frontend/playwright.config.ts`
- `frontend/package.json`

## Scope Verification

Pass.

- `git status --short` showed application edits only in the reserved Signal Calibration files plus reporting docs for Teams 04, 06, and 10.
- No forbidden edits were detected in route registries, Prisma/schema, package manifests, shared UI, shared backend utilities, or Signal Quality/Data Quality/Market Data source ownership outside the approved read-only inspection set.

## Reject Fix Verification

### 1. `/signals/calibration/top` failure now fail-closes page summary

Pass.

- `frontend/src/features/signal-calibration-engine/hooks/useSignalCalibrationEngine.ts:15-51` defines a scoped `failClosedPageSummary(...)`.
- `frontend/src/features/signal-calibration-engine/hooks/useSignalCalibrationEngine.ts:103-111` now clears rows/counts and replaces `pageSummary` with a fail-closed summary for the requested `region`, `assetType`, and `horizon`.
- This removes the stale scoped readiness/evidence/warning/blocker carry-forward defect from the Team 10 reject.
- Focused UI coverage proves the behavior:
  - `frontend/tests/ui/signal-calibration-engine.spec.ts:255-355`
  - scenario: successful scoped load, then failed `/top` request after horizon change, then asserted `MISSING_SIGNAL_QUALITY_EVIDENCE`, `UNAVAILABLE`, scoped failure message, and cleared stale row content.

### 2. Compare/list evidence-basis parity now uses the same visible summary-query shape

Pass.

- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts:109-113` now calls `qualityService.summary(this.signalQualitySummaryQuery(...))` in `compare(...)` with visible scope fields only.
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts:218-229` uses the same helper in `top(...)`, with explicit list filters only when they are part of the page query.
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts:961-977` centralizes the Signal Quality summary query shape.
- Hidden instrument `sector` / `country` drift from `compare(...)` is removed.
- Docs now state the intended parity rule:
  - `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md:71-75`

### 3. Tests cover both reject fixes

Pass.

- Backend parity coverage:
  - `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts:242-293`
  - asserts compare and top call `summary(...)` with the same scope/horizon query shape.
- Backend scoped fail-closed evidence coverage:
  - `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts:341-369`
  - asserts missing summary returns `MISSING_SIGNAL_QUALITY_EVIDENCE` and `UNAVAILABLE`.
- Frontend fail-closed UI coverage:
  - `frontend/tests/ui/signal-calibration-engine.spec.ts:255-355`
- Frontend page-summary source coverage:
  - `frontend/tests/ui/signal-calibration-engine.spec.ts:186-253`
  - asserts page behavior is driven by `/top` page summary and that `/health` was not requested.

## Validation Executed

### Memory / laptop-safety check

```powershell
Get-Counter '\Memory\% Committed Bytes In Use' | Select-Object -ExpandProperty CounterSamples | Select-Object -ExpandProperty CookedValue
```

Result: `61.4152882158326`

Interpretation: below the 95% stop threshold.

### Phrase scan

```powershell
rg -n "target price|price target|profit target|reward/risk|R:R|buy now|sell now|must buy|must sell|guaranteed|financial advice|automated trade instruction|trade plan" backend/src/modules/signal-calibration-engine backend/tests/modules/signal-calibration-engine frontend/src/features/signal-calibration-engine frontend/tests/ui/signal-calibration-engine.spec.ts
```

Result: one safe guardrail match only in `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts:292`.

### Focused backend unit test

```powershell
cd backend
npm.cmd test -- signal-calibration-engine.service.test.ts --runInBand
```

Result: pass (`27` tests passed).

### Backend build

```powershell
cd backend
npm.cmd run build
```

Result: pass.

### Frontend build

```powershell
cd frontend
npm.cmd run build
```

Result: pass. Vite emitted a pre-existing large-chunk warning only.

### Focused Playwright smoke

Initial local dev-server start inside the sandbox failed with `spawn EPERM`, so QA reran the isolated check with escalation against a dedicated frontend instance on `127.0.0.1:5174`.

```powershell
Start-Process -FilePath npm.cmd -ArgumentList 'run','dev','--','--host','127.0.0.1','--port','5174' ...
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:5174'
npm.cmd run test:ui -- signal-calibration-engine.spec.ts --workers=1
```

Result: pass (`2` tests passed).

## Skipped Checks

None.

## Risks / Residual Notes

- Shared default Playwright base URL `127.0.0.1:5173` remains potentially noisy for this repository because another local process may serve stale content there.
- Trusted UI evidence for this packet is the isolated `127.0.0.1:5174` run, not the shared default base URL.
- Frontend build still reports a pre-existing large-chunk warning; unrelated to this packet.

## QA Conclusion

QA accepts `CF-W2-CAL-02A` for return to Team 10 Code Review.

The Team 10 reject reasons are closed with direct code evidence and rerun validation:

- failed `/top` requests now fail-close scoped summary state
- compare/list evidence-basis sourcing no longer drifts through hidden sector/country filters
- focused tests cover both fixes
- no forbidden scope edits were introduced

## Next Gate

Team 10 Code Review.
