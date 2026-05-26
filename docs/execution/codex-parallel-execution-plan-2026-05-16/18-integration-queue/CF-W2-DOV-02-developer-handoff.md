# CF-W2-DOV-02 Developer Handoff

Date: 2026-05-26
Work item: `CF-W2-DOV-02`
Owner: Team 08 - UX / Research frontend implementation worker
State: `READY_FOR_TEAM_04_QA_VERIFICATION`
Branch: `codex/team08-ux-research/CF-W2-DOV-02`
Worktree: `C:\work\repo\investment-scanner-worktrees\team08-CF-W2-DOV-02`

## Summary

Implemented the bounded Daily Overview calibration evidence-through summary slice on the required base `50bccc8`.

The old calibration placeholder has been replaced with a feature-local summary panel that is driven only by calibration-owned scoped page summary/evidence-basis truth, includes explicit scope and horizon labels, supports truthful measured/waiting/unavailable states, and links to `/signals/calibration`.

No forbidden file or backend/shared scope was edited.

## Exact files changed

- `frontend/src/features/daily-overview-dashboard/types.ts`
- `frontend/src/features/daily-overview-dashboard/api/dailyOverviewDashboardApi.ts`
- `frontend/src/features/daily-overview-dashboard/hooks/useDailyOverviewDashboard.ts`
- `frontend/src/features/daily-overview-dashboard/components/DailyOverviewDashboardPage.tsx`
- `frontend/src/features/daily-overview-dashboard/components/CalibrationEvidenceSummaryPanel.tsx`
- `frontend/tests/ui/daily-overview-dashboard.spec.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-CF-W2-DOV-02-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-DOV-02-developer-handoff.md`

## Exact files inspected

- Main-workspace authority docs listed in Ready promotion:
  - `AGENTS.md`
  - `10-requirements/CF-W2-DOV-02-daily-overview-calibration-evidence-through-summary-requirement.md`
  - `03-architecture/CF-W2-DOV-02-architecture-review.md`
  - `06-contracts/CF-W2-DOV-02-daily-overview-calibration-evidence-summary-contract.md`
  - `08-work-packets/CF-W2-DOV-02-work-packet.md`
  - `04-qa/CF-W2-DOV-02-qa-plan.md`
  - `09-summaries/CF-W2-DOV-02-dependency-integration-base-evidence.md`
  - `13-implementation-evidence/CF-W2-DOV-02-ready-promotion.md`
- Worktree implementation files under allowed writer set.
- Read-only calibration source references:
  - `frontend/src/features/signal-calibration-engine/types.ts`
  - `frontend/src/features/signal-calibration-engine/api/signalCalibrationEngineService.ts`
  - `frontend/src/features/signal-calibration-engine/hooks/useSignalCalibrationEngine.ts`

## Behavior changed

- Added `CalibrationEvidenceSummaryPanel` to Daily Overview below primary candidate-review content.
- Added Daily Overview consumer reads for calibration default horizon and scoped calibration page summary (`/signals/calibration/top`) without using calibration health endpoint.
- Added fail-closed calibration summary fallback state when scoped page summary is missing or fetch fails.
- Added local calibration horizon state and section-local horizon change handling in Daily Overview hook.
- Added explicit status mapping (`Usable`/`Limited`/`Unavailable`/`Waiting`) from calibration-owned readiness + evidence basis semantics.
- Added waiting-for-maturity message when horizon is limited and `nextEvaluableDate` exists.
- Added explicit latest measurable evidence date display and preserved unavailable wording when missing.
- Updated Daily Overview UI smoke tests to verify:
  - scoped and horizon-aware calibration summary behavior;
  - no calibration health fallback usage;
  - no first-row proxy truth for evidence-through;
  - panel placement below primary candidate sections;
  - research-support language guard compliance.

## Contracts changed

- No API contract changes outside Daily Overview consumer projection.
- No backend route/schema/generated/package changes.

## Tests run

- `cd frontend && npm.cmd run build` -> pass.
- Dedicated worktree server started on `127.0.0.1:5186`.
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5186 npm.cmd run test:ui -- daily-overview-dashboard.spec.ts --workers=1` -> pass (`4` passed).
- `rg -n -i "buy now|sell now|must buy|must sell|target price|price target|profit target|reward/risk|R:R|trade plan|best trade|broker|execute order|place order|guaranteed|financial advice" frontend/src/features/daily-overview-dashboard frontend/tests/ui/daily-overview-dashboard.spec.ts` -> pass (no matches).

## Tests skipped

- Backend build/tests (forbidden scope).
- Broader frontend UI regression suite (out of packet scope).
- Live-data workflow validation (mocked Playwright data per bounded UI smoke contract).

## Skipped-test reasons

- Packet scope is frontend-only and explicitly bounded to focused Daily Overview validation.

## Assumptions

- Base includes accepted CAL-02A evidence-basis contract and DOV-01 surface as documented by Team 00.
- Calibration model read remains available for resolving default horizon; fallback to `20D` remains valid if model read fails.

## Risks / blockers

- No open blockers.
- Residual risk: calibration source outage will surface panel-local unavailable state (fail closed), which QA should verify.

## Forbidden files confirmation

- Confirmed untouched: all forbidden paths listed in work packet and ready promotion.

## Next gate

- Team 04 QA Verification.

---

## QA rejection rework addendum (2026-05-26)

### Rework reason

Team 04 QA rejected the prior packet only because `frontend/tests/ui/daily-overview-dashboard.spec.ts` did not include an explicit successful `/signals/calibration/top` scenario for `MISSING_SIGNAL_QUALITY_EVIDENCE`.

### Exact rework files changed

- `frontend/tests/ui/daily-overview-dashboard.spec.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-CF-W2-DOV-02-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-DOV-02-developer-handoff.md`

### Rework behavior change

- Added one focused Playwright test:
  - `shows unavailable calibration status for successful missing signal quality evidence basis`
- The new scenario returns a successful calibration payload with:
  - `pageSummary.calibrationEvidence.evidenceBasis.status = MISSING_SIGNAL_QUALITY_EVIDENCE`
  - `latestMeasurablePriceDate = null`
  - explicit missing-evidence reason summary
- Assertions verify:
  - Daily Overview panel status shows `Unavailable`
  - panel shows missing-evidence reason text
  - panel shows `Latest measurable evidence: Unavailable`
  - fetch-failure fallback message is absent
  - `/signals/calibration/health` is not used

### Rework validation

- Memory guard:
  - `(Get-Counter '\Memory\% Committed Bytes In Use').CounterSamples[0].CookedValue` -> `79.0769611669418`
- Dedicated worktree frontend server + focused smoke:
  - server: `http://127.0.0.1:5188`
  - command: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5188 npm.cmd run test:ui -- daily-overview-dashboard.spec.ts --workers=1`
  - result: pass (`5` tests)
- Focused language guard rerun:
  - `rg -n -i "buy now|sell now|must buy|must sell|target price|price target|profit target|reward/risk|R:R|trade plan|best trade|broker|execute order|place order|guaranteed|financial advice" frontend/src/features/daily-overview-dashboard frontend/tests/ui/daily-overview-dashboard.spec.ts`
  - result: pass (no matches)

### Rework constraints confirmation

- No Daily Overview feature source file was edited in this rejection rework.
- No Signal Calibration files were edited.
- No backend/shared/schema/package/generated/route changes.
- No commit and no push.

### Next gate

- Team 04 QA rerun (unchanged).
