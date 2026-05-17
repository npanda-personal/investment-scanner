# Next Validation Plans

Date: 2026-05-17

Prepared by Team 04 QA Factory and refreshed after the decision resolutions, bounded commits, and daemon checkpoint protocol fix.

Refresh note: docs-only QA refresh. No tests, builds, services, providers, UI checks, or application source/test edits were run or modified during this refresh.

## Completed QA Planning / Evidence

- `CF-W1-QA-01` focused command matrix is recorded in `04-qa/CF-W1-QA-01-focused-test-command-matrix.md`.
- `CF-W1-L3-AUTH-01` portfolio/watchlist child-resource ownership is completed and committed in `74ba6dd`; QA evidence recorded in `04-qa/CF-W1-L3-AUTH-01-qa-evidence.md`.
- `CF-W1-L3-AUTH-02` alert event ownership is completed and committed in `503bcd9`; QA evidence recorded in `04-qa/CF-W1-L3-AUTH-02-qa-evidence.md`.
- `CF-W1-SIG-TRIGGER-01` optional trigger DTO projection is completed and committed in `6ab3999`; QA evidence recorded in `04-qa/CF-W1-SIG-TRIGGER-01-qa-evidence.md`.

## Priority QA Plans Prepared

1. `CF-W1-L3-DQ-01`: Lane 3 readiness consumer policy plan recorded in `04-qa/CF-W1-L3-DQ-01-qa-plan.md`.
2. `CF-W1-TP-01A`: Trade Plan no-target compatibility and DQ hard-block plan recorded in `04-qa/CF-W1-TP-01A-qa-plan.md`.
3. `CF-W1-MD-02`: durable Market Data readiness evidence ADR QA plan recorded in `04-qa/CF-W1-MD-02-qa-plan.md`.

## Remaining Next QA Plans

1. `CF-W1-MD-01`: safest next QA plan gap. Prepare a docs-only Market Data validation hardening QA plan for future-date, adjusted-close, invalid OHLC, suspicious volume, and spike policy coverage. Do not run commands until Product Owner/Architect policy acceptance and implementation handoff.
2. `CF-W1-L3-ALERT-01`: alert DQ readiness suppression tests after Lane 3 readiness policy is accepted.
3. `CF-W1-UX-02`: copilot trust UX backend and UI-smoke plan after UX/product contract approval.

## Focused Command Guidance

Commands below are guidance only. They were not run during this documentation-only planning task.

| Work item | Focused command | Current status |
| --- | --- | --- |
| `CF-W1-L3-AUTH-01` | `cd backend` then `npm.cmd test -- portfolio-management.service.test.ts portfolio-management.ownership.test.ts watchlist-management.service.test.ts watchlist-management.ownership.test.ts --runInBand` | Completed and committed in `74ba6dd`; keep as regression focus for future Lane 3 ownership edits. |
| `CF-W1-L3-AUTH-02` | `cd backend` then `npm.cmd test -- alerts-monitoring.service.test.ts alerts-monitoring.ownership.test.ts alerts-monitoring.routes.test.ts --runInBand` | Completed and committed in `503bcd9`; keep as regression focus for future Alerts Monitoring ownership edits. |
| `CF-W1-SIG-TRIGGER-01` | `cd backend` then `npm.cmd test -- signal-generation-engine.service.test.ts signal-generation-engine.trigger-contract.test.ts signal-generation-engine.validation.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand` | Completed and committed in `6ab3999`; keep as regression focus for future Signal Generation DTO changes. |
| `CF-W1-L3-DQ-01` | `cd backend` then `npm.cmd test -- data-quality-engine.service.test.ts data-quality-engine.invariants.test.ts --runInBand` | Blocked until Lane 3 readiness policy contract and implementation handoff. |
| `CF-W1-L3-DQ-01` | `cd backend` then `npm.cmd test -- portfolio-management.service.test.ts watchlist-management.service.test.ts portfolio-intelligence.service.test.ts --runInBand` | Blocked until corresponding Lane 3 consumer implementation. |
| `CF-W1-L3-DQ-01` | `cd backend` then `npm.cmd test -- alerts-monitoring.service.test.ts alerts-monitoring.routes.test.ts alerts-monitoring.validation.test.ts --runInBand` | Blocked until alert readiness contract and implementation. |
| `CF-W1-TP-01A` | `cd backend` then `npm.cmd test -- trade-plan-risk-engine.service.test.ts trade-plan-risk-engine.paper-readiness.test.ts --runInBand` | Blocked until Trade Plan contract and implementation handoff. |
| `CF-W1-MD-02` | `cd backend` then `npm.cmd test -- market-data-readiness-evidence.invariants.test.ts market-data-storage-readiness.invariants.test.ts market-data.universe.test.ts market-data.validation.test.ts market-data.repository.test.ts --runInBand` | Blocked until ADR approval and scoped implementation. |
| `CF-W1-MD-01` | `cd backend` then focused market-data validation tests after the plan defines exact existing filenames | Docs-only QA plan gap; blocked from execution until validation policy, contract, and implementation scope exist. |

## Safe Command Discipline

Use focused backend Jest patterns only until broader test approval exists.

Do not run Playwright, services, provider tests, live providers, broad backend suites, startup/backfill, Prisma mutation commands, Angel One, or paid/cloud flows without explicit approval and resource checks.

Provider-adjacent, startup-adjacent, frontend build, backend build, UI smoke, live-provider, Prisma mutation, and broad-suite validation remain approval-gated and excluded from default QA execution.

## Current QA Blockers

- `CF-W1-L3-DQ-01`: blocked by Product Owner and Architect decision on Lane 3 display-vs-action readiness policy.
- `CF-W1-TP-01A`: blocked by Trade Plan target/no-target and DQ hard-block contract acceptance; full target geometry migration remains separate.
- `CF-W1-MD-02`: blocked from executable validation by ADR/Product/Architect approval for durable readiness evidence and Prisma/OHLC storage model.
- `CF-W1-MD-01`: safest next docs-only QA plan gap; executable validation remains blocked until validation policy and implementation scope exist.
- `CF-W1-L3-ALERT-01`: blocked by Lane 3 readiness policy and alert readiness contract.
