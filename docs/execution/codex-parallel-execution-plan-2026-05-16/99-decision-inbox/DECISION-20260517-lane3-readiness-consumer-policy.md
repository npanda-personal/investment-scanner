# Decision Needed

Decide the Lane 3 readiness consumer policy for passive display, reliability labels, alerts, and action-like workflows.

# Context

Teams 02, 03, and 04 refined `CF-W1-L3-DQ-01` and confirmed it is not implementation-ready until Product Owner and Architect decide how Lane 3 consumers should treat `READY`, `LIMITED`, blocked, stale, missing, and unsupported Data Quality states.

# Affected Workstream

Workstream: `CF-W1-L3-DQ-01`  
Module/lane: Lane 3 Portfolio / Watchlists / Alerts / Portfolio Intelligence / Copilot consumers  
Lane: Lane 3 readiness consumer policy

# Affected Files

No source files may be modified until this decision is resolved.

Future child slices may reserve one module at a time:

- `backend/src/modules/portfolio-management/**`
- `backend/tests/modules/portfolio-management/**`
- `backend/src/modules/watchlist-management/**`
- `backend/tests/modules/watchlist-management/**`
- `backend/src/modules/alerts-monitoring/**`
- `backend/tests/modules/alerts-monitoring/**`
- `backend/src/modules/portfolio-intelligence/**`
- `backend/tests/modules/portfolio-intelligence/**`
- exact UX/frontend files only after separate UX approval

# Evidence Inspected

- `06-contracts/CF-W1-L3-DQ-01-lane3-readiness-consumer-policy-contract.md`
- `03-architecture/CF-W1-L3-DQ-01-architecture-review.md`
- `04-qa/CF-W1-L3-DQ-01-qa-plan.md`
- `08-work-packets/CF-W1-L3-DQ-01-work-packet.md`
- `10-requirements/CF-W1-L3-DQ-01-lane-3-readiness-consumer-policy-requirement.md`
- `17-team-outboxes/TEAM-02-requirement-factory.md`
- `17-team-outboxes/TEAM-03-architecture-factory.md`
- `17-team-outboxes/TEAM-04-qa-factory.md`

# Options

Option A: Strict READY-only policy.

Only `READY` data may appear in trusted Lane 3 views. `LIMITED`, stale, missing, blocked, unsupported, and scope-mismatch states render blocked or empty states.

Option B: Passive LIMITED display with action-like blocking.

`READY` supports trusted display and action-like workflows. `LIMITED` may appear only in passive portfolio/watchlist/research context with visible warning, reasons, and no reliability/action labels. Alerts, action-like workflows, reliability labels, and trusted summaries require `READY`. Missing, stale hard blockers, unsupported, `NOT_READY`, and `UNUSABLE` remain blocked.

Option C: Limited action exception.

Allow selected `LIMITED` data to produce alert/action-like states with warnings.

# Codex Recommendation

Option B.

# Risk If Approved

`LIMITED` data may still appear in passive contexts, so UX copy and DTO evidence must make untrusted/limited status clear. Child slices must not overclaim reliability.

# Risk If Rejected

Lane 3 implementation remains blocked, and portfolio/watchlist/alerts/copilot trust handling cannot progress beyond docs.

# Impact On Parallel Work

Affected Lane 3 readiness implementation waits. Unrelated Market Data validation policy, Trade Plan contract prep, UX copy inventory, audits, and QA planning can continue.

# Exact Consent Needed

Product Owner: approve Option A, B, C, or another exact policy for `READY`, `LIMITED`, missing, stale, unsupported, `NOT_READY`, and `UNUSABLE` states in Lane 3 passive display versus action-like workflows.

Architect: approve whether the chosen policy can be implemented as module-local child slices without Prisma, route registry, shared utility, shared UI, package, generated, provider, startup, or live-provider changes.

QA: approve that focused module tests can validate the chosen policy without broad/provider/live/UI execution.

# Safe Next Step If No Decision Yet

Keep `CF-W1-L3-DQ-01`, `CF-W1-L3-ALERT-01`, portfolio/watchlist readiness DTOs, portfolio-intelligence reliability gates, and copilot Lane 3 trust consumers out of Ready for Implementation. Continue unrelated audits, requirement refinement, architecture prep, and QA planning.
