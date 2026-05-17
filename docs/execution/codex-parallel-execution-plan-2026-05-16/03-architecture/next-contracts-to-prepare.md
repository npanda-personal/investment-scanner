# Next Contracts To Prepare

Date: 2026-05-17

Prepared by Continuous Architect Agent.

## Priority Contracts

1. `CF-W1-SIG-01` - Signal Generation trusted-run DQ fail-closed contract.
2. `CF-W1-STRAT-01` - Strategy Decision no-target / exit-invalidation contract.
3. `CF-W1-DQ-01` - Data Quality global fail-closed and use-case tier contract.
4. `CF-W1-MD-02` - Market Data durable readiness evidence and natural-key ADR.
5. `CF-W1-L3-AUTH-01` - Portfolio/watchlist/alert ownership contract.
6. `CF-W1-L3-ALERT-01` - Alert readiness consumer contract.
7. `CF-W1-UX-02` - Copilot trust UX contract.

## Recommendation

Prepare `CF-W1-STRAT-01` next because it contains a direct no-target-price product constraint conflict. Do not implement it without Product Owner approval because it changes user-facing and API semantics.

