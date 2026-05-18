# CF-W1-SUB-01 Manual Subscription Plan Policy Contract

Date: 2026-05-18

Owner: Team 03 Architecture Factory

Status: Contract prepared after Option A decision. Not Ready for Implementation.

## Decision Input

Product Owner approved Option A in `07-decisions/DECISION-20260517-local-manual-subscription-plan-change-policy-resolution.md`.

Ordinary authenticated users may not self-change plans or self-select `ADMIN`. Subscription plan changes are admin/manual only for now.

## Contract Intent

Block public self-service subscription plan changes at the backend controller boundary while preserving the existing admin/manual path when guarded by `ADMIN_API_KEY`.

This is backend-only and module-local.

## Required Behavior

- `POST /subscription/change-plan` must not allow ordinary authenticated users to change their own plan.
- Ordinary users must not be able to self-select `ADMIN`.
- `PATCH /subscription/users/:userId/plan` remains the local/manual admin path if it is guarded by `ADMIN_API_KEY`.
- Subscription reads, feature limits, usage counters, provider status, and existing route paths remain compatible.
- Frontend subscription UI changes are not included; if UI still exposes a self-change action, document it as a known limitation or route it to a separate UX item.

## Exact Future File Reservations

Allowed after Team 00 Ready promotion:

- `backend/src/modules/subscription-billing/subscription-billing.controller.ts`
- `backend/tests/modules/subscription-billing/subscription-billing.controller.test.ts` (new focused test file)
- `backend/src/modules/subscription-billing/subscription-billing.md`

Forbidden:

- `backend/src/modules/subscription-billing/subscription-billing.router.ts`
- `backend/src/modules/subscription-billing/subscription-billing.service.ts`
- `backend/src/modules/subscription-billing/subscription-billing.repository.ts`
- `backend/src/modules/subscription-billing/subscription-billing.provider.ts`
- auth middleware or `auth-identity` source
- route registries
- Prisma schema or migrations
- shared utilities or shared UI
- package manifests
- generated files
- frontend files
- paid billing providers, external billing, cloud, telemetry, broker, provider, startup/backfill behavior

## Test Contract

Focused tests must prove:

- ordinary authenticated users cannot self-change plans;
- ordinary authenticated users cannot self-select `ADMIN`;
- admin/manual plan update remains guarded by `ADMIN_API_KEY`;
- subscription read/usage behavior still uses the authenticated user id;
- no paid provider or frontend behavior is introduced.

Existing `subscription-billing.routes.test.ts` remains registration-only. This packet intentionally reserves a focused controller-policy test instead of broadening router scope.

## File Conflict Note

`CF-W1-AUTH-01` also needs `subscription-billing.controller.ts`. Prefer one combined Team 09 controller-policy implementation handoff, or sequence these slices with a single writer.
