# Resolution Status

Status: Resolved by Product Owner on 2026-05-17.

Approved option: Option B, backend-only compatibility direction.

Resolution record: `07-decisions/DECISION-20260517-trade-plan-no-target-dq-hard-block-resolution.md`

This item is no longer open in `open-decisions.md`. The parent Decision Inbox blocker is resolved, but app-code child slices still require a refreshed backend-only work packet, QA scenarios, exact file reservations, and implementation handoff.

# Decision Needed

Decide the Trade Plan no-target compatibility and Data Quality hard-block policy before source changes to `trade-plan-risk-engine`.

# Context

`CF-W1-STRAT-01` resolved Strategy Decision target semantics only. Teams 02, 03, and 04 confirmed Trade Plan remains separate because its current target geometry, paper-readiness, stored-row interpretation, Today Review adjacency, and frontend/API compatibility are still unresolved.

# Affected Workstream

Workstream: `CF-W1-TP-01A`  
Module: `trade-plan-risk-engine`  
Lane: Strategy / Signal / Risk

# Affected Files

No source files may be modified until this decision is resolved.

Potential future backend-only child reservation after approval:

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.geometry.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository.ts` only if persisted/read compatibility changes are accepted
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository.test.ts` only if repository behavior changes
- `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`

Frontend and Today Review files require separate explicit child-slice approval.

# Evidence Inspected

- `06-contracts/CF-W1-TP-01A-trade-plan-no-target-dq-hard-block-contract.md`
- `03-architecture/CF-W1-TP-01A-architecture-review.md`
- `04-qa/CF-W1-TP-01A-qa-plan.md`
- `08-work-packets/CF-W1-TP-01A-work-packet.md`
- `10-requirements/CF-W1-TP-01A-trade-plan-no-target-compatibility-dq-hard-block-requirement.md`
- `17-team-outboxes/TEAM-02-requirement-factory.md`
- `17-team-outboxes/TEAM-03-architecture-factory.md`
- `17-team-outboxes/TEAM-04-qa-factory.md`

# Options

Option A: Remove or rename Trade Plan target fields now.

This best matches no-target product direction but likely requires API/UI/stored-data compatibility work and is not safe as a bounded backend-only slice.

Option B: Backend-only compatibility slice.

Keep existing target-shaped fields as compatibility-only for now, prevent them from contributing to trusted paper-readiness, replace trusted output language with rule-based exit/invalidation/risk-review wording, hard-block missing or blocked DQ states, and treat `LIMITED` as blocked or limited-review-only until explicitly narrowed.

Option C: Defer Trade Plan source changes.

Keep Trade Plan blocked until a larger API/UI/stored-data migration is designed.

# Codex Recommendation

Option B.

# Risk If Approved

Compatibility fields can still be misunderstood if downstream UI or Today Review surfaces continue old labels. The first child slice must document limitations and avoid claiming full Trade Plan target migration.

# Risk If Rejected

Trade Plan remains blocked, and downstream paper-review readiness cannot be trusted against no-target and Data Quality requirements.

# Impact On Parallel Work

Only Trade Plan no-target/DQ implementation waits. Strategy Decision remains completed. Market Data, Lane 3 readiness policy, UX trust planning, and QA planning can continue.

# Exact Consent Needed

Product Owner: approve Option A, B, C, or another exact replacement for Trade Plan target geometry, paper-readiness wording, and `LIMITED` Data Quality behavior.

Architect: approve whether a backend-only compatibility slice can avoid Prisma, route registry, shared utility, shared UI, package, generated type, frontend, Today Review, provider, startup, and live-provider changes.

QA: approve focused Trade Plan tests for no-target wording, DQ hard-blocks, compatibility limitations, and absence of advice language.

# Safe Next Step If No Decision Yet

Keep `CF-W1-TP-01A` and broader `CF-W1-TP-01` out of Ready for Implementation. Continue docs-only contract, QA, and requirement refinement.
