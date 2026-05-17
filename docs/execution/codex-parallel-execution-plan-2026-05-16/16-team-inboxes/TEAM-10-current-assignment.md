# TEAM-10 Current Assignment

Date: 2026-05-17

Team: TEAM-10 - Review / Release

Prompt file: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-10-review-release.md`

## Assignment

Monitor team outboxes and integration queue. Review docs-only outputs and reject any application-code release claim until Ready promotion, implementation, focused tests, QA evidence, code review, Architect signoff, and acceptance packet exist.

Current priority:

1. Review Team 00 coordination commit scope after staging if requested.
2. Keep integration queue depth at zero for app-code unless a team submits accepted implementation evidence.
3. Validate that open decisions block only affected workstreams.

## Scope

Allowed writes:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-10*.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/**`
- release/review active docs explicitly assigned by Team 00

Forbidden:

- application source/tests unless explicitly reviewing read-only
- staging, committing, or pushing without Team 00 scoped instruction
- high-risk/shared file edits

## Branch / Worktree

Use shared `dev` for docs-only review. Use a dedicated worktree only for isolated accepted implementation review, named `codex/team10-review-release/{requirement-id}` and `../investment-scanner-worktrees/team10-{requirement-id}`.

## Blockers

No Team 10 workstream is fully blocked. App-code release is closed because no implementation item is currently Ready or submitted.

## Expected Outbox

Update `17-team-outboxes/TEAM-10-outbox.md`.
