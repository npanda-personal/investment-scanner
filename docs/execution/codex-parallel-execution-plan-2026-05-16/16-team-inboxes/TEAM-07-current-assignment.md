# TEAM-07 Current Assignment

Date: 2026-05-18

Team: TEAM-07 - Portfolio / Watchlist / Alerts

Prompt file: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-07-portfolio-watchlist-alerts.md`

## Assignment

No Team 07 app-code item is Ready. Continue Lane 3 audit/refinement and prepare for one child implementation at a time.

Current priority after Team 01 audit consumption:

1. Inspect whether `CF-W1-L3-PORT-01A` can become module-local implementation-ready.
2. Confirm whether the future write scope can stay inside portfolio-management source/tests/docs only.
3. Report any need for Data Quality Engine exports, shared DTO/helper changes, route changes, Prisma changes, frontend/UI changes, or watchlist scope.
4. Keep `CF-W1-L3-PORT-01B`, `CF-W1-L3-AUTH-03`, and `CF-W1-L3-ALERT-01` sequenced behind the first child unless Team 00 assigns a different child.
5. Keep `CF-W1-L3-INTEL-01` downstream of accepted `CF-W1-L3-PORT-01A`.

Do not implement until Team 03 and Team 04 provide architecture/QA readiness and Team 00 promotes exact file reservations.

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

Ignore stale completed-work inbox `16-team-inboxes/TEAM-07-CF-W1-L3-AUTH-01.md`; current routing uses this file.

## Expected Outbox

Update `17-team-outboxes/TEAM-07-outbox.md`.
