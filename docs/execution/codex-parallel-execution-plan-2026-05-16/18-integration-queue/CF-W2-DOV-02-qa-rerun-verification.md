# CF-W2-DOV-02 QA Rerun Verification

Date: 2026-05-26
Work item: `CF-W2-DOV-02`
Owner: Team 04 - QA Factory
State: `ACCEPT`
Branch verified: `codex/team08-ux-research/CF-W2-DOV-02`
Worktree verified: `C:\work\repo\investment-scanner-worktrees\team08-CF-W2-DOV-02`

## Verdict

`ACCEPT`

The prior rejection item is closed. The focused Playwright rerun now includes a distinct successful `/signals/calibration/top` scenario for `pageSummary.calibrationEvidence.evidenceBasis.status = MISSING_SIGNAL_QUALITY_EVIDENCE`, and the rerun proves the Daily Overview panel renders the contract-required unavailable state without falling back to fetch-failure copy, calibration health, or row proxies.

## Exact files inspected by Team 04

Authority and prior QA evidence:

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-DOV-02-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-DOV-02-daily-overview-calibration-evidence-summary-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-DOV-02-developer-handoff.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-CF-W2-DOV-02-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-DOV-02-qa-verification.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W2-DOV-02-qa-verification-outbox.md`

Worktree source and spec:

- `frontend/src/features/daily-overview-dashboard/api/dailyOverviewDashboardApi.ts`
- `frontend/src/features/daily-overview-dashboard/components/CalibrationEvidenceSummaryPanel.tsx`
- `frontend/src/features/daily-overview-dashboard/components/DailyOverviewDashboardPage.tsx`
- `frontend/src/features/daily-overview-dashboard/hooks/useDailyOverviewDashboard.ts`
- `frontend/src/features/daily-overview-dashboard/types.ts`
- `frontend/tests/ui/daily-overview-dashboard.spec.ts`

## Scope verification

Pass:

- The missing-evidence rerun scenario exists in `frontend/tests/ui/daily-overview-dashboard.spec.ts`.
- Current worktree status still stays inside the original allowed Daily Overview writer set plus handoff docs and Team 04 QA docs.
- No forbidden file paths were touched in current worktree status under:
  - `frontend/src/app/**`
  - `frontend/src/shared/**`
  - `frontend/src/contexts/**`
  - `frontend/src/features/signal-calibration-engine/**`
  - `frontend/tests/ui/signal-calibration-engine.spec.ts`
  - `backend/**`
  - Prisma/schema/generated/package files

## Rework verification

Pass:

1. Required successful missing-evidence scenario exists.
   - Scenario name: `shows unavailable calibration status for successful missing signal quality evidence basis`
   - The mocked `/api/v1/signals/calibration/top` response sets:
     - `readinessStatus: 'USABLE'`
     - `evidenceBasisStatus: 'MISSING_SIGNAL_QUALITY_EVIDENCE'`
     - `signalQualityGeneratedAt: null`
     - `latestMeasurablePriceDate: null`
     - `nextEvaluableDate: null`
     - calibration-owned missing-evidence `reasonSummary`

2. Required unavailable-state assertions exist and passed.
   - `Unavailable` is asserted.
   - `Latest measurable evidence: Unavailable` is asserted.
   - The missing-evidence reason text is asserted.
   - Fetch-failure fallback copy beginning `Calibration evidence summary is unavailable for this scope and horizon:` is asserted absent.
   - `/api/v1/signals/calibration/health` is route-mocked only to prove it remains unused, and the scenario asserts `calibrationHealthCalls === 0`.

3. No implementation-source drift was observed in the rejection rework pass.
   - Current Daily Overview source still matches the previously verified packet behavior:
     - page-summary consumer path remains `/api/v1/signals/calibration/top` only;
     - panel mapping still treats `MISSING_SIGNAL_QUALITY_EVIDENCE` as `Unavailable`;
     - panel placement remains below the primary candidate-review sections.
   - Team 08's rework addenda limit the rejection follow-up to the spec and handoff docs.
   - Because the packet remains uncommitted, this drift check is based on current source inspection and rerun behavior rather than commit-level time-slicing inside the worktree.

## Validation rerun

## Memory gate

- `(Get-Counter '\Memory\% Committed Bytes In Use').CounterSamples[0].CookedValue`
- Result: `80.4419110250757`
- Gate outcome: pass (< 90%)

## Builds run

- `cd frontend && npm.cmd run build`
- Result: pass
- Note: existing Vite chunk-size warning persists; not a packet blocker

## Tests run

- `git diff --check -- frontend/src/features/daily-overview-dashboard/api/dailyOverviewDashboardApi.ts frontend/src/features/daily-overview-dashboard/components/DailyOverviewDashboardPage.tsx frontend/src/features/daily-overview-dashboard/components/CalibrationEvidenceSummaryPanel.tsx frontend/src/features/daily-overview-dashboard/hooks/useDailyOverviewDashboard.ts frontend/src/features/daily-overview-dashboard/types.ts frontend/tests/ui/daily-overview-dashboard.spec.ts`
  - Result: pass
  - Note: line-ending warnings only; no diff-check errors
- Focused language guard:
  - `rg -n -i "buy now|sell now|must buy|must sell|target price|price target|profit target|reward/risk|R:R|trade plan|best trade|broker|execute order|place order|guaranteed|financial advice" frontend/src/features/daily-overview-dashboard frontend/tests/ui/daily-overview-dashboard.spec.ts`
  - Result: pass (`NO_MATCHES`)
- Dedicated worktree frontend server:
  - started on `http://127.0.0.1:5189`
  - server stop verified after rerun
- Focused UI smoke:
  - `cd frontend && PLAYWRIGHT_BASE_URL=http://127.0.0.1:5189 npm.cmd run test:ui -- daily-overview-dashboard.spec.ts --workers=1`
  - Result: pass (`5` tests)

## UI smoke evidence

Passing rerun cases:

- `renders first-slice dashboard with approved reads, placeholders, and drilldowns`
- `does not synthesize source freshness or breadth from dashboard fetch time and data status`
- `shows unavailable calibration status for successful missing signal quality evidence basis`
- `shows explicit unavailable states and section-local research failures without synthetic fallback values`
- `keeps first viewport usable when a deferred section fails and honors scope from storage`

## Tests skipped

- Backend build/tests
- Broader frontend UI regression suite
- Live local market-data verification

## Skipped-test reason

- Packet scope remains bounded to Daily Overview frontend verification only.

## Risks

- Residual non-blocker: the packet is still an uncommitted worktree, so QA evidence is tied to current worktree state rather than a commit SHA.
- Existing Vite chunk-size warning remains outside this packet.

## Blockers

- None for QA.

## Shared-file requests

- None.

## Next gate recommendation

- Advance to Code Review / Lead Validation.
- Keep architect signoff and Product Owner acceptance downstream of that review flow.
- Do not commit.
- Do not push.

## Evidence notes

- Starting the Vite dev server inside the sandbox failed with `spawn EPERM`; QA reran the dedicated worktree server outside the sandbox.
- Running Playwright inside the sandbox failed on `test-results/.last-run.json` unlink with `EPERM`; QA reran the focused smoke outside the sandbox.
- The dedicated QA server was stopped after verification.
