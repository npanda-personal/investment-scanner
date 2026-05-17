# CF-W2-SIG-01A Signal Generation Run-Path DQ Fail-Closed Contract

Date: 2026-05-17

## Contract

For `signal-generation-engine` run requests:

- Data Quality filtering is enabled by default.
- Missing DQ evaluation behavior defaults to `SKIP`.
- DQ filter failure blocks generation for the run universe instead of continuing as trusted output.
- Explicit non-filtered runs may still exist, but this slice treats them as outside trusted enforcement.

## Eligible Inputs

Only instruments returned as eligible by the Data Quality filter may be passed to `generateForInstrument()` for the default trusted run path.

## Failure Behavior

If the Data Quality filter is unavailable or throws, Signal Generation must:

- record a warning,
- produce zero generated signals for the resolved run universe,
- count the resolved universe as excluded by Data Quality,
- complete the run audit without treating the skipped instruments as generation failures.

## Evidence Behavior

Generated signal outputs preserve DQ eligibility evidence where the existing public behavior supports it.

## Limitations

This contract does not cover:

- explicit `useDataQualityFilter: false` bypass beyond documenting it,
- persisted trusted/untrusted classification,
- `topSignals()` read-path filtering,
- `screener()` read-path filtering,
- `latestForInstrument()` auto-generation gating,
- full trigger object contract,
- downstream modules.

## Forbidden Scope

No Prisma/schema, route registry, shared utility, package, generated fixture, frontend, startup/backfill, Angel One, live provider, broker, paid service, or UI change is allowed under this contract.

