# CF-W2-CAL-02A Code Review

Date: 2026-05-25

Owner: Team 10 - Review / Release

## Work Item

`CF-W2-CAL-02A` - Signal Calibration scoped evidence-basis projection.

## Verdict

`ACCEPT`

## Findings

No blocking findings.

Team 06 closed the two prior reject items in source and test coverage:

1. `/signals/calibration/top` failure now fail-closes scoped `pageSummary` in the frontend hook, so stale readiness, evidence basis, warning, and blocker content do not survive a failed scoped reload.
2. Compare and top now source Signal Quality summary evidence through the same visible scope query shape for the same scope and horizon, removing hidden compare-time `sector` / `country` drift.

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W2-CAL-02A-code-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-10-CF-W2-CAL-02A-code-review-outbox.md`
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

## Review Checks

- `/top` failure clears stale scoped summary state and fail-closes to current scope/horizon: pass
- Compare/list evidence-basis parity uses the same visible summary query shape for the same scope/horizon: pass
- Tests cover both reject fixes:
  - backend parity and scoped evidence-basis coverage: pass
  - frontend failure-after-success fail-closed coverage: pass
- No forbidden scope edits detected outside the reserved Signal Calibration files plus reporting docs: pass
- Product language and local/free constraints: pass

## Commands Run

### Memory / laptop-safety check

```powershell
Get-Counter '\Memory\% Committed Bytes In Use' | Select-Object -ExpandProperty CounterSamples | Select-Object -ExpandProperty CookedValue
```

Result: `60.8452147480206`

### Source verification scan

```powershell
rg -n "failClosedPageSummary|setData\(|pageSummary|signalQualitySummaryQuery|qualityService\.summary|sector|country|MISSING_SIGNAL_QUALITY_EVIDENCE|UNAVAILABLE" frontend/src/features/signal-calibration-engine/hooks/useSignalCalibrationEngine.ts backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts frontend/tests/ui/signal-calibration-engine.spec.ts
```

Result: expected remediation and coverage matches found in the reserved Signal Calibration files.

### Focused backend test rerun

```powershell
cd backend
npm.cmd test -- signal-calibration-engine.service.test.ts --runInBand
```

Result: pass (`27` tests passed).

## Skipped Checks

- Backend build not rerun in review; relied on Team 04 QA evidence that `npm.cmd run build` passed.
- Frontend build not rerun in review; relied on Team 04 QA evidence that `npm.cmd run build` passed.
- Playwright smoke not rerun in review; relied on Team 04 QA evidence for the isolated `127.0.0.1:5174` passing run.

## Residual Notes

- Shared default Playwright base URL `127.0.0.1:5173` remains a noisy local environment. Trusted UI evidence for this packet is the isolated Team 04 run on `127.0.0.1:5174`.
- Frontend build large-chunk warning remains pre-existing and unrelated to this packet.

## Review Conclusion

The prior Team 10 reject reasons are closed by the current remediation and coverage:

- failed `/top` requests now fail-close scoped summary state
- compare/list evidence-basis sourcing no longer drifts through hidden sector/country filters
- focused backend and frontend coverage prove both fixes
- no forbidden scope edits were introduced

## Next Gate

Team 03 Architect Signoff.
