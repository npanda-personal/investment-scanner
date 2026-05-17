# CF-W1-SIG-LATEST-01 QA Plan

Date: 2026-05-17

## Scope

Focused backend Signal Generation latest-instrument tests only.

## Command

```text
cd backend
npm.cmd test -- signal-generation-engine.service.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand
```

## Required Coverage

- Trusted persisted latest signal is returned.
- Legacy/untrusted persisted latest signal does not bypass DQ.
- Missing latest signal uses the DQ-gated run path.
- DQ-blocked latest generation returns `null`.
- Direct `generateForInstrument()` is not called when DQ blocks.
- Existing strict DQ run-path invariant remains passing.
- No forbidden files or live/provider/startup/UI behavior are involved.

