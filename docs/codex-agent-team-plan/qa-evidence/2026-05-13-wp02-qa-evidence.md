# WP-2026-05-13-02 QA Evidence - Signal Outcome Maturity And Evaluable Coverage

## QA Decision

- Decision: SIGN OFF
- QA owner: QA Worker 2
- Date: 2026-05-13
- Scope owned for this pass: `docs/codex-agent-team-plan/qa-evidence/2026-05-13-wp02-qa-evidence.md`

## Sources Reviewed

- `docs/codex-agent-team-plan/po-test-report-2026-05-13.md` Brief 2
- `docs/codex-agent-team-plan/work-packets/2026-05-13-top5-work-packets.md` WP-2026-05-13-02
- `docs/codex-agent-team-plan/architecture-contracts/2026-05-13-top5-architecture-contracts.md` Brief 2
- `docs/codex-agent-team-plan/qa-plans/2026-05-13-top5-qa-plan.md` Brief 2
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- Signal Quality source/test touchpoints for `selectedHorizon`, `evidenceUsability`, `evaluationDiagnostics`, `horizonAvailability`, not-yet-mature, insufficient-future-price, and missing-price-history fields.

## Acceptance Coverage

- Selected horizon, total signals, mature/evaluable signals, not-yet-mature signals, missing-price signals, and insufficient-future-price counts are exposed through Signal Quality diagnostics.
- `evidenceUsability` is exposed as `USABLE`, `LIMITED`, or `UNAVAILABLE`.
- Zero-evaluable selected-horizon behavior is explicit and actionable; 20D live data returned `UNAVAILABLE` with a recommended action instead of usable confidence.
- Horizon samples stay separated; live data showed 20D with zero evaluated samples while 5D had evaluated samples.
- Recalculation remains scoped and bounded per backend/UI smoke evidence.
- Module docs were updated for the changed diagnostics and workflow.

## Verification Commands

Backend focused tests:

```text
cd backend
npm.cmd test -- signal-quality-lab --runInBand
```

Result: PASS. 3 test suites passed, 28 tests passed.

Backend build:

```text
cd backend
npm.cmd run build
```

Result: PASS.

Frontend build:

```text
cd frontend
npm.cmd run build
```

Result: PASS. Existing Vite large-chunk warning only.

UI smoke:

```text
cd frontend
npm.cmd run test:ui -- signal-quality-lab.spec.ts --workers=1
```

Result: PASS after rerun with required sandbox escalation for Playwright process spawning. 5 tests passed:

- exposes horizon controls and recalculation workflow
- recalculate sends selected horizon and scoped bounded batch request without real recalculation
- direct entry and hard reload settle into dashboard content instead of a generic spinner
- explains zero-evaluable selected horizon without showing win-rate confidence
- dashboard timeout shows Signal Quality-specific retry state

Initial non-escalated Playwright run failed with `spawn EPERM`; this was an environment permission issue, not a WP-02 product/test failure.

## Live Data Verification

Started built backend on local `PORT=3003`, authenticated as `codex.test@example.com`, and queried:

- `GET /api/v1/signals/quality/dashboard?region=IN&assetType=STOCK&horizon=20D&limit=5000`
- `GET /api/v1/signals/quality/dashboard?region=IN&assetType=STOCK&horizon=5D&limit=5000`

Observed 20D:

- `selectedHorizon`: `20D`
- `evidenceUsability`: `UNAVAILABLE`
- `totalSignals`: `5000`
- `matureSignals` / `evaluatedSignals`: `0`
- `notYetMatureSignals`: `2680`
- `insufficientFuturePriceCount`: `2680`
- `missingPriceHistoryCount`: `2320`
- recommended action: try shorter horizon, sync latest market data, or wait for enough future trading days

Observed 5D:

- `selectedHorizon`: `5D`
- `evidenceUsability`: `LIMITED`
- `totalSignals`: `5000`
- `matureSignals` / `evaluatedSignals`: `97`
- `notYetMatureSignals`: `2583`
- `insufficientFuturePriceCount`: `2583`
- `missingPriceHistoryCount`: `2320`

20D response `horizonAvailability` also kept 20D and 5D separate:

- 20D evaluated `0`, usability `UNAVAILABLE`
- 5D evaluated `97`, usability `LIMITED`

## Environment Notes

- Current worktree contains other active edits, including WP-03A Signal Calibration and WP-04A Research Hub files. The focused WP-02 test/build/UI/live checks above passed in the current tree.
- No production source, tests, active board, architecture docs, or QA plan files were edited by this QA pass.

## Blockers

- None for WP-02 QA signoff.
