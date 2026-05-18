# TEAM-02 Current Assignment

Date: 2026-05-18

Team: TEAM-02 - Requirement Factory

Prompt file: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-02-requirement-factory.md`

## Assignment

Keep backlog, refinement queue, and top candidates current. Convert audit findings into bounded requirements without moving application-code items to Ready.

Current priority after Team 01 audit consumption:

1. Refine `CF-W1-L3-PORT-01A` as the first portfolio-only readiness DTO child candidate.
2. Refine `CF-W1-TP-01B` as the backend-only Trade Plan DQ hard-block / target-compatibility candidate.
3. Refine `CF-W1-NOTIF-02` as a provider/service-doc notification log redaction candidate.
4. Refine `CF-W1-L3-ALERT-01` as an alert readiness suppression candidate, still behind explicit Team 00 promotion.
5. Keep `CF-W1-L3-INTEL-01` dependent on accepted `CF-W1-L3-PORT-01A`; do not frame it as independently Ready.
6. Refresh `CF-W1-AUTH-01`, `CF-W1-SUB-01`, `CF-W1-UX-02`, `CF-W1-UX-05`, and `CF-W1-MD-01` from decision-blocked to post-decision refinement. Do not mark them Ready.

Do not move any application-code item to Ready. Team 00 owns Ready queue movement.

## Scope

Allowed writes:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02*.md`

Coordinate with Team 00 before editing `99-decision-inbox/open-decisions.md`.

Forbidden writes:

- application source or tests
- high-risk/shared files
- historical `docs/codex-agent-team-plan/**`

## Branch / Worktree

Use shared `dev` for docs-only refinement. No implementation worktree is authorized.

## Blockers

Do not duplicate existing Decision Packets. Report any new true consent blocker to Team 00.

Decision reconciliation:

- No open decisions remain.
- Product Owner action is not required.
- The five former Decision Inbox items are policy-resolved but still need requirement/contract/QA/reservation refresh before source/test work.

## Expected Outbox

Update `17-team-outboxes/TEAM-02-requirement-factory.md` with queue deltas and Ready-depth evidence.

---

# Latest Standing Assignment

Date: 2026-05-18

## Assignment

Continue as the persistent PO + Requirements value-discovery lane.

Do not wait for Team 00 to feed one requirement at a time. Audit the next highest user-value investor/trader workflow, propose bounded requirements, and reorder the top candidate stack from highest user value to lowest after each cycle.

## Current Inputs

- `CF-W1-STRAT-02` has been drafted and routed to Team 03 architecture prep.
- `CF-W1-SQLAB-01` is active implementation in Team 06.
- `CF-W1-SQLAB-02` architecture split is complete; no-schema child needs QA planning, durable storage child is blocked.
- Accepted branch commits remain parked for later clean integration; do not treat parked commits as merged into `dev`.

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`

## Required Output

- Add or refine at least one high-user-value requirement candidate.
- Keep `next-top-10-candidates.md`, `top-10-ready-candidates.md`, `refinement-queue.md`, and `requirements-backlog.md` consistent.
- Do not move any application-code item to Ready.
- Identify the next top unassigned item for Team 00 after the cycle.

---

# Latest Standing Assignment

Date: 2026-05-18

## Assignment

Continue persistent PO + Requirements discovery on a distinct unassigned workflow.

Already actively routed or recently completed:

- `CF-W1-SQLAB-01`: active rework / QA rerun path.
- `CF-W1-SQLAB-02A`: requirement split and QA planning complete; implementation sequencing blocked behind SQLAB-01.
- `CF-W1-STRAT-02A`: architecture complete; QA planning active.
- `CF-W1-BT-02`: routed to Team 03 architecture prep.
- `CF-W1-L3-WATCH-01`: refined in the prior Team 02 cycle.

Pick a different under-served workflow or module from the backlog/audits, then add/refine one bounded user-value requirement if evidence supports it.

## Required Output

- Requirement(s) created or refined.
- Queue deltas in backlog/refinement/top-candidate docs.
- Next top unassigned item excluding actively routed items above.
- No Ready movement.

---

# Latest Standing Assignment

Date: 2026-05-18

## Assignment

Continue persistent PO + Requirements discovery on a distinct unassigned workflow.

Already actively routed or recently completed:

- `CF-W1-SQLAB-01`: accepted and locally committed on Team 06 branch.
- `CF-W1-SQLAB-02A`: requirement split and QA planning complete; implementation sequencing blocked behind SQLAB-01 integration.
- `CF-W1-STRAT-02A`: architecture and QA planning complete; Team 00 Ready evaluation pending.
- `CF-W1-BT-02`: architecture and QA planning complete but Team 02 narrowed the requirement after those packets; packet refresh needed before Ready.
- `CF-W1-DQ-02`: architecture complete as split-required; DQ-02A QA planning active.
- `CF-W1-L3-INTEL-03`: routed to Team 03 architecture prep.
- `CF-W1-L3-WATCH-01`: recently refined.

Pick a different under-served workflow or module from the backlog/audits, then add/refine one bounded user-value requirement if evidence supports it.

## Required Output

- Requirement(s) created or refined.
- Queue deltas in backlog/refinement/top-candidate docs.
- Next top unassigned item excluding actively routed items above.
- No Ready movement.

---

# Latest Standing Assignment

Date: 2026-05-18

## Assignment

Continue persistent PO + Requirements discovery on a distinct unassigned workflow.

Already actively routed or recently completed:

- `CF-W1-SQLAB-01`: Architect Signoff active after QA/review acceptance.
- `CF-W1-SQLAB-02A`: requirement split and QA planning complete; implementation sequencing blocked behind SQLAB-01.
- `CF-W1-STRAT-02A`: architecture and QA planning complete; Team 00 Ready evaluation pending.
- `CF-W1-BT-02`: architecture complete and QA planning active.
- `CF-W1-DQ-02`: routed to Team 03 architecture prep.
- `CF-W1-L3-WATCH-01`: recently refined.

Pick a different under-served workflow or module from the backlog/audits, then add/refine one bounded user-value requirement if evidence supports it.

## Required Output

- Requirement(s) created or refined.
- Queue deltas in backlog/refinement/top-candidate docs.
- Next top unassigned item excluding actively routed items above.
- No Ready movement.
