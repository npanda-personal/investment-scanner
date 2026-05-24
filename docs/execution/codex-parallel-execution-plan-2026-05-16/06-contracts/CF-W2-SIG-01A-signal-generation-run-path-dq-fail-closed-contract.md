# CF-W2-SIG-01A Signal Generation Run-Path DQ Fail-Closed Contract

Date: 2026-05-24

## Contract

For `signal-generation-engine` run requests:

- Data Quality filtering is enabled by default when `useDataQualityFilter` is omitted.
- Explicit `useDataQualityFilter: false` is preserved as a legacy/research bypass and must not be described as trusted DQ enforcement.
- Missing DQ evaluation behavior defaults to `SKIP`.
- DQ filter failure blocks generation for the resolved run universe instead of continuing as trusted output.
- DQ-ready instruments may continue through the normal generation path when the filter succeeds.

## Request Normalization

`parseRunRequest()` must normalize:

- omitted `useDataQualityFilter` to `true`;
- explicit `useDataQualityFilter: false` to `false`;
- omitted or unsupported `missingQualityBehavior` so service logic can apply `SKIP`;
- supported explicit `missingQualityBehavior` values only.

The service must keep a defensive default so direct service callers are still filtered unless they explicitly pass `useDataQualityFilter: false`.

## Eligible Inputs

For the default filtered run path, only instruments returned as eligible by `DataQualityEngineService.filterEligibleInstruments()` may be passed to `generateForInstrument()`.

When a resolved instrument is excluded or lacks DQ evidence under `SKIP`, it must count as skipped/excluded by Data Quality, not as a generation failure.

## Failure Behavior

If the Data Quality filter is unavailable or throws, Signal Generation must:

- record a warning;
- produce zero generated signals for the resolved run universe;
- attempt generation for zero instruments;
- count the resolved universe as excluded by Data Quality;
- count the resolved universe as missing DQ evaluation when no evidence can be read;
- complete the run audit without treating skipped instruments as generation failures.

## Evidence Behavior

Generated eligible signal outputs must preserve DQ eligibility evidence where the existing public behavior supports it, including available coverage/readiness/liquidity status and exclusion reason semantics.

Missing DQ evidence must not be converted into a trusted completeness claim.

## Compatibility Boundaries

This contract does not cover:

- explicit `useDataQualityFilter: false` bypass beyond preserving and documenting it;
- persisted trusted/untrusted classification;
- `topSignals()` read-path filtering;
- `screener()` read-path filtering;
- `latestForInstrument()` auto-generation gating;
- full trigger object contract;
- downstream Today Review, Signal Quality, Strategy Decision, Backtesting, Portfolio, Watchlist, Alert, Copilot, or Research Hub consumers.

## Product Language Guardrails

This contract must not introduce:

- target price semantics;
- R:R or reward/risk ratio framing;
- synthetic profit targets;
- direct buy/sell advice;
- guaranteed-outcome language;
- Trade Plan-first wording.

Use research-support language such as DQ-ready, excluded by Data Quality, missing DQ evaluation, eligible instrument, skipped, reason summary, and trusted enforcement only when DQ filtering was applied.

## Forbidden Scope

No Data Quality Engine source/test change, Market Data source/test change, Prisma/schema, route registry, shared utility, package, generated fixture, frontend, startup/backfill, Angel One, live provider, broker, paid service, or UI change is allowed under this contract.
