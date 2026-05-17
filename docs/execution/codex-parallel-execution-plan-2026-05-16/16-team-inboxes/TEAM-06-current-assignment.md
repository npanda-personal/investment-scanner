# TEAM-06 Current Assignment

Date: 2026-05-18

Team: TEAM-06 - Strategy / Signal / Risk

Prompt file: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-06-strategy-signal-risk.md`

## Assignment

No Team 06 app-code item is Ready. Keep `CF-W1-TP-01B` as the next Strategy / Risk implementation candidate, but do not edit source or tests until Team 00 promotes it.

Current priority after Team 01 audit consumption:

1. Inspect whether `CF-W1-TP-01B` can become module-local implementation-ready.
2. Verify the prepared architecture, contract, QA plan, work packet, and Team 06 readiness check still align.
3. Report any missing exact file reservation, QA scenario, target-compatibility ambiguity, DQ hard-block ambiguity, or forbidden-scope need.
4. Continue read-only evidence refresh for `backtesting-strategy-lab`, `signal-quality-lab`, and `signal-calibration-engine` only if it does not delay `CF-W1-TP-01B` readiness inspection.

Do not implement. Do not edit source or tests until Team 03 and Team 04 provide readiness confirmation and Team 00 promotes an exact implementation handoff.

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

Open decisions do not currently block `CF-W1-TP-01B`; its blocker is Ready promotion, exact reservations, and implementation handoff.

## Expected Outbox

Update `17-team-outboxes/TEAM-06-outbox.md`.
