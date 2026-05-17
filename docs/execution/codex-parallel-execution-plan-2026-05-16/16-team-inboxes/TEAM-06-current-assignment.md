# TEAM-06 Current Assignment

Date: 2026-05-17

Team: TEAM-06 - Strategy / Signal / Risk

Prompt file: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-06-strategy-signal-risk.md`

## Assignment

No Team 06 app-code item is Ready. Keep `CF-W1-TP-01B` as the next Strategy / Risk implementation candidate, but do not edit source or tests until Team 00 promotes it.

Current priority:

1. Refresh read-only evidence for `trade-plan-risk-engine` DQ hard-block and no-target compatibility.
2. Audit remaining DQ fail-closed gaps in `backtesting-strategy-lab`, `signal-quality-lab`, and `signal-calibration-engine`.
3. Report any missing QA or file-reservation issue for `CF-W1-TP-01B`.

## Scope

Allowed writes:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W1-TP-01B-*.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06*.md`

Forbidden:

- Strategy, Signal, Backtesting, Trade Plan, or Smart Money source/tests
- shared rule contracts not explicitly reserved
- Prisma, route registries, shared utilities, packages, generated files, frontend/UI

## Branch / Worktree

Use shared `dev` for docs-only evidence. If `CF-W1-TP-01B` is promoted, use `codex/team06-strategy-signal/CF-W1-TP-01B` and `../investment-scanner-worktrees/team06-CF-W1-TP-01B`.

## Blockers

Implementation is blocked until Team 00 Ready promotion and exact Trade Plan file reservations are copied into a new Team 06 implementation inbox.

## Expected Outbox

Update `17-team-outboxes/TEAM-06-outbox.md`.
