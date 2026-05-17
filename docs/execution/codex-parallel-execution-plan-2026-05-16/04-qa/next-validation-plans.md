# Next Validation Plans

Date: 2026-05-17

Prepared by Team 04 QA Factory and refreshed by Team 00 Master Orchestrator.

## Completed QA Planning

`CF-W1-QA-01` focused command matrix is recorded in `04-qa/CF-W1-QA-01-focused-test-command-matrix.md`.

## Priority QA Plans

1. `CF-W1-TP-01A`: Trade Plan no-target compatibility and DQ hard-block contract validation.
2. `CF-W1-L3-AUTH-01`: two-user ownership tests for portfolio/watchlist child resources.
3. `CF-W1-L3-ALERT-01`: alert DQ readiness suppression tests.
4. `CF-W1-MD-01`: Market Data validation hardening tests after policy is accepted.
5. `CF-W1-UX-02`: copilot trust UX backend and UI-smoke plan.
6. `CF-W1-SIG-TRIGGER-01`: trigger object contract tests.

## Safe Command Discipline

Use focused backend Jest patterns only until broader test approval exists.

Do not run Playwright, services, provider tests, live providers, broad backend suites, startup/backfill, Prisma mutation commands, Angel One, or paid/cloud flows without explicit approval and resource checks.
