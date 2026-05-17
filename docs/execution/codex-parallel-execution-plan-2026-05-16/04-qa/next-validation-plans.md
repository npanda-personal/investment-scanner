# Next Validation Plans

Date: 2026-05-17

Prepared by Team 04 QA Factory and refreshed in daemon scheduler mode.

## Completed QA Planning

`CF-W1-QA-01` focused command matrix is recorded in `04-qa/CF-W1-QA-01-focused-test-command-matrix.md`.

## Priority QA Plans Prepared

1. `CF-W1-L3-AUTH-01`: portfolio/watchlist child-resource ownership plan recorded in `04-qa/CF-W1-L3-AUTH-01-qa-plan.md`.
2. `CF-W1-L3-DQ-01`: Lane 3 readiness consumer policy plan recorded in `04-qa/CF-W1-L3-DQ-01-qa-plan.md`.
3. `CF-W1-TP-01A`: Trade Plan no-target compatibility and DQ hard-block plan recorded in `04-qa/CF-W1-TP-01A-qa-plan.md`.
4. `CF-W1-MD-02`: durable Market Data readiness evidence ADR QA plan recorded in `04-qa/CF-W1-MD-02-qa-plan.md`.

## Remaining Next QA Plans

1. `CF-W1-L3-ALERT-01`: alert DQ readiness suppression tests after Lane 3 readiness policy is accepted.
2. `CF-W1-MD-01`: Market Data validation hardening tests after future-date, adjusted-close, and spike policy are accepted.
3. `CF-W1-UX-02`: copilot trust UX backend and UI-smoke plan after UX/product contract approval.
4. `CF-W1-SIG-TRIGGER-01`: trigger object contract tests after trigger contract completion.

## Focused Command Guidance

Commands below are guidance only. They were not run during this documentation-only planning task.

| Work item | Focused command | Current status |
| --- | --- | --- |
| `CF-W1-L3-AUTH-01` | `cd backend` then `npm.cmd test -- portfolio-management.service.test.ts portfolio-management.routes.test.ts watchlist-management.service.test.ts watchlist-management.routes.test.ts --runInBand` | Blocked until ownership contract and implementation handoff. |
| `CF-W1-L3-DQ-01` | `cd backend` then `npm.cmd test -- data-quality-engine.service.test.ts data-quality-engine.invariants.test.ts --runInBand` | Blocked until Lane 3 readiness policy contract and implementation handoff. |
| `CF-W1-L3-DQ-01` | `cd backend` then `npm.cmd test -- portfolio-management.service.test.ts watchlist-management.service.test.ts portfolio-intelligence.service.test.ts --runInBand` | Blocked until corresponding Lane 3 consumer implementation. |
| `CF-W1-L3-DQ-01` | `cd backend` then `npm.cmd test -- alerts-monitoring.service.test.ts alerts-monitoring.routes.test.ts alerts-monitoring.validation.test.ts --runInBand` | Blocked until alert readiness contract and implementation. |
| `CF-W1-TP-01A` | `cd backend` then `npm.cmd test -- trade-plan-risk-engine.service.test.ts trade-plan-risk-engine.paper-readiness.test.ts --runInBand` | Blocked until Trade Plan contract and implementation handoff. |
| `CF-W1-MD-02` | `cd backend` then `npm.cmd test -- market-data-readiness-evidence.invariants.test.ts market-data-storage-readiness.invariants.test.ts market-data.universe.test.ts market-data.validation.test.ts market-data.repository.test.ts --runInBand` | Blocked until ADR approval and scoped implementation. |

## Safe Command Discipline

Use focused backend Jest patterns only until broader test approval exists.

Do not run Playwright, services, provider tests, live providers, broad backend suites, startup/backfill, Prisma mutation commands, Angel One, or paid/cloud flows without explicit approval and resource checks.

Provider-adjacent, startup-adjacent, frontend build, backend build, UI smoke, live-provider, Prisma mutation, and broad-suite validation remain approval-gated and excluded from default QA execution.

## Current QA Blockers

- `CF-W1-L3-AUTH-01`: needs accepted ownership contract and scoped implementation; stop if it requires Prisma, auth middleware, route registry, alert ownership, shared fixtures, or package changes.
- `CF-W1-L3-DQ-01`: blocked by Product Owner and Architect decision on Lane 3 display-vs-action readiness policy.
- `CF-W1-TP-01A`: blocked by Trade Plan target/no-target and DQ hard-block contract acceptance; full target geometry migration remains separate.
- `CF-W1-MD-02`: blocked from executable validation by ADR/Product/Architect approval for durable readiness evidence and Prisma/OHLC storage model.
