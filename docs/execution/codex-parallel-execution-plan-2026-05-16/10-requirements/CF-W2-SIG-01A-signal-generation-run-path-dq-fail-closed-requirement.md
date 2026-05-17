# CF-W2-SIG-01A Signal Generation Run-Path DQ Fail-Closed Requirement

Date: 2026-05-17

## Requirement

Signal Generation run requests must default to Data Quality filtering and fail closed when DQ evidence is missing by default or when the DQ filter is unavailable.

## Product Value

This prevents routine signal generation runs from silently producing trusted-looking outputs when Data Quality readiness has not been proven.

## Scope

This is a narrower bounded slice. It covers the `run()` and request-validation path only.

It does not complete full `CF-W1-SIG-01`.

## Acceptance Criteria

- Omitted `useDataQualityFilter` defaults to `true`.
- Explicit `useDataQualityFilter: false` is preserved as a known legacy/research bypass and is not claimed as trusted enforcement.
- Run-path DQ filtering defaults missing evaluation behavior to `SKIP`.
- If DQ filtering throws, the run fails closed with zero generated signals and DQ exclusion counts.
- Strict DQ filtered runs continue to generate only DQ-ready instruments.
- Generated signal output for eligible instruments preserves DQ eligibility evidence where supported.
- No Data Quality, Market Data, Prisma, route, shared utility, package, generated fixture, frontend, startup, live provider, Angel One, or broker change is required.
- No arbitrary target-price semantics are introduced.

## Explicit Non-Goals

- Persisted trusted/untrusted classification.
- `topSignals()` read-path filtering.
- `screener()` read-path filtering.
- `latestForInstrument()` run-level DQ gating.
- Complete trigger object contract.
- Signal Quality, calibration, strategy-decision, backtesting, trade-plan, portfolio, watchlist, alerts, or copilot enforcement.

## File Reservation

Allowed source files:

- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.validation.ts`

Allowed test files:

- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.validation.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-dq-enforcement.invariants.test.ts`

## Status

Ready for evidence flow under standing Product Owner delegation for Continuous Factory autonomous waves.

