# TEAM-02 Requirement Factory Outbox

Date: 2026-05-17

Mode: docs-only requirement backlog refresh for daemon cycle.

## Work Item

Continue requirement refinement for the daemon cycle using root `AGENTS.md` as authoritative instruction and treating `docs/codex-agent-team-plan/**` as historical evidence only.

## State / Owner

- Owner: Team 02 Requirement Factory
- Active surface: `10-requirements/`
- Current state: completed docs-only refresh
- Implementation state: no application-code item moved to Ready for Implementation

## Exact Outputs

- Refreshed priority order around:
  - `CF-W1-L3-DQ-01`
  - `CF-W1-TP-01A`
  - `CF-W1-MD-02`
- Added a current priority Ready-criteria check to the backlog.
- Updated next-candidate ranking so `CF-W1-MD-02` is explicitly in the current top-three prep focus.
- Clarified that current contract/QA plans for the priority items are drafts or ADR prep artifacts, not implementation approval.
- Clarified that future true consent blockers found by Team 02 should be recorded in this outbox and routed by Team 00, not opened directly by Team 02 under the current write scope.
- Preserved `CF-W1-L3-AUTH-02` and `CF-W1-SIG-TRIGGER-01` as completed bounded slices, not active blockers.

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/active-work-board.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/next-contracts-to-prepare.md`
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
- Contract changed: no active contract file changed. Requirement queues now more precisely describe draft contract and draft QA status for the focused priority items.

## Implementation Readiness

No current priority item is implementation-ready.

| ID | Readiness result |
| --- | --- |
| CF-W1-L3-DQ-01 | Requirement, draft contract, and draft QA plan exist; Product/Architect display-vs-action policy and child file reservations are missing. |
| CF-W1-TP-01A | Requirement, draft contract, and draft QA plan exist; Product/Architect no-target replacement, DQ hard-block semantics, compatibility scope, and file reservations are missing. |
| CF-W1-MD-02 | Requirement, draft contract, and ADR QA plan exist; ADR/storage model/natural key approval and future source/schema packet are missing. |

## Blockers

- `CF-W1-L3-DQ-01`: Product/Architect Lane 3 display-vs-action readiness policy is not accepted.
- `CF-W1-TP-01A`: Product/Architect Trade Plan no-target replacement and DQ hard-block policy are not accepted.
- `CF-W1-MD-02`: Product/Architect storage model, natural key, and Prisma impact decision are not accepted.
- `CF-W1-MD-02`: source/schema/test/provider/startup/backfill work remains blocked.
- `CF-W1-L3-ALERT-01`: still blocked by `CF-W1-L3-DQ-01`, even though `CF-W1-L3-AUTH-02` is completed.

## Out-of-Scope Stale Reference

`10-requirements/top-10-ready-candidates.md` still contains stale rows that describe `CF-W1-L3-AUTH-02` and `CF-W1-SIG-TRIGGER-01` as blocked by Decision Inbox items. That file was not in Team 02's allowed write scope for this task, so it was not changed. Team 00 should either reserve that file for cleanup or confirm that `next-top-10-candidates.md` and `12-ready-queue/ready-for-implementation.md` are the authoritative current queues.

## Out-of-Scope Worktree Note

Verification showed additional modified or untracked Team 04 QA files outside this task's write scope. Team 02 did not inspect deeply, edit, revert, stage, or overwrite those files.

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
4. Team 00 should route any true consent blockers that arise from these prep outputs.
