# CF-W1-BT-03 - Backtesting Proof-Basis / Overfit Guardrail Requirement

Date: 2026-05-18

## Status

Audit-derived requirement. Not Ready for Implementation.

## Product Value

Backtesting is one of the highest-trust research surfaces in the product. A user can currently see returns, drawdown, benchmark comparison, availability, rating, and realism warnings, but the workflow still does not make one core truth explicit: a single historical run is not the same thing as validated forward proof. Without an explicit proof-basis guardrail, a strong-looking run can overstate reliability even when the module has no walk-forward, holdout, or parameter-sensitivity evidence. This requirement should stay ahead of durable-memory follow-ons because it explains already-produced strategy evidence rather than expanding the validation engine.

This requirement closes that reviewability gap without widening into advanced quant infrastructure.

## Evidence

- `11-module-audits/audit-backtesting-trade-risk.md` flags that overfit controls are diagnostic only and that no walk-forward, holdout, parameter-sensitivity, or minimum-proof gate is enforced locally.
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md` explicitly says the module does not own walk-forward optimization, Monte Carlo, or advanced quant research.
- The same module doc already exposes realism warnings, availability status, data coverage, benchmark comparison, exit diagnostics, framework rating, and readiness, so the missing gap is proof-basis framing rather than raw metric generation.
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts` already warns when trade count is low, benchmark underperforms, drawdown is large, or end-of-test exits are too common, but it does not yet normalize those signals into an explicit proof-basis summary.
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx` already renders warnings and diagnostics, so a later first child can stay additive and explanation-first rather than inventing a new workflow.

## Bounded Requirement

Define a bounded backtesting proof-basis guardrail so users can distinguish:

- review-useful historical evidence;
- partial or weak proof;
- single-window-only diagnostics;
- outputs that should not influence strategy reliability judgment yet.

The first child should focus on additive proof-basis metadata derived from current module-owned evidence only, including:

- explicit single-window status;
- explicit absence of holdout and walk-forward validation;
- explicit absence of parameter-sensitivity evidence;
- minimum-sample or weak-sample proof warnings;
- concise research-support proof summary for saved-run list and selected-run detail surfaces.

The requirement must not imply that advanced validation exists when it does not.

## Acceptance Criteria

- Backtest outputs expose an explicit proof-basis summary that tells the user whether the run is single-window-only, sample-limited, or missing broader validation evidence.
- The workflow distinguishes historical review evidence from stronger validation evidence without fabricating walk-forward, holdout, or parameter-sensitivity results.
- Existing trade-count, drawdown, benchmark, availability, coverage, and exit-diagnostic warnings remain visible inputs to the proof-basis framing.
- The saved-run list and selected-run detail can later show the same proof-basis story for the same run.
- Product language stays research-support only and does not present backtest performance as advice or as validated certainty.
- Focused tests later prove proof-basis labeling for low-trade-count runs, benchmark-gap runs, weak-exit runs, and single-window-only runs.

## Non-Goals

- No walk-forward engine implementation.
- No holdout engine implementation.
- No parameter sweep or optimization engine.
- No Monte Carlo, intraday, paid-provider, or broker expansion.
- No simulation-math rewrite.
- No Prisma schema, route, package, shared UI, or provider changes in the first child.

## Future Candidate Files After Ready Promotion

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`
- `frontend/src/features/backtesting-strategy-lab/types.ts`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`

## Priority Position

This belongs ahead of Lane 3 convenience work and ahead of consent-gated storage follow-ons because it improves direct strategy-review trust on a core research surface and stays inside the Product Owner's corrected direct-value order.

## Next Gate

Route to Team 03 for a bounded architecture/contract/work-packet proposal, then Team 04 for QA planning. Stop and split if the first child requires a validation engine, schema work, shared UI, or cross-module simulation changes.
