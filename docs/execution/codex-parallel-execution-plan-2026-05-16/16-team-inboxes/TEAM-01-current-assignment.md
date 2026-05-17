# TEAM-01 Current Assignment

Date: 2026-05-17

Team: TEAM-01 - Audit Factory

Prompt file: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-01-audit-factory.md`

## Assignment

Continue module audits and stale-risk discovery. Focus on audit evidence that can feed Team 02 requirements and Team 03/04 child readiness.

Current priority:

1. Re-audit `CF-W1-L3-PORT-01`, `CF-W1-L3-ALERT-01`, `CF-W1-TP-01B`, `CF-W1-NOTIF-02`, and `CF-W1-L3-INTEL-01` for source/readiness drift.
2. Confirm no prepared child packet overclaims implementation readiness.
3. Identify stale docs or blockers not reflected in queues.

## Scope

Allowed writes:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-01*.md`

Forbidden writes:

- application source or tests
- Prisma schema or migrations
- route registries
- shared utilities or shared UI
- package manifests
- generated files
- root `AGENTS.md`, `docs/AGENTS.md`, or `docs/codex-agent-team-plan/**`

## Branch / Worktree

Use the shared `dev` worktree for docs-only audit work. Do not create a worktree unless Team 00 assigns an implementation-ready audit/review task.

## Blockers

No Team 01 workstream is blocked. Open decisions block only affected implementation workstreams.

## Expected Outbox

Update `17-team-outboxes/TEAM-01-outbox.md` with findings, changed docs, blockers, and next recommended requirements.
