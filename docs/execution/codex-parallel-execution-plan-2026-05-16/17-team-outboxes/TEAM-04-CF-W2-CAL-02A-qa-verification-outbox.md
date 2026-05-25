# TEAM-04 QA Re-Verification Outbox - CF-W2-CAL-02A

Date: 2026-05-25

Team: Team 04 - QA Factory

Work item: `CF-W2-CAL-02A` - Signal Calibration scoped evidence-basis projection

State: QA re-verification complete

Verdict: `ACCEPT / READY-FOR-TEAM10-CODE-REVIEW`

Branch: `codex/team06-strategy-signal/CF-W2-CAL-02A`

Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W2-CAL-02A`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W2-CAL-02A-code-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-10-CF-W2-CAL-02A-code-review-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W2-CAL-02A-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-CAL-02A-developer-handoff.md`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`
- `frontend/src/features/signal-calibration-engine/hooks/useSignalCalibrationEngine.ts`
- `frontend/tests/ui/signal-calibration-engine.spec.ts`

## Re-Verification Summary

- Pass: failed `/signals/calibration/top` requests now replace `pageSummary` with a scoped fail-closed state, so stale readiness/evidence/warning/blocker content does not survive a failed reload.
- Pass: compare and top now share the same visible Signal Quality summary-query shape for the same scope and horizon. Hidden instrument `sector` / `country` drift was removed from compare.
- Pass: backend and frontend focused tests cover both reject fixes.
- Pass: no forbidden scope edits detected beyond the reserved Signal Calibration file set and reporting docs.

## Validation Executed

- Memory check:
  - `Get-Counter '\Memory\% Committed Bytes In Use'`
  - result: `61.4152882158326`
- Phrase scan:
  - one safe guardrail match only in `signal-calibration-engine.service.ts`
- Focused backend test:
  - `cd backend && npm.cmd test -- signal-calibration-engine.service.test.ts --runInBand`
  - result: pass (`27` tests)
- Backend build:
  - `cd backend && npm.cmd run build`
  - result: pass
- Frontend build:
  - `cd frontend && npm.cmd run build`
  - result: pass
- Focused Playwright smoke:
  - isolated frontend run on `http://127.0.0.1:5174`
  - `npm.cmd run test:ui -- signal-calibration-engine.spec.ts --workers=1`
  - result: pass (`2` tests)

## Risks / Notes

- Default shared Playwright base URL on `127.0.0.1:5173` can still be noisy; trusted UI evidence for this packet is the isolated `5174` run.
- Frontend build large-chunk warning is pre-existing and unrelated to this remediation.

## Recommendation

Advance the packet back to Team 10 Code Review.

## Next Gate

Team 10 Code Review.
