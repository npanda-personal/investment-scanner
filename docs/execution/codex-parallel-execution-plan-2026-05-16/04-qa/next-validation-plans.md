# Next Validation Plans

Date: 2026-05-17

Prepared by Team 04 QA Factory and refreshed after docs-only QA plans for `CF-W1-MD-01`, `CF-W1-L3-ALERT-01`, and `CF-W1-UX-02`.

Refresh note: docs-only QA refresh. No tests, builds, services, providers, UI checks, or application source/test edits were run or modified during this refresh.

Setup authorization note: standing branch/worktree/commit/push authorization changes execution mechanics only. It does not approve app-code work, tests, builds, Prisma commands, providers, Angel One, startup/backfill, UI smoke, live services, or Ready queue movement for any candidate below.

## Completed QA Planning / Evidence

- `CF-W1-QA-01` focused command matrix is recorded in `04-qa/CF-W1-QA-01-focused-test-command-matrix.md`.
- `CF-W1-L3-AUTH-01` portfolio/watchlist child-resource ownership is completed and committed in `74ba6dd`; QA evidence recorded in `04-qa/CF-W1-L3-AUTH-01-qa-evidence.md`.
- `CF-W1-L3-AUTH-02` alert event ownership is completed and committed in `503bcd9`; QA evidence recorded in `04-qa/CF-W1-L3-AUTH-02-qa-evidence.md`.
- `CF-W1-SIG-TRIGGER-01` optional trigger DTO projection is completed and committed in `6ab3999`; QA evidence recorded in `04-qa/CF-W1-SIG-TRIGGER-01-qa-evidence.md`.

## Priority QA Plans Prepared

1. `CF-W1-L3-DQ-01`: Lane 3 readiness consumer policy plan recorded in `04-qa/CF-W1-L3-DQ-01-qa-plan.md`.
2. `CF-W1-TP-01A`: Trade Plan no-target compatibility and DQ hard-block plan recorded in `04-qa/CF-W1-TP-01A-qa-plan.md`.
3. `CF-W1-MD-02`: durable Market Data readiness evidence ADR QA plan recorded in `04-qa/CF-W1-MD-02-qa-plan.md`.
4. `CF-W1-MD-01`: Market Data validation hardening QA plan recorded in `04-qa/CF-W1-MD-01-qa-plan.md`.
5. `CF-W1-L3-ALERT-01`: alert readiness suppression QA plan recorded in `04-qa/CF-W1-L3-ALERT-01-qa-plan.md`.
6. `CF-W1-UX-02`: Copilot trust UX QA plan recorded in `04-qa/CF-W1-UX-02-qa-plan.md`.

## Status Refresh After Setup Authorization

| Work item | QA status | What changed after setup authorization | Required next gate |
| --- | --- | --- | --- |
| `CF-W1-MD-01` | QA-blocked for executable validation | No status change; docs-only QA plan remains usable for future policy review. | Product/Architect validation policy and implementation work packet. |
| `CF-W1-L3-ALERT-01` | QA-blocked by missing child contract | Parent Lane 3 Option B policy is accepted; alert readiness suppression still needs child contract and implementation handoff. | Architecture contract/work packet for alert readiness suppression. |
| `CF-W1-UX-02` | QA-blocked by Product/UX/Architecture decisions | No status change; UI smoke remains excluded until approved UI scope and spec exist. | Product/UX/Architect trust contract and implementation packet. |
| `CF-W1-L3-DQ-01` | Can proceed only to child architecture/QA refresh | Product Owner accepted Option B, but this does not approve app-code or QA execution. | Child module contracts, exact reservations, and scenario matrix. |
| `CF-W1-TP-01A` | Can proceed only to backend-only architecture/QA refresh | Product Owner accepted Option B, but this does not approve app-code or QA execution. | Backend-only child packet, exact reservations, and scenario matrix. |
| `CF-W1-MD-02` | Can proceed only to formal ADR and ADR QA checklist | Product Owner accepted Option B as ADR direction only, not schema/source/test execution. | Formal ADR before any separate Prisma/source/test slice. |

## Remaining Next QA Plans

1. `CF-W1-UX-05`: research-support copy QA checklist after Product/UX copy policy and shared-file reservation decisions.
2. `CF-W1-BT-01`: backtesting DQ fail-closed characterization after upstream readiness policy and backtest use-case policy.
3. `CF-W1-MD-03`: Market Data signoff threshold contract tests after signoff threshold policy and implementation scope are accepted.

## Focused Command Guidance

Commands below are guidance only. They were not run during this documentation-only planning task.

| Work item | Focused command | Current status |
| --- | --- | --- |
| `CF-W1-L3-AUTH-01` | `cd backend` then `npm.cmd test -- portfolio-management.service.test.ts portfolio-management.ownership.test.ts watchlist-management.service.test.ts watchlist-management.ownership.test.ts --runInBand` | Completed and committed in `74ba6dd`; keep as regression focus for future Lane 3 ownership edits. |
| `CF-W1-L3-AUTH-02` | `cd backend` then `npm.cmd test -- alerts-monitoring.service.test.ts alerts-monitoring.ownership.test.ts alerts-monitoring.routes.test.ts --runInBand` | Completed and committed in `503bcd9`; keep as regression focus for future Alerts Monitoring ownership edits. |
| `CF-W1-SIG-TRIGGER-01` | `cd backend` then `npm.cmd test -- signal-generation-engine.service.test.ts signal-generation-engine.trigger-contract.test.ts signal-generation-engine.validation.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand` | Completed and committed in `6ab3999`; keep as regression focus for future Signal Generation DTO changes. |
| `CF-W1-L3-DQ-01` | `cd backend` then `npm.cmd test -- data-quality-engine.service.test.ts data-quality-engine.invariants.test.ts --runInBand` | Blocked until child implementation handoff. |
| `CF-W1-L3-DQ-01` | `cd backend` then `npm.cmd test -- portfolio-management.service.test.ts watchlist-management.service.test.ts portfolio-intelligence.service.test.ts --runInBand` | Blocked until corresponding Lane 3 consumer implementation. |
| `CF-W1-L3-DQ-01` | `cd backend` then `npm.cmd test -- alerts-monitoring.service.test.ts alerts-monitoring.routes.test.ts alerts-monitoring.validation.test.ts --runInBand` | Blocked until alert readiness contract and implementation. |
| `CF-W1-TP-01A` | `cd backend` then `npm.cmd test -- trade-plan-risk-engine.service.test.ts trade-plan-risk-engine.paper-readiness.test.ts --runInBand` | Blocked until backend-only child implementation handoff. |
| `CF-W1-MD-02` | `cd backend` then `npm.cmd test -- market-data-readiness-evidence.invariants.test.ts market-data-storage-readiness.invariants.test.ts market-data.universe.test.ts market-data.validation.test.ts market-data.repository.test.ts --runInBand` | Blocked until separate approved scoped implementation. |
| `CF-W1-MD-01` | `cd backend` then `npm.cmd test -- market-data.validation.test.ts --runInBand` | Plan prepared; blocked from execution until validation policy and implementation handoff exist. |
| `CF-W1-MD-01` | `cd backend` then `npm.cmd test -- market-data.validation.test.ts market-data-readiness-evidence.invariants.test.ts market-data.repository.test.ts --runInBand` | Approval-gated only if duplicate/readiness evidence or repository behavior is touched. |
| `CF-W1-L3-ALERT-01` | `cd backend` then `npm.cmd test -- alerts-monitoring.service.test.ts alerts-monitoring.validation.test.ts --runInBand` | Plan prepared; blocked until `CF-W1-L3-DQ-01`, alert readiness contract, and implementation handoff. |
| `CF-W1-L3-ALERT-01` | `cd backend` then `npm.cmd test -- alerts-monitoring.service.test.ts alerts-monitoring.ownership.test.ts alerts-monitoring.routes.test.ts --runInBand` | Approval-gated regression if alert event listing, mutation, or parent rule ownership is touched. |
| `CF-W1-UX-02` | `cd backend` then `npm.cmd test -- ai-investment-copilot.service.test.ts ai-investment-copilot.validation.test.ts ai-investment-copilot.routes.test.ts --runInBand` | Plan prepared; blocked until Product/UX/Architect trust contract and implementation handoff. |
| `CF-W1-UX-02` | `cd frontend` then `npm.cmd run test:ui -- ai-investment-copilot.spec.ts --workers=1` | Approval-gated only after UI implementation, local app startup plan, memory/resource check, and exact UI spec exists. Current spec is absent. |

## Safe Command Discipline

Use focused backend Jest patterns only after the relevant candidate has an accepted policy/contract, scoped implementation handoff, and Team 00 approval to validate.

Do not run Playwright, UI smoke, dev servers, live services, provider tests, live providers, broad backend suites, startup/backfill, Prisma mutation commands, Angel One, or paid/cloud flows without explicit approval and resource checks.

Provider-adjacent, startup-adjacent, frontend build, backend build, UI smoke, live-provider, Prisma mutation, and broad-suite validation remain approval-gated and excluded from default QA execution.

## Current QA Blockers

- `CF-W1-L3-DQ-01`: blocked from executable validation until child contracts, exact file reservations, and implementation handoff exist.
- `CF-W1-TP-01A`: blocked from executable validation until backend-only child packet, exact file reservations, and implementation handoff exist; full target geometry migration remains separate.
- `CF-W1-MD-02`: blocked from executable validation because Option B is ADR direction only; source/schema/test work needs separate approval.
- `CF-W1-MD-01`: executable validation remains blocked until future-date, adjusted-close, suspicious-volume, and spike policy are accepted and implementation scope exists.
- `CF-W1-L3-ALERT-01`: blocked by Lane 3 readiness policy, alert readiness contract, and implementation handoff.
- `CF-W1-UX-02`: blocked by Copilot naming/trust-field/blocked-state decisions, shared-file reservation if needed, and implementation handoff.
