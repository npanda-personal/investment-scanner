# CF-W2-SIG-01A QA Plan

Date: 2026-05-17

## Scope

Focused backend Signal Generation tests only.

## Command

```text
cd backend
npm.cmd test -- signal-generation-engine.service.test.ts signal-generation-engine.validation.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand
```

## Required Checks

- Default run request applies Data Quality filtering.
- Default run-path missing DQ behavior is `SKIP`.
- DQ filter failure fails closed and does not call `generateForInstrument()`.
- Strict DQ-filtered invariant test still proves only DQ-ready instruments are generated.
- Explicit `useDataQualityFilter: false` remains visible as a limitation.
- No Data Quality source, Market Data source, Prisma, route, shared utility, package, generated fixture, frontend, startup, live provider, Angel One, broker, or UI files are required.
- No target-price semantics are introduced.
- Full `CF-W1-SIG-01` is not overclaimed.

## Stop Conditions

- Focused command is unavailable or unexpectedly broad.
- Test failure requires Data Quality, Market Data, Prisma, route, shared utility, package, generated fixture, frontend, startup, provider, or UI changes.
- The slice cannot be documented without overclaiming full downstream enforcement.

