# CF-W1-AUTH-SUB-01 QA Verification

Date: 2026-05-18

Team: TEAM-04 - QA Factory

Worktree: `C:\work\repo\investment-scanner-worktrees\team09-CF-W1-AUTH-SUB-01`

Branch: `codex/team09-platform/CF-W1-AUTH-SUB-01`

## Verdict

`PASS`

Team 10 review may proceed.

## Scope Audit

Allowed app-file changes verified:

- `backend/src/modules/subscription-billing/subscription-billing.controller.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.controller.ts`
- `backend/tests/modules/subscription-billing/subscription-billing.controller.test.ts`
- `backend/tests/modules/notifications-delivery/notifications-delivery.controller.test.ts`
- `backend/src/modules/subscription-billing/subscription-billing.md`
- `backend/src/modules/notifications-delivery/notifications-delivery.md`

Observed branch-local evidence changes outside app scope:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-09-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-AUTH-SUB-01-developer-handoff.md`

`git status --short` showed no forbidden edits in auth middleware, routers, services, repositories, Prisma/schema, shared utilities/UI, frontend, package manifests, generated files, or startup/provider flows.

## Behavior Verification

### Subscription Controller

Verified in `backend/src/modules/subscription-billing/subscription-billing.controller.ts`:

- `currentUserId()` throws when `req.user.id` is missing or blank, preventing any `default-user` fallback on protected actions (lines 6-15).
- `me`, `usage`, and `features` pass the authenticated `req.user.id` into the service (lines 23-26).
- `changePlan` requires authenticated user context and then rejects ordinary self-service plan changes with a dedicated `403` path before any service call (lines 29-32, 50-53).
- `adminChangePlan` still requires `ADMIN_API_KEY` via `requireAdmin(req.headers)` and uses explicit `req.params.userId` for the service call (lines 34-37).

Verified in `backend/tests/modules/subscription-billing/subscription-billing.controller.test.ts`:

- Missing-auth protected actions return `401` and do not call service methods (lines 21-49).
- Authenticated reads pass the actual user id (lines 51-70).
- Ordinary self-service plan changes, including `ADMIN` self-selection, return `403` without calling the service (lines 72-98).
- Admin/manual guard and explicit `:userId` usage are covered (lines 100-135).

### Notifications Controller

Verified in `backend/src/modules/notifications-delivery/notifications-delivery.controller.ts`:

- `currentUserId()` throws when `req.user.id` is missing or blank, removing `default-user` fallback for protected user-owned actions (lines 4-12).
- `preferences`, `updatePreferences`, `events`, `testEmail`, `sendAlertDigest`, `sendDailyDigest`, and `sendWeeklyDigest` all use the authenticated `req.user.id` (lines 17-79).
- `error()` maps the auth-missing condition to `401` while leaving provider-status behavior user-independent (lines 41-47, 81-87).

Verified in `backend/tests/modules/notifications-delivery/notifications-delivery.controller.test.ts`:

- Missing-auth user-owned actions return `401` and do not call any service methods (lines 14-54).
- Authenticated user-owned actions pass the actual user id into the service (lines 56-83).
- Provider status remains user-independent (lines 85-96).

### Module Docs

Verified in module docs:

- `backend/src/modules/subscription-billing/subscription-billing.md` documents fail-closed protected flows, the disabled self-service `POST /subscription/change-plan`, the admin/manual `PATCH /subscription/users/:userId/plan`, and the frontend subscription UI limitation (lines 24, 90, 96-102, 141).
- `backend/src/modules/notifications-delivery/notifications-delivery.md` documents fail-closed user-owned controller behavior and the user-independent provider status (lines 24, 91-95).

## Commands Run

From `backend`:

1. `npm.cmd test -- subscription-billing.controller.test.ts notifications-delivery.controller.test.ts --runInBand`
   - Result: passed
   - Evidence: `2` suites passed, `9` tests passed
2. `npm.cmd run build`
   - Result: passed
3. Optional regression: `npm.cmd test -- subscription-billing.routes.test.ts notifications-delivery.routes.test.ts subscription-billing.service.test.ts --runInBand`
   - Result: passed
   - Evidence: `3` suites passed, `7` tests passed

## Skipped Checks

- None.

## Risks / Known Limitations

- Frontend subscription screens may still expose self-change affordances until the separate approved UI-alignment slice lands; the backend module doc records this limitation.
- This QA pass verifies controller-boundary policy behavior only. Legacy service-level defaults may still exist for explicit internal/test compatibility, per the approved scope.

## Bounded Rework

- None. No blocking findings in the approved scope.

## Teams Ready To Pick Up New Tasks

- Team 10 review may proceed now.
- Team 09 can be released for the next bounded slice after review pickup.
- Team 04 is available for the next QA verification assignment.
