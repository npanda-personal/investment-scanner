# Next Validation Plans

Date: 2026-05-17

Prepared by Team 04 QA Factory and refreshed after docs-only QA plans for `CF-W1-MD-01`, `CF-W1-L3-ALERT-01`, and `CF-W1-UX-02`.

Refresh note: docs-only QA refresh. No tests, builds, services, providers, UI checks, or application source/test edits were run or modified during this refresh.

Setup authorization note: standing branch/worktree/commit/push authorization changes execution mechanics only. It does not approve app-code work, tests, builds, Prisma commands, providers, Angel One, startup/backfill, UI smoke, live services, or Ready queue movement for any candidate below.

Post-decision refresh note: Team 04 added `04-qa/post-decision-child-scenario-matrix-2026-05-17.md` after the resolved decisions for `CF-W1-L3-DQ-01`, `CF-W1-TP-01A`, and `CF-W1-MD-02` and Team 03 architecture refresh. This is planning evidence only and does not make any item app-code ready.

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

## Post-Decision Scenario Matrix Prepared

- `CF-W1-L3-DQ-01`: child scenario matrix for portfolio/watchlist passive display, alerts/action-like workflows, portfolio-intelligence reliability, and copilot/research trust handoff.
- `CF-W1-TP-01A`: backend-only scenario matrix for no-target compatibility, DQ hard blockers, `LIMITED` handling, target-shaped compatibility fields, and forbidden product-language checks.
- `CF-W1-MD-02`: ADR QA checklist for companion durable readiness/evidence storage, natural key, provenance, DQE handoff, migration/rollback, query/test strategy, and local/free constraints.

Matrix file: `04-qa/post-decision-child-scenario-matrix-2026-05-17.md`.

## Child QA Plans Prepared After Team 03 Contracts

- `CF-W1-L3-ALERT-01`: refreshed alert readiness suppression QA plan against child contract in `04-qa/CF-W1-L3-ALERT-01-qa-plan.md`.
- `CF-W1-L3-PORT-01`: portfolio/watchlist readiness DTO QA plan recorded in `04-qa/CF-W1-L3-PORT-01-qa-plan.md`.
- `CF-W1-TP-01B`: backend-only Trade Plan compatibility and DQ hard-block QA plan recorded in `04-qa/CF-W1-TP-01B-qa-plan.md`.
- `CF-W1-NOTIF-02`: notification local log redaction QA plan recorded in `04-qa/CF-W1-NOTIF-02-qa-plan.md`.

These child plans are not executable validation approval. Source/test execution still requires Team 00 Ready promotion, exact file reservations, and implementation handoff.

## Status Refresh After Setup Authorization

| Work item | QA status | What changed after setup authorization | Required next gate |
| --- | --- | --- | --- |
| `CF-W1-MD-01` | QA-blocked for executable validation | Option A policy resolved; docs-only QA plan must be refreshed before source/test execution. | Market Data validation-only implementation work packet, exact reservations, and Team 00 Ready promotion. |
| `CF-W1-L3-ALERT-01` | Child QA plan refreshed; executable validation still blocked | Team 03 prepared child contract/work packet; Team 04 refreshed alert child scenarios. | Team 00 Ready promotion, exact file reservations, and implementation handoff. |
| `CF-W1-UX-02` | QA-blocked for executable validation | Option B policy resolved as Copilot-only; UI smoke remains excluded until exact spec, startup/resource plan, and Team 00 handoff exist. | Copilot-only trust contract refresh, exact reservations, and implementation packet. |
| `CF-W1-L3-DQ-01` | Child QA scenario matrix prepared; executable validation still blocked | Product Owner accepted Option B; Team 03 refreshed architecture notes; Team 04 recorded child scenarios. This does not approve app-code or QA execution. | Child module contracts, exact reservations, and implementation handoffs. |
| `CF-W1-TP-01A` | Backend-only QA scenario matrix prepared; executable validation still blocked | Product Owner accepted Option B; Team 03 refreshed architecture notes; Team 04 recorded backend-only scenarios. This does not approve app-code or QA execution. | Accepted backend-only child packet, exact reservations, and implementation handoff. |
| `CF-W1-MD-02` | ADR QA checklist prepared; source/schema/test validation blocked | Product Owner accepted Option B as ADR direction only; Team 04 recorded ADR QA checklist. | Formal ADR before any separate Prisma/source/test slice. |
| `CF-W1-L3-PORT-01` | Child QA plan prepared; executable validation still blocked | Team 03 prepared portfolio/watchlist readiness DTO child contract and work packet; Team 04 prepared backend scenario matrix. | Team 00 must select portfolio-only, watchlist-only, or approved combined backend pass and promote exact reservations. |
| `CF-W1-TP-01B` | Child QA plan prepared; executable validation still blocked | Team 03 prepared backend-only Trade Plan child contract and work packet; Team 04 prepared scenario matrix. | Team 00 Ready promotion, exact Trade Plan file reservations, and implementation handoff. |
| `CF-W1-NOTIF-02` | Focused QA plan prepared; executable validation still blocked | Requirement, architecture review, contract, and work packet exist; Team 04 recorded provider redaction scenarios. | Team 00 or Team 09 Ready promotion, exact notification file reservations, and implementation handoff. |

## Remaining Next QA Plans

1. `CF-W1-UX-05`: Copilot-only research-support copy QA checklist after Option A packet refresh; shared-file reservation remains future.
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
| `CF-W1-MD-01` | `cd backend` then `npm.cmd test -- market-data.validation.test.ts --runInBand` | Plan prepared; blocked from execution until Option A QA refresh and implementation handoff exist. |
| `CF-W1-MD-01` | `cd backend` then `npm.cmd test -- market-data.validation.test.ts market-data-readiness-evidence.invariants.test.ts market-data.repository.test.ts --runInBand` | Approval-gated only if duplicate/readiness evidence or repository behavior is touched. |
| `CF-W1-L3-ALERT-01` | `cd backend` then `npm.cmd test -- alerts-monitoring.service.test.ts alerts-monitoring.validation.test.ts --runInBand` | Plan prepared; blocked until `CF-W1-L3-DQ-01`, alert readiness contract, and implementation handoff. |
| `CF-W1-L3-ALERT-01` | `cd backend` then `npm.cmd test -- alerts-monitoring.service.test.ts alerts-monitoring.ownership.test.ts alerts-monitoring.routes.test.ts --runInBand` | Approval-gated regression if alert event listing, mutation, or parent rule ownership is touched. |
| `CF-W1-UX-02` | `cd backend` then `npm.cmd test -- ai-investment-copilot.service.test.ts ai-investment-copilot.validation.test.ts ai-investment-copilot.routes.test.ts --runInBand` | Plan prepared; blocked until Copilot-only trust contract refresh and implementation handoff. |
| `CF-W1-UX-02` | `cd frontend` then `npm.cmd run test:ui -- ai-investment-copilot.spec.ts --workers=1` | Approval-gated only after UI implementation, local app startup plan, memory/resource check, and exact UI spec exists. Current spec is absent. |

## Safe Command Discipline

Use focused backend Jest patterns only after the relevant candidate has an accepted policy/contract, scoped implementation handoff, and Team 00 approval to validate.

Do not run Playwright, UI smoke, dev servers, live services, provider tests, live providers, broad backend suites, startup/backfill, Prisma mutation commands, Angel One, or paid/cloud flows without explicit approval and resource checks.

Provider-adjacent, startup-adjacent, frontend build, backend build, UI smoke, live-provider, Prisma mutation, and broad-suite validation remain approval-gated and excluded from default QA execution.

## Current QA Blockers

- `CF-W1-L3-DQ-01`: blocked from executable validation until child contracts, exact file reservations, and implementation handoff exist.
- `CF-W1-TP-01A`: blocked from executable validation until backend-only child packet, exact file reservations, and implementation handoff exist; full target geometry migration remains separate.
- `CF-W1-MD-02`: blocked from executable validation because Option B is ADR direction only; formal ADR and source/schema/test work need separate approval.
- `CF-W1-MD-01`: executable validation remains blocked until Option A QA refresh, exact validation source/test reservations, and implementation scope exist.
- `CF-W1-L3-ALERT-01`: child QA plan is refreshed; blocked until Team 00 Ready promotion, exact reservations, and implementation handoff.
- `CF-W1-L3-PORT-01`: child QA plan is prepared; blocked until Team 00 selects portfolio/watchlist split and promotes exact reservations.
- `CF-W1-TP-01B`: child QA plan is prepared; blocked until Team 00 Ready promotion and exact backend-only implementation handoff.
- `CF-W1-NOTIF-02`: focused QA plan is prepared; blocked until Team 00/Team 09 Ready promotion and exact notification provider/test/doc reservation.
- `CF-W1-UX-02`: executable validation remains blocked until Copilot-only trust-field contract refresh, exact file reservations, and implementation handoff.
- `CF-W1-AUTH-01`: executable validation remains blocked until Option A platform QA refresh, exact controller/test reservations, and implementation handoff.
- `CF-W1-SUB-01`: executable validation remains blocked until Option A platform QA refresh, exact backend reservations, and implementation handoff.
