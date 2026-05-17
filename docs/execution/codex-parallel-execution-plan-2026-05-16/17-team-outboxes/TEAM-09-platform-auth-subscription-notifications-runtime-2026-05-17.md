# TEAM-09 Platform / Auth / Subscription / Notifications Runtime Outbox - 2026-05-17

Mode: docs-only audit/refinement and decision routing.

## Work Item

Relaunch Team 09 from `15-automation-prompts/AUTO-09-platform-auth-subscription-notifications.md` and prepare platform-local auth, subscription, and notification privacy work without touching application code.

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/99-decision-inbox/DECISION-20260517-platform-auth-default-user-fallback-policy.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/99-decision-inbox/DECISION-20260517-local-manual-subscription-plan-change-policy.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/99-decision-inbox/open-decisions.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-NOTIF-02-notification-log-redaction-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-QA-AUTH-01-platform-auth-subscription-notification-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-09-platform-auth-subscription-notifications-runtime-2026-05-17.md`

## Files Inspected

- `AGENTS.md`
- `docs/instructions.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-09-platform-auth-subscription-notifications.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/14-team-charters/TEAM-09-platform-auth-subscription-notifications.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/active-work-board.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-platform-auth-subscription-notifications.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/blocked-by-decision.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/blocked-by-upstream-dependency.md`
- `backend/src/modules/auth-identity/**`
- `backend/src/modules/subscription-billing/**`
- `backend/src/modules/notifications-delivery/**`
- `frontend/src/features/subscription-billing/**`
- `frontend/src/features/notifications-delivery/**`
- matching focused backend tests for auth, subscription, and notifications

## Current Source Findings

- `subscription-billing` and `notifications-delivery` routers mount `requireAuth`.
- Their controllers still fall back to `default-user` when `req.user` is absent.
- `POST /subscription/change-plan` still allows ordinary authenticated users to request `FREE`, `PRO`, or `ADMIN`.
- The frontend subscription page exposes plan-selection actions for all active plans.
- `LogEmailProvider` remains local/free and always active, but logs recipient, subject, and body preview.
- `NotificationsDeliveryService.sendAlertDigest()` calls `alertsService.listEvents()` without passing the current user id, so alert digest isolation still needs future source work after platform policy and file reservations.

## Behavior / Contract Changes

- Application behavior changed: none.
- Source changed: none.
- Tests changed: none.
- Prisma, routes, packages, generated files, shared utilities/UI changed: none.
- Decision Inbox changed: two true consent blockers were opened for Team 09 policy.

## Validation

- Builds run: none.
- Tests run: none.
- UI checks run: none.
- Live local data checks run: none.
- Skipped reason: Team 09 had no Ready application-code item; this was docs-only policy and QA prep.

## Open Decisions Routed

- `DECISION-20260517-platform-auth-default-user-fallback-policy`
- `DECISION-20260517-local-manual-subscription-plan-change-policy`

## Recommended Next Gates

1. Product Owner resolves the two new Decision Inbox items.
2. Team 03 prepares exact file reservations for accepted Team 09 source slices.
3. Team 04 reviews/refines the QA plan into executable scenarios.
4. Team 00 promotes only one bounded Team 09 slice to Ready for Implementation.

## Risks

- Active board and queue docs still need Team 00 synchronization after the new Decision Inbox entries.
- Existing dirty docs from Team 02 were present before this run and were not edited by Team 09.
- Notification/copilot alert digest isolation remains separate from completed `CF-W1-L3-AUTH-02` alert event ownership.

## Product Owner Review Needed

- Auth fallback policy decision.
- Local/manual subscription plan-change policy decision.
