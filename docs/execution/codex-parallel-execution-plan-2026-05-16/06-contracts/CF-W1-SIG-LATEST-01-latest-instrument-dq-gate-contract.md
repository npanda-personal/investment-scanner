# CF-W1-SIG-LATEST-01 Latest Instrument DQ Gate Contract

Date: 2026-05-17

## Contract

`latestForInstrument()` must fail closed for untrusted signal data:

- return persisted latest signal only if it is trusted by the same predicate used for trusted list reads,
- otherwise use the run-level DQ gate for any auto-generation attempt,
- return `null` when DQ blocks or is unavailable.

## Trust Predicate

A persisted latest signal is trusted only when:

- `auditStatus` is `CURRENT`,
- `dataQualityEligibility.filterApplied` is `true`,
- `dataQualityEligibility.eligible` is `true`,
- `dataQualityEligibility.signalReadinessStatus` is `READY`.

## Constraints

- Reuse existing `run()` fail-closed behavior.
- Do not change routes or response types.
- Do not add schema fields.
- Do not use live providers or startup behavior.

## Limitations

This contract does not create untrusted diagnostic read endpoints and does not unblock downstream modules.

