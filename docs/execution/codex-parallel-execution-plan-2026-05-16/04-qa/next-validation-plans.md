# Next Validation Plans

Date: 2026-05-17

Prepared by Continuous QA Agent.

## Priority QA Plans

1. `CF-W1-STRAT-01`: no-target-price and exit/invalidation rule wording tests after decision.
2. `CF-W1-L3-AUTH-01`: two-user ownership tests for portfolio/watchlist child resources.
3. `CF-W1-L3-ALERT-01`: alert DQ readiness suppression tests.
4. `CF-W1-MD-01`: Market Data validation hardening tests.
5. `CF-W1-UX-02`: copilot trust UX smoke plan.
6. `CF-W1-SIG-TRIGGER-01`: trigger object contract tests.

## Safe Command Discipline

Use focused backend Jest patterns only until broader test approval exists.

Do not run Playwright, services, provider tests, live providers, or broad backend suites without explicit approval and resource checks.
