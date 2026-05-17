# CF-W1-SIG-01B QA Plan

Date: 2026-05-17

## Scope

Focused backend Signal Generation read-path tests only.

## Command

```text
cd backend
npm.cmd test -- signal-generation-engine.service.test.ts signal-generation-engine.repository.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand
```

## Required Coverage

- Repository latest signal lists exclude legacy rows without DQ evidence.
- Repository latest signal lists exclude rows where persisted DQ evidence is not trusted.
- Repository direction counts are based on trusted rows.
- Service `topSignals()` filters mocked read-path rows defensively before exposure.
- Service `screener()` follows the same trusted read filter.
- Existing strict DQ run-path invariant remains passing.
- No Angel One, live provider, broker, paid service, startup/backfill, UI, Prisma/schema, route, shared utility, package, or generated fixture changes are required.

## Stop Conditions

- Correct filtering requires Prisma/schema changes.
- Correct filtering requires route or shared utility changes.
- Focused tests require live providers or services.
- Test failure requires forbidden scope.
- Implementation overclaims `latestForInstrument()` or downstream enforcement.

