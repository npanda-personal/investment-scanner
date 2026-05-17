# TEAM-02 Current Assignment

Date: 2026-05-17

Team: TEAM-02 - Requirement Factory

Prompt file: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-02-requirement-factory.md`

## Assignment

Keep backlog, refinement queue, and top candidates current. Convert audit findings into bounded requirements without moving application-code items to Ready.

Current priority:

1. Keep `CF-W1-L3-PORT-01`, `CF-W1-L3-ALERT-01`, `CF-W1-TP-01B`, and `CF-W1-NOTIF-02` framed as near-ready but not Ready.
2. Keep `CF-W1-AUTH-01`, `CF-W1-SUB-01`, `CF-W1-UX-02`, and `CF-W1-MD-01` blocked by Decision Inbox policy.
3. Add or refine requirements for `CF-W1-L3-INTEL-01` only as downstream of accepted `CF-W1-L3-PORT-01A`.

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

## Expected Outbox

Update `17-team-outboxes/TEAM-02-requirement-factory.md` with queue deltas and Ready-depth evidence.
