# CF-W1-BT-02 - Backtesting Outcome Review Traceability Requirement

Date: 2026-05-18

## Status

Audit-derived future child requirement. Not Ready for Implementation.

## Product Value

Backtesting is a review workflow, not just a simulation engine. Investors need to know whether a run is genuinely useful for strategy review or only diagnostic because of weak exits, insufficient samples, legacy repair, limited coverage, benchmark gaps, or low data-quality confidence. Without that separation, the results can look more trustworthy than the evidence supports.

## Evidence

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md` already exposes run history, equity curves, drawdowns, trade logs, diagnostics, data coverage, benchmark comparison, availability status, and realism warnings.
- The same module doc explicitly records `AVAILABLE`, `PARTIAL`, `INSUFFICIENT_HISTORY`, `NOT_RUN`, and `ERROR` availability states plus warnings for weak exits, small samples, data coverage, drawdown, and benchmark underperformance.
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts` withholds or repairs legacy aggregate proof, records `calculationAudit`, and emits `benchmarkComparison` and `exitDiagnostics`, but does not yet frame the outcome as a distinct trustworthy-vs-diagnostic review state.
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx` already renders performance cards, charts, trade logs, warnings, availability, rating, readiness, and data coverage diagnostics, so the missing requirement is about review traceability and outcome trust framing rather than a new backtesting UI.

## Acceptance Criteria

- Backtest results clearly distinguish trusted review outcomes, partial outcomes, diagnostic outcomes, and legacy-repaired or withheld outcomes.
- The user can see why a backtest should or should not be used for review, including weak-exit, small-sample, coverage, benchmark, and repair reasons.
- Availability, benchmark status, calculation audit, and realism warnings are surfaced as review-traceability evidence rather than hidden implementation detail.
- Registered and custom-rule runs keep their current behavior unless a later accepted contract explicitly changes the review contract.
- Focused tests cover trusted, partial, diagnostic, legacy-invalid, benchmark-unavailable, and weak-exit scenarios.

## Non-Goals

- No change to core simulation math, price history sourcing, or registered strategy semantics.
- No Prisma schema, route registry, shared UI, package manifest, provider, or telemetry work.
- No walk-forward, Monte Carlo, intraday, or paid-provider expansion.
- No new recommendation language or target-price advice.

## Future Candidate Files After Ready Promotion

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`
- `frontend/src/features/backtesting-strategy-lab/types.ts`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`

## Next Gate

Product refinement and an architecture contract for bounded backtesting outcome-review traceability, then QA planning and Team 00 Ready evaluation after an exact implementation handoff exists.
