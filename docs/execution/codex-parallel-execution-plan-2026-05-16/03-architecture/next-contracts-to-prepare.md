# Next Contracts To Prepare

Date: 2026-05-17

Prepared by Team 03 Architecture Factory and refreshed by Team 00 Master Orchestrator.

## Priority Contracts

1. `CF-W1-L3-AUTH-01` - Portfolio/watchlist child-resource ownership contract.
2. `CF-W1-L3-DQ-01` - Lane 3 readiness consumer policy contract.
3. `CF-W1-L3-ALERT-01` - Alert readiness consumer contract.
4. `CF-W1-MD-02` - Market Data durable readiness evidence and natural-key ADR.
5. `CF-W1-TP-01A` - Trade Plan no-target compatibility and DQ hard-block contract.
6. `CF-W1-UX-02` - Copilot/research trust UX contract.
7. `CF-W1-SIG-TRIGGER-01` - Complete signal trigger object contract.

## Completed Or No Longer Next

`CF-W1-STRAT-01` is completed as the bounded Strategy Decision Option B-Strict slice. Remaining Trade Plan target geometry is separate and must not be treated as completed by Strategy Decision work.

## Recommendation

Prepare `CF-W1-L3-AUTH-01` first, then `CF-W1-MD-02`. Keep Trade Plan, alert readiness, and UX trust implementation blocked until their contracts and QA plans are accepted.
