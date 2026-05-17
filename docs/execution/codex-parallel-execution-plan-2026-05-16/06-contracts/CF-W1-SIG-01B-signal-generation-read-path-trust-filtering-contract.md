# CF-W1-SIG-01B Signal Generation Read-Path Trust Filtering Contract

Date: 2026-05-17

## Contract

Trusted Signal Generation read paths must derive trust from persisted Data Quality evidence already stored with each signal row.

A persisted signal is trusted for read-path exposure only when:

- `auditStatus` is `CURRENT`,
- `dataQualityEligibility.filterApplied` is `true`,
- `dataQualityEligibility.eligible` is `true`,
- `dataQualityEligibility.signalReadinessStatus` is `READY`.

Any row missing these fields is not trusted for `topSignals()` or `screener()`.

## Scope

Covered:

- `SignalGenerationEngineRepository.latestSignals()`
- `SignalGenerationEngineRepository.directionCounts()`
- `SignalGenerationEngineService.topSignals()`
- `SignalGenerationEngineService.screener()`

Excluded:

- `latestForInstrument()`
- historical diagnostics
- explicit untrusted diagnostics views
- downstream modules

## Architecture Constraints

- Use existing persisted `dataQualityEligibilitySnapshot`.
- Do not add Prisma fields.
- Do not change route registries.
- Do not add query flags in this slice.
- Do not introduce shared utility code.

## Limitations

This is a read-list trust filter, not a complete downstream enforcement system. It does not prove alerts, portfolio, watchlist, copilot, strategy-decision, backtesting, trade-plan, signal-quality, or calibration enforcement.

