# Cycle 2 Runtime-Risk Fixes Handoff

Date: 2026-05-13  
Prepared by: Senior Fullstack Lead / Orchestrator  
State: `Ready for QA runtime evidence`  
Current mode: `Revision Mode` completed; returns to `QA Verification Mode`  

## Scope

This handoff records small fixes made after QA static evidence identified gaps before runtime verification:

- C2-WP-01: Market Data workbench lane-click scope risk.
- C2-WP-02: Signal Quality model-version filter/group boundary gap for the Signal Generation audit requirement.
- C2-WP-04: Today Review run-level exclusion summaries for `SIGNAL_MATURITY` and `CALIBRATION`.

No paid services, paid providers, broker APIs, live-trading workflows, or advice behavior were added.

## Fixed Items

### C2-WP-01

Changed file:

- `frontend/src/features/market-data-foundation/components/MarketDataStatusPanel.tsx`

Fix:

- Workbench lane buttons now pass the lane's own bounded `nextAction.request` into the repair action.
- The submitted request now uses the lane-scoped `IN / STOCK` region, asset type, batch size, offset, and retry queue where supplied.
- Existing generic repair buttons still use the page/global scope path.

### C2-WP-02

Changed files:

- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.validation.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.validation.test.ts`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`
- `frontend/src/features/signal-quality-lab/types.ts`
- `frontend/src/features/signal-quality-lab/hooks/useSignalQualityLab.ts`
- `frontend/src/features/signal-quality-lab/components/SignalQualityLabPage.tsx`
- `frontend/tests/ui/signal-quality-lab.spec.ts`

Fix:

- Added `modelVersion` to Signal Quality query and recalculation types.
- Preserved `modelVersion` through backend query parsing and recalculation paging.
- Added a Signal Quality UI model-version filter that passes the selected value to dashboard, history, outcomes, and recalculation requests.
- Added focused backend and UI test coverage for model-version propagation.

### C2-WP-04

Changed files:

- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`

Fix:

- Today Review run-level exclusion summaries now aggregate candidate-level `SIGNAL_MATURITY` and `CALIBRATION` blocker/watch reasons.
- Backend test coverage verifies both categories appear in run explainability.

## Validation Evidence

Focused backend validation:

```text
npm.cmd test -- --runInBand tests/modules/signal-quality-lab/signal-quality-lab.validation.test.ts tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts tests/modules/today-trade-review/today-trade-review.service.test.ts tests/modules/market-data-foundation/market-data.service.test.ts
```

Result: passed, 4 suites / 135 tests.

Frontend build:

```text
npm.cmd run build
```

Result: passed; Vite reported the existing large chunk warning only.

Backend build:

```text
npm.cmd run build
```

Result: passed.

## Remaining QA Work

These fixes do not replace runtime QA. C2-WP-01 through C2-WP-04 still require centralized focused UI/API runtime evidence before QA can sign off.

Runtime checks should run one item/spec at a time under the Orchestrator resource gate.
