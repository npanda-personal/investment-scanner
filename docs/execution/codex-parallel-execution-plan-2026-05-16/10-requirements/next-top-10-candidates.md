# Next Top 10 Candidates

Date: 2026-05-17

Prepared by Continuous Product Agent while audit/refinement continued.

1. `CF-W1-SIG-01B` - Signal Generation read-path DQ trust filtering and persisted trust classification.
2. `CF-W1-STRAT-01` - Remove arbitrary target-price semantics.
3. `CF-W1-SIG-LATEST-01` - Gate `latestForInstrument()` auto-generation through DQ readiness.
4. `CF-W1-MD-02` - Durable Market Data readiness evidence ADR.
5. `CF-W1-L3-AUTH-01` - Portfolio/watchlist child ownership tests and fix.
6. `CF-W1-L3-ALERT-01` - Alert readiness consumer tests.
7. `CF-W1-MD-01` - Market Data validation hardening tests.
8. `CF-W1-BT-01` - Backtesting DQ fail-closed characterization.
9. `CF-W1-TP-01` - Trade Plan DQ hard blockers and target semantics.
10. `CF-W1-UX-02` - Copilot trust UX contract.

## Product Agent Recommendation

Do not move to alerts, portfolio, copilot, trade plans, strategy decisions, or backtesting implementation until Signal Generation read-path trust filtering and `CF-W1-STRAT-01` target-semantics decisions are handled.
