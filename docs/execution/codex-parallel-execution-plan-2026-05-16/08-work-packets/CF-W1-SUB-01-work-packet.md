# CF-W1-SUB-01 Work Packet

Date: 2026-05-18

Owner: Team 03 Architecture Factory

State: Post-decision backend-only packet prepared. Not Ready for Implementation.

## Work Item

Enforce admin/manual-only subscription plan changes for local validation.

## Allowed Files After Ready Promotion

- `backend/src/modules/subscription-billing/subscription-billing.controller.ts`
- `backend/tests/modules/subscription-billing/subscription-billing.controller.test.ts` (new focused test file)
- `backend/src/modules/subscription-billing/subscription-billing.md`

## Forbidden Files

- subscription router, service, repository, provider, or validation source unless a new packet reserves them
- auth middleware or auth source
- backend/frontend route registries
- Prisma schema or migrations
- shared backend utilities
- shared UI
- frontend source/tests
- package manifests
- generated files
- paid billing providers, external billing, cloud, telemetry, provider, startup/backfill, broker flows

## Required Implementation

- Block ordinary user self-service plan changes in the protected controller.
- Preserve existing admin/manual path guarded by `ADMIN_API_KEY`.
- Preserve subscription reads, usage, feature limits, provider status, and route paths.
- Document that frontend subscription UI alignment is outside this backend slice.

## Suggested Focused Commands After Implementation

```powershell
cd backend
npm.cmd test -- subscription-billing.controller.test.ts subscription-billing.validation.test.ts --runInBand
```

Existing `subscription-billing.routes.test.ts` is registration-only and remains out of scope. If service behavior is touched under a separate handoff:

```powershell
cd backend
npm.cmd test -- subscription-billing.service.test.ts subscription-billing.controller.test.ts --runInBand
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires service/repository/provider changes, route changes, frontend changes, Prisma, package, shared utility/UI, paid provider, external billing, startup/backfill, or generated-file scope.

## Next Gate

Team 00 Ready promotion or a combined Team 09 controller-policy handoff with `CF-W1-AUTH-01`. If combined, the new subscription controller test file stays reserved to the same single writer.
