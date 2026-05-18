# CF-W1-BT-01A - Backtesting DQ Fail-Closed Characterization Requirement

Date: 2026-05-18

Status: Requirement draft prepared. Not Ready for Implementation.

## Why This Exists

Backtesting is a direct investor/trader trust surface, but the current module behavior is still partly optional and fail-open around Data Quality. The audit shows `simulate()` can return the full universe when `useDataQualityFilter` is false, and missing DQ can default to warning/process rather than a hard exclusion.

This requirement adds a smaller, clearer follow-on to the broader backtesting backlog: characterize the current DQ behavior first, so future contract work can state exactly what is trusted, what is diagnostic, and what must be excluded.

## Requirement

Define a characterization-only child for `backtesting-strategy-lab` that proves the current DQ gate behavior around:

- `backtest=READY` handling;
- required history completeness;
- missing DQ exclusion;
- limited / not-ready DQ handling;
- research-support wording for warning states.

The slice must stay descriptive and test-led. It should confirm current behavior without changing simulation math, target geometry, or downstream trade-plan semantics.

## Acceptance Criteria

- Tests describe the current backtesting DQ behavior clearly enough to distinguish trusted, limited, and diagnostic outputs.
- Missing or limited DQ does not look equivalent to trusted readiness in the characterization evidence.
- Required history completeness is explicit in the expected backtesting outcome.
- The requirement remains additive and does not reopen simulation math, schema, routes, shared UI, or provider work.
- Product language stays in research-support terms such as candidate, review, warning, and reliability.

## Non-Goals

- No simulation rewrite.
- No route changes.
- No Prisma or schema changes.
- No shared UI or shared utility changes.
- No provider, live-data, startup, or backfill work.
- No trade-plan or strategy-rule rewrite.

## Next Gate

Team 03 should prepare the bounded architecture / contract packet for this characterization child once Team 00 routes it. Team 04 should then prepare a focused QA plan that proves the DQ-fail-closed characterization without widening scope.

## Blockers

- The broader backtesting implementation remains separate from this characterization child.
- No Ready promotion is requested here.
- Any attempt to turn this into a simulation or contract rewrite should return to Team 00 / Architect.
