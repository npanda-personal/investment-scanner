# CF-W1-SIG-01B QA Evidence

Date: 2026-05-17

Wave ID: `AUTO-WAVE-2026-05-17-SIG-READPATH`

## Scope Reviewed

- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.repository.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.repository.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-dq-enforcement.invariants.test.ts`

## Command Run

```text
cd backend
npm.cmd test -- signal-generation-engine.service.test.ts signal-generation-engine.repository.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand
```

## Result

Pass.

```text
Test Suites: 3 passed, 3 total
Tests:       38 passed, 38 total
```

## QA Checks

| Check | Result |
| --- | --- |
| Repository latest signal lists exclude legacy rows without DQ evidence | Pass |
| Repository latest signal lists exclude not-ready or limited persisted DQ evidence | Pass |
| Repository direction counts are based on trusted rows | Pass |
| Service `topSignals()` defensively filters mocked untrusted rows | Pass |
| Service `screener()` defensively filters mocked untrusted rows | Pass |
| Existing strict DQ run-path invariant remains passing | Pass |
| No Angel One/live provider/broker/paid/startup/UI used | Pass |
| No Prisma/schema/route/shared/package/generated changes | Pass |

## Limitations

This validates trusted list read paths only. It does not validate `latestForInstrument()` auto-generation gating, historical diagnostics, alert/portfolio/copilot workflows, strategy-decision, backtesting, trade-plan, signal-quality, or calibration enforcement.

## QA Decision

Accept `CF-W1-SIG-01B`.

