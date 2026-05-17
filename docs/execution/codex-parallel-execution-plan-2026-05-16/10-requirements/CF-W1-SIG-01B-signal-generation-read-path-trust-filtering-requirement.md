# CF-W1-SIG-01B Signal Generation Read-Path Trust Filtering Requirement

Date: 2026-05-17

## Product Value

Users and downstream modules should not see persisted Signal Generation rows as trusted unless those rows preserve Data Quality evidence proving they were generated from ready, eligible data.

## Scope

This requirement covers trusted read paths for:

- `topSignals()`
- `screener()`
- repository latest-signal lists and direction counts used by those service paths

## Acceptance Criteria

- Persisted rows are treated as trusted only when `auditStatus` is `CURRENT`.
- Persisted rows are treated as trusted only when `dataQualityEligibility.filterApplied === true`.
- Persisted rows are treated as trusted only when `dataQualityEligibility.eligible === true`.
- Persisted rows are treated as trusted only when `dataQualityEligibility.signalReadinessStatus === READY`.
- Legacy rows without DQ snapshots are excluded from trusted read lists.
- Rows with missing, false, limited, not-ready, or unusable DQ evidence are excluded from trusted read lists.
- `topSignals()` and `screener()` do not expose untrusted rows.
- Direction counts and totals for trusted lists are based on trusted rows.
- No Prisma/schema, route, shared utility, package, generated fixture, frontend, startup, Angel One, live provider, broker, paid service, or UI changes are required.

## Explicit Non-Goals

- `latestForInstrument()` auto-generation DQ gating.
- New route/query flags for showing untrusted diagnostics.
- Schema-level persisted boolean trust fields.
- Downstream Signal Quality, Strategy Decision, Backtesting, Trade Plan, Portfolio, Watchlist, Alerts, or Copilot enforcement.

## Status

Ready for bounded module-local implementation under standing Product Owner delegation.

