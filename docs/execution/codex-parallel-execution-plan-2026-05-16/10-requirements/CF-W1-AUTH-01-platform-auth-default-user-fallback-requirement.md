# CF-W1-AUTH-01 - Platform Auth Default-User Fallback Requirement

Date: 2026-05-17

## Status

Policy resolved. Not Ready for Implementation.

Resolution: `07-decisions/DECISION-20260517-platform-auth-default-user-fallback-policy-resolution.md`.

## Product Value

Authenticated platform routes should not silently fall back to `default-user` if auth context is missing. Silent fallback can hide two-user isolation failures and make protected subscription or notification behavior look valid when auth is broken.

## Evidence

- Decision packet identified controller-level `req.user?.id || 'default-user'` fallback in protected Team 09 routes.
- Product Owner approved Option A: protected Team 09 controllers must fail closed when `req.user.id` is missing.
- Affected modules: `subscription-billing` and `notifications-delivery`.
- Source work still needs module-local architecture/QA refresh, exact controller/test reservations, and Team 00 Ready promotion.

## Acceptance Criteria

- Protected Team 09 controllers fail closed when `req.user.id` is missing.
- Controllers protected by `requireAuth` do not silently fall back to `default-user`.
- Service-level legacy defaults may remain only for explicit internal or test compatibility.
- Implementation, if later approved, stays module-local unless a separate decision reserves auth middleware, route registry, Prisma, or shared utility files.
- Focused tests prove missing-auth-context behavior and two-user isolation for the selected policy.

## Non-Goals

- No auth-identity source, shared auth middleware, route registry, Prisma, frontend, package, generated-file, or shared utility work.
- No broad platform nullable-owner migration in this requirement.

## Next Gate

Team 09, Team 03, and Team 04 refresh a module-local backend packet with exact controller/test reservations, then Team 00 evaluates Ready promotion.
