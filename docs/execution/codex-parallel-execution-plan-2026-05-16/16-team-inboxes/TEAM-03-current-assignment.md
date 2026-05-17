# TEAM-03 Current Assignment

Date: 2026-05-18

Team: TEAM-03 - Architecture Factory

Prompt file: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-03-architecture-factory.md`

## Assignment

Prepare contracts, exact file reservations, and architecture readiness for the highest-priority candidates. No application-code item is Ready.

Current priority after Team 01 audit consumption:

1. Prepare architecture/file-reservation readiness for `CF-W1-L3-PORT-01A` as a portfolio-management-only child, separate from watchlist.
2. Prepare architecture readiness for `CF-W1-TP-01B`.
3. Prepare architecture readiness for `CF-W1-NOTIF-02`.
4. Prepare architecture readiness for `CF-W1-L3-ALERT-01`.
5. Keep `CF-W1-L3-INTEL-01` explicitly downstream of accepted `CF-W1-L3-PORT-01A`.
6. Refresh post-decision architecture/work-packet readiness for `CF-W1-AUTH-01`, `CF-W1-SUB-01`, `CF-W1-UX-02`, `CF-W1-UX-05`, and `CF-W1-MD-01` without moving them to Ready.

Output should make it obvious whether any of the four near-ready candidates has exact allowed files, exact forbidden files, no shared/high-risk request, and no unresolved decision blocker.

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

`CF-W1-MD-02` source/schema work remains blocked by high-risk file gates. `CF-W1-UX-02` and `CF-W1-UX-05` policy is resolved, but architecture implementation scope still needs Copilot-only reservation refresh.

Decision reconciliation:

- No open Decision Inbox item remains.
- The five resolved decisions remove Product Owner blockers only; they do not authorize source/test work without Team 00 Ready promotion.

## Expected Outbox

Update `17-team-outboxes/TEAM-03-outbox.md` and `17-team-outboxes/TEAM-03-architecture-factory.md`.
