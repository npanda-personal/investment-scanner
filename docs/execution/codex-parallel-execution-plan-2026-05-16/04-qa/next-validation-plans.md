# Next Validation Plans

Date: 2026-05-17

Prepared by Continuous QA Agent.

## Priority QA Plans

1. `CF-W1-SIG-01B`: signal-generation read-path trust filtering and persisted trust classification tests.
2. `CF-W1-STRAT-01`: no-target-price and exit/invalidation rule wording tests.
3. `CF-W1-SIG-LATEST-01`: `latestForInstrument()` DQ gate tests.
4. `CF-W1-MD-01`: Market Data validation hardening tests.
5. `CF-W1-L3-AUTH-01`: two-user ownership tests for portfolio/watchlist child resources.
6. `CF-W1-L3-ALERT-01`: alert DQ readiness suppression tests.
7. `CF-W1-UX-02`: copilot trust UX smoke plan.

## Safe Command Discipline

Use focused backend Jest patterns only until broader test approval exists.

Do not run Playwright, services, provider tests, live providers, or broad backend suites without explicit approval and resource checks.
