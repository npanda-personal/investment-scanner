# CF-W1-BT-02 - Backtesting Outcome Review Traceability Requirement

Date: 2026-05-18

## Status

Audit-derived future child requirement. Not Ready for Implementation.

## Product Value

Backtesting is a review workflow, not just a simulation engine. Investors need to know whether a run is genuinely useful for strategy review or only diagnostic because of weak exits, insufficient samples, legacy repair, limited coverage, benchmark gaps, or low data-quality confidence. The module already surfaces availability, benchmark comparison, exit diagnostics, and legacy repair warnings; the remaining gap is a canonical review-disposition label and reason summary so the list view and detail view tell the same trust story.

## Evidence

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md` already exposes run history, equity curves, drawdowns, trade logs, diagnostics, data coverage, benchmark comparison, availability status, and realism warnings.
- The same module doc explicitly records `AVAILABLE`, `PARTIAL`, `INSUFFICIENT_HISTORY`, `NOT_RUN`, and `ERROR` availability states plus warnings for weak exits, small samples, data coverage, drawdown, and benchmark underperformance.
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts` withholds or repairs legacy aggregate proof, records `calculationAudit`, and emits `benchmarkComparison` and `exitDiagnostics`, but does not yet frame the outcome as a canonical review-disposition value.
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx` already renders performance cards, charts, trade logs, warnings, availability, rating, readiness, and data coverage diagnostics, so the missing requirement is about a shared review label and reason summary rather than a new backtesting UI.

## Dependencies

- Team 03 and Team 04 already prepared architecture/QA docs against an earlier broader draft. Those packets need a refresh against this narrower canonical-label requirement before any Ready evaluation.
- The first child should stay additive across existing saved-run list and detail surfaces rather than widen into simulation, benchmark, or strategy-framework changes.

## Bounded Requirement

Define a bounded review-disposition contract that normalizes how existing backtest diagnostics are summarized across saved-run list and detail views.

The first child slice should focus on:

- one canonical disposition label derived from existing availability, calculation-audit, coverage, benchmark, and exit-diagnostic evidence;
- a concise reason summary that explains why the run is trusted, partial, diagnostic, or withheld;
- additive list/detail projection so the same run does not tell two different trust stories depending on view;
- no simulation-math rewrite, no benchmark engine work, no route/schema change, and no new ranking model.

## Acceptance Criteria

- Backtest results expose one canonical review-disposition label that distinguishes trusted review outcomes, partial outcomes, diagnostic outcomes, and legacy-repaired or withheld outcomes.
- The user can see why a backtest should or should not be used for review, including weak-exit, small-sample, coverage, benchmark, and repair reasons.
- Availability, benchmark status, calculation audit, and realism warnings remain additive evidence, not hidden implementation detail.
- The saved-run list and detail page show the same disposition label and reason summary for a given run.
- Registered and custom-rule runs keep their current behavior unless a later accepted contract explicitly changes the review contract.
- Focused tests cover trusted, partial, diagnostic, legacy-invalid, benchmark-unavailable, weak-exit, and saved-run-list normalization scenarios.

## Non-Goals

- No change to core simulation math, price history sourcing, or registered strategy semantics.
- No Prisma schema, route registry, shared UI, package manifest, provider, or telemetry work.
- No new benchmark engine, trust scoring model, or simulation ranking math.
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

Refresh the existing architecture/QA packet to this narrower canonical-label scope, then hand `CF-W1-BT-02` back to Team 00/03 for exact file reservation and Team 04 QA-plan confirmation before any Ready evaluation.
