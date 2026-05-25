# TEAM-10 Code Review Outbox - CF-W2-CAL-02A

Date: 2026-05-25

Team: Team 10 - Review / Release

Work item: `CF-W2-CAL-02A` - Signal Calibration scoped evidence-basis projection

State: Code review complete

Verdict: `ACCEPT`

Branch: `codex/team06-strategy-signal/CF-W2-CAL-02A`

Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W2-CAL-02A`

## Review Summary

- Pass: `/signals/calibration/top` failure now replaces scoped `pageSummary` with a fail-closed state for the requested `region`, `assetType`, and `horizon`, preventing stale readiness/evidence/warning/blocker carry-forward.
- Pass: compare and top now use the same visible Signal Quality summary-query shape for the same scope and horizon; hidden compare-time `sector` / `country` drift is removed.
- Pass: backend and frontend focused tests cover both prior reject fixes.
- Pass: no forbidden scope edits detected beyond the reserved Signal Calibration files and reporting docs.

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-CAL-02A-qa-verification.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W2-CAL-02A-qa-verification-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W2-CAL-02A-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-CAL-02A-developer-handoff.md`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`
- `frontend/src/features/signal-calibration-engine/hooks/useSignalCalibrationEngine.ts`
- `frontend/src/features/signal-calibration-engine/components/SignalCalibrationEnginePage.tsx`
- `frontend/src/features/signal-calibration-engine/types.ts`
- `frontend/tests/ui/signal-calibration-engine.spec.ts`

## Validation Performed

- Memory check:
  - `Get-Counter '\Memory\% Committed Bytes In Use' ...`
  - result: `60.8452147480206`
- Source verification scan:
  - confirmed `failClosedPageSummary(...)`, shared `signalQualitySummaryQuery(...)`, parity assertions, and UI fail-closed assertions in source/tests
- Focused backend test rerun:
  - `cd backend && npm.cmd test -- signal-calibration-engine.service.test.ts --runInBand`
  - result: pass (`27` tests passed)

## Skipped Checks

- Did not rerun backend build; relied on Team 04 QA pass evidence.
- Did not rerun frontend build; relied on Team 04 QA pass evidence.
- Did not rerun Playwright; relied on Team 04 isolated `127.0.0.1:5174` pass evidence.

## Notes

- Shared default Playwright base URL on `127.0.0.1:5173` remains noisy; trusted UI evidence for this packet is the isolated Team 04 run on `127.0.0.1:5174`.
- Frontend build large-chunk warning remains pre-existing and unrelated to this review packet.

## Recommendation

Advance the packet to Team 03 Architect Signoff.

## Next Gate

Team 03 Architect Signoff.
