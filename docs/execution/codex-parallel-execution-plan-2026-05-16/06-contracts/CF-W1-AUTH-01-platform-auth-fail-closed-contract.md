# CF-W1-AUTH-01 Platform Auth Fail-Closed Contract

Date: 2026-05-18

Owner: Team 03 Architecture Factory

Status: Contract prepared after Option A decision. Not Ready for Implementation.

## Decision Input

Product Owner approved Option A in `07-decisions/DECISION-20260517-platform-auth-default-user-fallback-policy-resolution.md`.

Protected Team 09 controllers must fail closed when `req.user.id` is missing. Controllers protected by `requireAuth` must not silently fall back to `default-user`.

## Contract Intent

Remove controller-level `default-user` fallback from protected subscription and notification controller paths while preserving service-level defaults only for explicit internal/test compatibility.

This is backend-only and module-local.

## Required Behavior

- Protected `subscription-billing` controller actions read the authenticated user id from `req.user.id`.
- Protected `notifications-delivery` controller actions read the authenticated user id from `req.user.id`.
- Missing authenticated user context returns a fail-closed client error and does not call the service with `default-user`.
- Existing service methods may keep default parameters for internal compatibility, but protected controllers must not use those defaults.
- Admin/manual subscription endpoint may continue to use its explicit `:userId` param and admin key validation.

## Exact Future File Reservations

Allowed after Team 00 Ready promotion:

- `backend/src/modules/subscription-billing/subscription-billing.controller.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.controller.ts`
- `backend/tests/modules/subscription-billing/subscription-billing.controller.test.ts` (new focused test file)
- `backend/tests/modules/notifications-delivery/notifications-delivery.controller.test.ts` (new focused test file)
- `backend/src/modules/subscription-billing/subscription-billing.md`
- `backend/src/modules/notifications-delivery/notifications-delivery.md`

Forbidden:

- `backend/src/modules/auth-identity/**`
- backend route registries
- `backend/src/modules/subscription-billing/subscription-billing.router.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.router.ts`
- Prisma schema or migrations
- shared backend utilities
- shared UI
- package manifests
- generated files
- frontend files
- provider, startup/backfill, live service, paid/cloud, telemetry, or broker behavior

## Test Contract

Focused tests must prove:

- subscription protected actions reject missing `req.user.id`;
- notification protected actions reject missing `req.user.id`;
- authenticated `req.user.id` is passed through to services;
- no controller action silently uses `default-user`;
- admin/manual subscription path remains admin-key guarded and explicit.

Existing Team 09 route tests are registration-only. This packet intentionally reserves focused controller-policy tests instead of broadening router scope.

## File Conflict Note

`CF-W1-SUB-01` also needs `subscription-billing.controller.ts`. Do not run `CF-W1-AUTH-01` and `CF-W1-SUB-01` as separate parallel writers against the same files.
