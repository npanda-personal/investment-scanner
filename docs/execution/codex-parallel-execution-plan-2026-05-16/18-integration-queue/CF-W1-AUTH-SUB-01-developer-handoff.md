# CF-W1-AUTH-SUB-01 Developer Handoff

Date: 2026-05-18

## Work Item

- `CF-W1-AUTH-SUB-01` - combined Team 09 controller policy slice for auth fail-closed behavior and manual-only subscription plan changes.

## State / Mode

- Completed implementation and focused backend validation in bounded allowed-file scope.

## Owner

- Team 09 - Platform / Auth / Subscription / Notifications.

## Lane / Module

- Lane 3
- Modules: `subscription-billing`, `notifications-delivery`

## Branch / Worktree

- Branch: `codex/team09-platform/CF-W1-AUTH-SUB-01`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team09-CF-W1-AUTH-SUB-01`
- Starting commit: `eda6e15e7b10ad24890f8736ff64f2504ecd9a37`

## Files Changed

- `backend/src/modules/subscription-billing/subscription-billing.controller.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.controller.ts`
- `backend/tests/modules/subscription-billing/subscription-billing.controller.test.ts`
- `backend/tests/modules/notifications-delivery/notifications-delivery.controller.test.ts`
- `backend/src/modules/subscription-billing/subscription-billing.md`
- `backend/src/modules/notifications-delivery/notifications-delivery.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-09-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-AUTH-SUB-01-developer-handoff.md`

## Files Inspected (No Edits)

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-09-current-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-AUTH-SUB-01-combined-controller-policy-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-AUTH-SUB-01-controller-policy-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-AUTH-01-platform-auth-default-user-fallback-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SUB-01-local-manual-subscription-plan-policy-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-AUTH-01-platform-auth-fail-closed-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-SUB-01-manual-subscription-plan-policy-contract.md`
- `backend/src/modules/subscription-billing/subscription-billing.router.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.router.ts`
- `backend/src/modules/subscription-billing/subscription-billing.service.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.service.ts`
- `backend/tests/modules/subscription-billing/subscription-billing.routes.test.ts`
- `backend/tests/modules/notifications-delivery/notifications-delivery.routes.test.ts`

## Behavior Changed

- Protected subscription actions `me`, `usage`, `features`, and `changePlan` now require `req.user.id`; missing user context returns `401`.
- Protected notifications user-owned actions `preferences`, `updatePreferences`, `events`, `testEmail`, `sendAlertDigest`, `sendDailyDigest`, and `sendWeeklyDigest` now require `req.user.id`; missing user context returns `401`.
- Protected controller actions no longer pass `default-user` into services.
- Authenticated protected actions pass the actual `req.user.id`.
- `POST /subscription/change-plan` is blocked for ordinary authenticated self-service with `403` (including attempted `ADMIN` self-selection).
- Admin/manual `PATCH /subscription/users/:userId/plan` remains `ADMIN_API_KEY` guarded and uses explicit route `:userId`.
- Notification provider status behavior remains user-independent.

## Docs Changed

- `subscription-billing.md` now documents fail-closed controller behavior, manual/admin plan policy, and frontend subscription UI limitation.
- `notifications-delivery.md` now documents fail-closed controller behavior for user-owned endpoints and user-independent provider status.

## Contracts Changed

- No service/repository/router/API route path contract changes.
- Policy enforcement is at controller boundary only, per combined work packet.

## Tests Run

From `backend`:

1. `npm.cmd test -- subscription-billing.controller.test.ts notifications-delivery.controller.test.ts --runInBand` -> passed.
2. `npm.cmd run build` -> passed.
3. Optional: `npm.cmd test -- subscription-billing.routes.test.ts notifications-delivery.routes.test.ts subscription-billing.service.test.ts --runInBand` -> passed.

## Tests Skipped

- None in required scope.

## Assumptions

- Current subscription policy is intentionally manual/admin-only for plan mutation; frontend self-service alignment is deferred.

## Risks

- Frontend subscription screens may still present self-change affordances until separately updated.

## Blockers

- None for this Team 09 bounded controller-policy implementation.

## Shared-File Requests

- None.

## Next Gate

- Team 04 QA verification -> Team 10 code review -> Team 03 architect signoff -> Team 00 delegated PO acceptance.

## Evidence Notes

- Memory safety check used `Get-Counter '\Memory\% Committed Bytes In Use'` (~77.2%) before required test/build runs.
- Forbidden paths remained untouched.
