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
