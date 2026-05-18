# CF-W1-AUTH-SUB-01 Combined Controller Policy Work Packet

Date: 2026-05-18

Owner: Team 00 - Master Orchestrator / Integration

Implementation owner: Team 09 - Platform / Auth / Subscription / Notifications

## Work Item

Combined backend-only controller-policy slice for:

- `CF-W1-AUTH-01` - protected Team 09 controllers fail closed when authenticated user context is missing.
- `CF-W1-SUB-01` - ordinary authenticated users cannot self-change subscription plans or self-select `ADMIN`; plan changes remain admin/manual only.

## Promotion Rationale

Team 03 and Team 09 both identified a shared-file conflict between the standalone `CF-W1-AUTH-01` and `CF-W1-SUB-01` packets:

- both need `backend/src/modules/subscription-billing/subscription-billing.controller.ts`;
- both need a new focused `subscription-billing.controller.test.ts`;
- both need the subscription module doc.

Team 00 is resolving the conflict by promoting one combined Team 09 handoff with a single writer and one exact reservation set.

## Allowed Files

Team 09 may edit only:

- `backend/src/modules/subscription-billing/subscription-billing.controller.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.controller.ts`
- `backend/tests/modules/subscription-billing/subscription-billing.controller.test.ts`
- `backend/tests/modules/notifications-delivery/notifications-delivery.controller.test.ts`
- `backend/src/modules/subscription-billing/subscription-billing.md`
- `backend/src/modules/notifications-delivery/notifications-delivery.md`

Team 09 may also update branch-local evidence docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-09-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-AUTH-SUB-01-developer-handoff.md`

## Forbidden Files

Do not edit:

- `backend/src/modules/auth-identity/**`
- shared auth middleware
- backend route registries
- subscription or notification routers
- subscription or notification services, repositories, providers, or validation files
- Prisma schema or migrations
- shared backend utilities or shared DTOs
- frontend files, routes, or shared UI
- package manifests
- generated files
- backend server or env-example files
- provider startup/backfill, live-provider, paid/cloud, broker, telemetry, or credential flows

## Required Behavior

Auth fallback:

- protected subscription controller actions must read `req.user.id`;
- protected notification controller actions must read `req.user.id`;
- missing `req.user.id` must fail closed with a client error;
- missing `req.user.id` must not call service methods with `default-user`;
- service-level legacy defaults may remain only for explicit internal/test compatibility.

Subscription policy:

- ordinary authenticated users must not self-change their plan through `POST /subscription/change-plan`;
- ordinary authenticated users must not self-select `ADMIN`;
- existing admin/manual path `PATCH /subscription/users/:userId/plan` may remain only if guarded by `ADMIN_API_KEY`;
- subscription reads, usage, feature limits, provider status, and existing route paths must remain compatible;
- frontend subscription UI alignment is out of scope and must be documented as a known limitation if still mismatched.

## Focused Validation

Required after implementation:

```powershell
cd backend
npm.cmd test -- subscription-billing.controller.test.ts notifications-delivery.controller.test.ts --runInBand
npm.cmd run build
```

Optional regression check if Team 09 has time and the controller tests pass:

```powershell
cd backend
npm.cmd test -- subscription-billing.routes.test.ts notifications-delivery.routes.test.ts subscription-billing.service.test.ts --runInBand
```

## Stop Conditions

Stop and return to Team 00 if implementation requires:

- auth middleware or auth-identity changes;
- router, route registry, service, repository, provider, validation, Prisma, package, generated, shared utility, shared UI, frontend, server, or env-example changes;
- payment provider, external billing, SMTP, live provider, startup/backfill, paid/cloud, broker, telemetry, or credential behavior;
- changing the public route paths;
- broad user migration or nullable-owner compatibility work.

## Next Gate

Team 09 implementation handoff to Team 04 QA, then Team 10 review, Team 03 Architect Signoff, Team 00 delegated PO acceptance, and scoped local branch commit if all gates pass.
