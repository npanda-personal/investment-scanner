# TEAM-09 Current Assignment

Date: 2026-05-17

Team: TEAM-09 - Platform / Auth / Subscription / Notifications

Prompt file: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-09-platform-auth-subscription-notifications.md`

## Assignment

Keep auth and subscription source work blocked by policy decisions. Continue notification redaction readiness prep and queue hygiene.

Current priority:

1. Keep `CF-W1-AUTH-01` blocked by `DECISION-20260517-platform-auth-default-user-fallback-policy`.
2. Keep `CF-W1-SUB-01` blocked by `DECISION-20260517-local-manual-subscription-plan-change-policy`.
3. Prepare `CF-W1-NOTIF-02` for Team 00 Ready evaluation without source edits.

## Scope

Allowed writes:

- Team 09-owned active execution docs under `10-requirements/`, `03-architecture/`, `04-qa/`, `06-contracts/`, `08-work-packets/`, and `13-implementation-evidence/`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-09*.md`

Forbidden:

- auth, subscription, notification source/tests
- auth middleware
- route registries
- Prisma schema or migrations
- package manifests
- shared utilities/UI
- frontend/UI
- providers, paid/cloud, external notification providers

## Branch / Worktree

Use shared `dev` for docs-only platform prep. If `CF-W1-NOTIF-02` is promoted, use `codex/team09-platform/CF-W1-NOTIF-02` and `../investment-scanner-worktrees/team09-CF-W1-NOTIF-02`.

## Blockers

`CF-W1-AUTH-01` and `CF-W1-SUB-01` require Product Owner + Architect + QA decisions. `CF-W1-NOTIF-02` needs Team 00 Ready promotion.

## Expected Outbox

Update `17-team-outboxes/TEAM-09-outbox.md`.
