# TEAM-06 Strategy / Signal / Risk Outbox - 2026-05-17

Mode: read-only audit/refinement.

Files changed: none.

Tests, services, providers, staging, and commits: none.

## Key Finding

`CF-W1-STRAT-01` is complete only for bounded Strategy Decision Option B-Strict. It deliberately did not migrate Trade Plan target geometry.

`CF-W1-TP-01` is not ready for application-code implementation.

## Trade Plan Blockers

- Product/architecture decision is still needed for Trade Plan target semantics.
- DQ hard-block policy is unresolved for `NOT_READY`, `LIMITED`, missing DQ, `eligibleForSignals=false`, stale data, and DQE blockers.
- Frontend/API compatibility risk remains around existing target fields.

## Evidence Summary

- Trade Plan still requires a target object shape with `price` and `expectedReturnPercent`.
- Trade Plan still computes target price from reward/risk geometry.
- Paper readiness blocks missing target and low reward/risk.
- `NOT_READY` DQ is warning/watch-flag behavior rather than a hard blocker.
- Today Review still renders target price and modeled reward from Trade Plan output.
- Backtesting DQ remains optional and fail-open by default.

## Recommendation

Create a docs-only `CF-W1-TP-01A` contract packet:

`Trade Plan No-Target Compatibility And DQ Hard-Block Contract`

No Team 6 code should start until that contract, QA plan, work packet, Architect signoff, and PO acceptance exist.
