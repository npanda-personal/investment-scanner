# TEAM-03 Current Assignment

Date: 2026-05-17

Team: TEAM-03 - Architecture Factory

Prompt file: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-03-architecture-factory.md`

## Assignment

Prepare contracts, exact file reservations, and architecture readiness for the highest-priority candidates. No application-code item is Ready.

Current priority:

1. Route `CF-W1-MD-02` ADR draft through architecture acceptance as ADR-only evidence. Do not approve schema/source/test work.
2. Continue docs-only prep for `CF-W1-L3-INTEL-01`, downstream of `CF-W1-L3-PORT-01A`.
3. Confirm exact backend reservations for any future Team 00 Ready promotion of `CF-W1-L3-PORT-01A`, `CF-W1-L3-ALERT-01`, `CF-W1-TP-01B`, and `CF-W1-NOTIF-02`.

## Scope

Allowed writes:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03*.md`

Forbidden writes:

- application source or tests
- Prisma schema or migrations
- route registries
- shared backend utilities
- shared UI
- package manifests
- generated files

## Branch / Worktree

Use shared `dev` for docs-only architecture work. If Team 00 later asks Team 03 to prepare implementation-adjacent review in isolation, use `codex/team03-architecture/{requirement-id}` and `../investment-scanner-worktrees/team03-{requirement-id}`.

## Blockers

`CF-W1-MD-02` source/schema work remains blocked by high-risk file gates. `CF-W1-UX-02` architecture implementation scope is blocked by open UX policy decision.

## Expected Outbox

Update `17-team-outboxes/TEAM-03-outbox.md` and `17-team-outboxes/TEAM-03-architecture-factory.md`.
