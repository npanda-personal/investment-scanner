# TEAM-02 Requirement Factory Outbox

Date: 2026-05-17

Mode: docs-only requirement backlog refresh for daemon cycle; no application source, tests, architecture docs, QA docs, ready queues, active board, risk register, or decision inbox files changed.

## Work Item

Continue requirement refinement for the daemon cycle using root `AGENTS.md` as authoritative instruction and treating `docs/codex-agent-team-plan/**` as historical evidence only.

## State / Owner

- Owner: Team 02 Requirement Factory
- Active surface: `10-requirements/`
- Current state: completed docs-only refresh after current-evidence cross-check
- Implementation state: no application-code item moved to Ready for Implementation

## Exact Outputs

- Refreshed requirement status around:
  - `CF-W1-L3-DQ-01`
  - `CF-W1-TP-01A`
  - `CF-W1-MD-02`
- Confirmed all three remain refinement/architecture-prep only and must not be marked Ready by Team 02.
- Identified the current five next architecture/QA prep candidates:
  - `CF-W1-L3-DQ-01`
  - `CF-W1-TP-01A`
  - `CF-W1-MD-02`
  - `CF-W1-MD-01`
  - `CF-W1-UX-02`
- Moved `CF-W1-L3-ALERT-01` behind its parent Lane 3 readiness policy dependency in top-candidate ordering.
- Kept `CF-W1-UX-05` in refinement but behind `CF-W1-UX-02` because the copy checklist/shared UI reservation path is less mature.
- Clarified that current contract/QA plans for the priority items are drafts, QA plans, or ADR prep artifacts, not implementation approval.
- Clarified that future true consent blockers found by Team 02 should be recorded in this outbox and routed by Team 00, not opened directly by Team 02 under the current write scope.
- Preserved `CF-W1-L3-AUTH-02` and `CF-W1-SIG-TRIGGER-01` as completed bounded slices, not active blockers.

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/active-work-board.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/risk-register.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/next-contracts-to-prepare.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/next-validation-plans.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-L3-DQ-01-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-TP-01A-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-MD-02-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-DQ-01-lane3-readiness-consumer-policy-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-TP-01A-trade-plan-no-target-dq-hard-block-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-MD-02-durable-readiness-evidence-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-L3-DQ-01-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-TP-01A-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-MD-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/09-summaries/daemon-cycle-latest.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-market-data-data-quality.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-strategy-signal-rules.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-backtesting-trade-risk.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-portfolio-watchlist-alerts.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-ux-research-copilot.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-platform-auth-subscription-notifications.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-qa-test-infrastructure.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/blocked-by-decision.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/blocked-by-shared-file.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/blocked-by-upstream-dependency.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory-daemon-2026-05-17-iteration-4.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory-daemon-2026-05-17-iteration-4.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory-daemon-2026-05-17-iteration-4.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/99-decision-inbox/open-decisions.md`

## Behavior / Contract Changes

- Behavior changed: none.
- Application code changed: none.
- Tests changed: none.
- Prisma, route registries, packages, generated files, shared utilities/UI changed: none.
- Contract changed: no active contract file changed. Requirement queues now more precisely describe draft contract, draft QA, policy-decision, and ADR status for the focused priority items.

## Implementation Readiness

No current priority item is implementation-ready.

| ID | Readiness result |
| --- | --- |
| CF-W1-L3-DQ-01 | Requirement, draft contract, and draft QA plan exist; Product/Architect display-vs-action policy and child file reservations are missing. |
| CF-W1-TP-01A | Requirement, draft contract, and draft QA plan exist; Product/Architect no-target replacement, DQ hard-block semantics, compatibility scope, and file reservations are missing. |
| CF-W1-MD-02 | Requirement, draft contract, and ADR QA plan exist; ADR/storage model/natural key approval and future source/schema packet are missing. |

## Refined Candidates

| Rank | ID | Refinement result |
| --- | --- | --- |
| 1 | CF-W1-L3-DQ-01 | Keep as Product/Architect/QA refinement; highest unblock value for Lane 3 display-only versus action-like readiness behavior. |
| 2 | CF-W1-TP-01A | Keep as Product/Architect/QA refinement; Strategy Decision no-target slice is complete, but Trade Plan target geometry and DQ hard-block semantics remain separate. |
| 3 | CF-W1-MD-02 | Keep as ADR/decision prep only; source/schema/provider/startup/test execution remains blocked. |
| 4 | CF-W1-MD-01 | Move toward validation-policy/QA refinement only; executable Market Data validation work remains blocked until policy and handoff. |
| 5 | CF-W1-UX-02 | Move toward Product/UX/Architecture/QA refinement only; no UI/backend/shared-file work until naming, trust fields, blocked states, and reservations are accepted. |

## Blockers

- `CF-W1-L3-DQ-01`: Product/Architect Lane 3 display-vs-action readiness policy is not accepted.
- `CF-W1-TP-01A`: Product/Architect Trade Plan no-target replacement and DQ hard-block policy are not accepted.
- `CF-W1-MD-02`: Product/Architect storage model, natural key, and Prisma impact decision are not accepted.
- `CF-W1-MD-02`: source/schema/test/provider/startup/backfill work remains blocked.
- `CF-W1-L3-ALERT-01`: still blocked by `CF-W1-L3-DQ-01`, even though `CF-W1-L3-AUTH-02` is completed.

## Recommended Decision Packets

Product-policy ambiguity was found. Team 02 did not modify the Decision Inbox under this write scope. Team 00 should route decision packets if it wants formal Product Owner review.

| ID | Recommended Team 00 packet | Decision needed |
| --- | --- | --- |
| CF-W1-L3-DQ-01 | Lane 3 readiness display-vs-action policy | Whether limited data may display while alerting, reliability claims, and action-like states remain blocked. |
| CF-W1-TP-01A | Trade Plan no-target replacement and DQ hard-block policy | What replaces target-price geometry and how `LIMITED`, `NOT_READY`, stale, missing, or blocker DQ states affect paper-review readiness. |
| CF-W1-MD-02 | Durable readiness evidence storage ADR | Which storage model, natural key, Prisma impact, migration/rollback path, and query/test strategy are accepted before source work. |

## Stale Completed Item Check

No stale completed bounded slices remain in the active top-ready pull path after this refresh. `CF-W1-L3-AUTH-01`, `CF-W1-L3-AUTH-02`, `CF-W1-SIG-TRIGGER-01`, `CF-W2-DQ-01`, `CF-W2-SIG-01A`, `CF-W1-SIG-01B`, `CF-W1-SIG-LATEST-01`, `CF-W1-STRAT-01`, and `CF-W1-QA-01` remain completed/split/superseded and must not be pulled as active implementation work.

## Tests / Services

- Tests run: none.
- Builds run: none.
- UI checks run: none.
- Live local data checks run: none.
- Services/providers/Prisma commands run: none.
- Skipped reason: task was docs-only and explicitly prohibited tests, providers, services, and app-code work.

## Assumptions

- `docs/AGENTS.md` remains absent/neutralized; root `AGENTS.md` is authoritative.
- `docs/codex-agent-team-plan/**` remains historical evidence only and was not modified.
- `12-ready-queue/ready-for-implementation.md` remains the implementation-readiness source of truth.

## Next Recommendations

1. Team 03 should prepare `CF-W1-L3-DQ-01` policy options first because it unblocks multiple Lane 3 downstream items.
2. Team 03 and Team 04 should keep `CF-W1-TP-01A` in contract/QA refinement until Product Owner and Architect decide no-target replacement semantics and DQ hard-block states.
3. Team 03 should prepare `CF-W1-MD-02` ADR option matrix; Team 04 should align the ADR QA checklist before any Prisma/source/test reservation is proposed.
4. Team 00 should route the three recommended decision packets above if formal Product Owner consent is needed before Team 03 continues.
5. Team 00 should keep `12-ready-queue/ready-for-implementation.md` empty for app-code work until it records accepted contracts, QA plans, exact reservations, and no blockers.
