# CF-W1-AUTH-01 Work Packet

Date: 2026-05-18

Owner: Team 03 Architecture Factory

State: Post-decision backend-only packet prepared. Not Ready for Implementation.

## Work Item

Fail closed in protected Team 09 controllers when authenticated user context is missing.

## Allowed Files After Ready Promotion

- `backend/src/modules/subscription-billing/subscription-billing.controller.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.controller.ts`
- `backend/tests/modules/subscription-billing/subscription-billing.controller.test.ts` (new focused test file)
- `backend/tests/modules/notifications-delivery/notifications-delivery.controller.test.ts` (new focused test file)
- `backend/src/modules/subscription-billing/subscription-billing.md`
- `backend/src/modules/notifications-delivery/notifications-delivery.md`

## Forbidden Files

- auth middleware or `auth-identity` source
- route registries
- subscription or notification routers
- Prisma schema or migrations
- shared backend utilities
- package manifests
- generated files
- frontend files
- providers, startup/backfill, live services, paid/cloud, telemetry, broker flows

## Required Implementation

- Replace controller fallback behavior with a small module-local authenticated-user guard.
- Return a fail-closed error when `req.user.id` is missing.
- Preserve service defaults only for explicit internal/test compatibility.
- Preserve route paths and router behavior.
- Document controller fail-closed behavior in module docs.

## Suggested Focused Commands After Implementation

```powershell
cd backend
npm.cmd test -- subscription-billing.controller.test.ts notifications-delivery.controller.test.ts --runInBand
```

Existing Team 09 route tests are registration-only and remain out of scope. If route behavior is touched under a separate handoff:

```powershell
cd backend
npm.cmd test -- subscription-billing.routes.test.ts notifications-delivery.routes.test.ts --runInBand
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires auth middleware, route registries, routers, shared utilities, Prisma, package, generated, frontend, provider, startup/backfill, or live-service scope.

## Next Gate

Team 00 Ready promotion or a combined Team 09 controller-policy handoff with `CF-W1-SUB-01`. If combined, the new controller test files stay reserved to the same single writer.
