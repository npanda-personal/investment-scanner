# Next Top 10 Candidates

Date: 2026-05-17

Prepared by Continuous Product Agent while audit/refinement continued.

1. `CF-W1-STRAT-01` - Resolve no-target / exit-invalidation decision packet before Strategy Decision source work.
2. `CF-W1-L3-AUTH-01` - Portfolio/watchlist child ownership tests and fix after architecture contract.
3. `CF-W1-L3-ALERT-01` - Alert readiness consumer contract and tests.
4. `CF-W1-MD-02` - Durable Market Data readiness evidence ADR.
5. `CF-W1-MD-01` - Market Data validation hardening tests.
6. `CF-W1-BT-01` - Backtesting DQ fail-closed characterization.
7. `CF-W1-TP-01` - Trade Plan DQ hard blockers and target semantics.
8. `CF-W1-UX-02` - Copilot trust UX contract.
9. `CF-W1-QA-01` - Focused test command matrix.
10. `CF-W1-SIG-TRIGGER-01` - Signal trigger object contract completion.

## Product Agent Recommendation

Signal Generation run-path, trusted list read-path, and latest-instrument trust gates are now committed. Do not move to strategy/trade-plan implementation until `CF-W1-STRAT-01` is resolved. Lane 3 readiness consumer and ownership contracts can continue as documentation-only preparation.
