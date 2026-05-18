# CF-W1-AUTH-SUB-01 Controller Policy QA Plan

Date: 2026-05-18

Owner: Team 04 QA Factory

Prepared by: Team 00 from accepted Team 03/Team 09 packet guidance

## Scope

Focused backend QA for the combined Team 09 controller-policy slice:

- `CF-W1-AUTH-01`: protected Team 09 controllers fail closed when `req.user.id` is missing.
- `CF-W1-SUB-01`: ordinary users cannot self-change subscription plans or self-select `ADMIN`.

No frontend, route registry, Prisma/schema, shared utility/UI, package, provider, startup/backfill, live-provider, paid/cloud, broker, or telemetry work is included.

## Required Test Coverage

Subscription controller:

- `me`, `usage`, `features`, and `changePlan` reject missing authenticated user context without calling the service with `default-user`.
- authenticated `me`, `usage`, and `features` pass the actual `req.user.id` into the service.
- ordinary authenticated users cannot self-change plans through `changePlan`.
- ordinary authenticated users cannot self-select `ADMIN`.
- admin/manual plan update remains guarded by `ADMIN_API_KEY`.
- admin/manual plan update continues to use the explicit `:userId` route param.

Notification controller:

- protected user-owned notification actions reject missing authenticated user context without calling the service with `default-user`.
- authenticated user-owned actions pass the actual `req.user.id` into the service.
- provider status behavior remains user-independent.

Module docs:

- subscription docs explain that plan changes are admin/manual only for now and frontend UI alignment is out of scope.
- notification docs explain protected controller fail-closed behavior.

## Required Commands

```powershell
cd backend
npm.cmd test -- subscription-billing.controller.test.ts notifications-delivery.controller.test.ts --runInBand
npm.cmd run build
```

## Optional Regression Commands

Run if the focused tests pass and resource gate is safe:

```powershell
cd backend
npm.cmd test -- subscription-billing.routes.test.ts notifications-delivery.routes.test.ts subscription-billing.service.test.ts --runInBand
```

## Rejection Criteria

Reject if:

- any protected controller still falls back to `default-user`;
- a missing-auth controller path calls a service with `default-user`;
- ordinary authenticated users can self-change their plan;
- ordinary authenticated users can self-select `ADMIN`;
- admin/manual plan update is not guarded by `ADMIN_API_KEY`;
- implementation touches forbidden files;
- tests only prove route registration and do not prove controller policy behavior;
- frontend, paid-provider, route-registry, schema, shared utility/UI, package, generated, startup/backfill, live-provider, broker, telemetry, or credential scope appears.

## Known Limitations

- Existing frontend subscription UI may remain mismatched because frontend changes are not approved in this slice.
- Service-level legacy defaults may remain for explicit internal/test compatibility; this QA plan verifies protected controller boundaries only.
