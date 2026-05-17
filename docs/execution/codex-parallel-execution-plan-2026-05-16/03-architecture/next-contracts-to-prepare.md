# Next Contracts To Prepare

Date: 2026-05-17

Prepared by Continuous Architect Agent.

## Priority Contracts

1. `CF-W1-SIG-01B` - Signal Generation read-path DQ trust filtering and persisted trust-classification contract.
2. `CF-W1-STRAT-01` - Strategy Decision no-target / exit-invalidation contract.
3. `CF-W1-SIG-LATEST-01` - Latest signal auto-generation DQ gate contract.
4. `CF-W1-MD-02` - Market Data durable readiness evidence and natural-key ADR.
5. `CF-W1-L3-AUTH-01` - Portfolio/watchlist/alert ownership contract.
6. `CF-W1-L3-ALERT-01` - Alert readiness consumer contract.
7. `CF-W1-UX-02` - Copilot trust UX contract.

## Recommendation

Prepare `CF-W1-SIG-01B` next because `CF-W2-SIG-01A` intentionally covers only the run path. Do not move downstream until stored/read signal trust behavior is contracted.
