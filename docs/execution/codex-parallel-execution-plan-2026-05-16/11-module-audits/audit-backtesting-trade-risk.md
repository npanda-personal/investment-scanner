# Audit: Backtesting / Trade Plan / Risk

Date: 2026-05-17

Mode: Read-only Audit Team C.

## Scope

- `backend/src/modules/backtesting-strategy-lab/**`
- `backend/src/modules/trade-plan-risk-engine/**`
- Related backend tests
- Active execution docs

No tests, builds, servers, providers, UI checks, staging, commits, or file edits were run by the audit stream.

## Summary

Both modules have useful risk controls, but neither should be treated as trusted downstream output yet. Active execution docs already keep `backtesting-strategy-lab` and `trade-plan-risk-engine` blocked until separate DQ enforcement evidence is accepted.

## Findings

1. High: Backtesting DQ gate is optional. `simulate()` can return the full universe when `useDataQualityFilter` is false, and missing DQ defaults to warning/process unless configured strictly.
2. High: Trade-plan DQ blocker is incomplete. Trade plans block `UNUSABLE` coverage and `ILLIQUID`, but `NOT_READY` signal readiness can remain a warning/watch input rather than a hard paper-readiness blocker.
3. High: Target-price / arbitrary target risk remains. Trade plans emit `target.price` from default or user-supplied reward-risk geometry; API shape and tests expose concrete target levels.
4. Medium: Exit/invalidation rules are not fully strategy-native. Backtesting trades do not carry structured exit/invalidation rule IDs or rule versions.
5. Medium: Trade-plan invalidation is string-based and long-entry-only. Exit/risk-reduction decisions do not have a dedicated exit-review plan flow.
6. Medium: Overfit controls are diagnostic, not gating. No walk-forward, holdout, parameter-sensitivity, or minimum-proof gate is enforced locally.

## Candidate Stories

- `CF-W1-BT-01`: Add backtesting DQ fail-closed characterization tests for `backtest=READY`, required history completeness, and missing/limited DQ exclusion.
- `CF-W1-TP-01`: Add trade-plan tests for `LIMITED`, `NOT_READY`, `UNUSABLE`, stale, missing DQ, `eligibleForSignals=false`, and DQE blockers.
- `CF-W1-TP-02`: Replace user-facing target semantics with modeled exit level / reward-risk exit condition and cap/validate `targetRewardRisk`.
- `CF-W1-BT-02`: Add structured `exit_rule_id`, `invalidation_rule_id`, `rule_version`, and reason evidence to backtest trades and trade-plan invalidation output.
- `CF-W1-BT-03`: Add overfit diagnostics for minimum trades, parameter sensitivity, and walk-forward/holdout evidence before performance summaries influence readiness.

