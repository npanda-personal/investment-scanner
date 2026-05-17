# TEAM-07 Current Assignment

Date: 2026-05-17

Team: TEAM-07 - Portfolio / Watchlist / Alerts

Prompt file: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-07-portfolio-watchlist-alerts.md`

## Assignment

No Team 07 app-code item is Ready. Continue Lane 3 audit/refinement and prepare for one child implementation at a time.

Current priority:

1. Keep `CF-W1-L3-PORT-01A` portfolio readiness DTOs as the preferred first Lane 3 implementation candidate after Ready promotion.
2. Keep `CF-W1-L3-PORT-01B`, `CF-W1-L3-AUTH-03`, and `CF-W1-L3-ALERT-01` sequenced behind the first child.
3. Keep `CF-W1-L3-INTEL-01` downstream of accepted `CF-W1-L3-PORT-01A`.

## Scope

Allowed writes:

- Team 07-owned planning docs under `10-requirements/`, `03-architecture/`, `04-qa/`, `06-contracts/`, and `08-work-packets/` when not conflicting with Teams 02-04
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-07*.md`

Forbidden:

- portfolio, watchlist, alerts, portfolio-intelligence, notifications, copilot source/tests
- Prisma schema or migrations
- route registries
- shared utilities/UI
- package manifests or generated files
- providers, startup/backfill, live-provider paths

## Branch / Worktree

Use shared `dev` for docs-only work. If Team 00 promotes a Lane 3 implementation slice, use:

- `codex/team07-portfolio-alerts/CF-W1-L3-PORT-01A` and `../investment-scanner-worktrees/team07-CF-W1-L3-PORT-01A`, or
- the matching requirement id for the promoted slice.

## Blockers

Implementation is blocked until Team 00 selects the child slice, records exact file reservations, and moves it to Ready.

## Expected Outbox

Update `17-team-outboxes/TEAM-07-outbox.md`.
