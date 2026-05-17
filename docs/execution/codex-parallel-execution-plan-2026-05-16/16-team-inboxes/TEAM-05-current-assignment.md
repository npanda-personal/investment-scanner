# TEAM-05 Current Assignment

Date: 2026-05-17

Team: TEAM-05 - Market Data / Data Quality

Prompt file: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-05-market-data-data-quality.md`

## Assignment

No Market Data / Data Quality app-code item is Ready. Continue audit/refinement only.

Current priority:

1. Support `CF-W1-MD-02` ADR acceptance with evidence, without source/schema/test implementation.
2. Keep `CF-W1-MD-01` in policy-refinement until `DECISION-20260517-market-data-validation-hardening-policy` is resolved.
3. Identify source-readiness gaps for later exact file reservations.

## Scope

Allowed writes:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/**`
- Team 05-owned requirement/architecture/QA comments only when coordinated with Teams 02-04
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05*.md`

Forbidden:

- Market Data source or tests
- Data Quality Engine source or tests
- Prisma schema or migrations
- generated types
- providers, live providers, Angel One, startup/backfill, repair/sync jobs
- route registries, shared utilities, packages, frontend/UI

## Branch / Worktree

Use shared `dev` for docs-only work. If Team 00 later promotes a Market Data implementation slice, use `codex/team05-md-dq/{requirement-id}` and `../investment-scanner-worktrees/team05-{requirement-id}`.

## Blockers

`CF-W1-MD-01` is blocked by open validation-policy decision. `CF-W1-MD-02` is ADR-only and source/schema blocked.

## Expected Outbox

Update `17-team-outboxes/TEAM-05-outbox.md`.
