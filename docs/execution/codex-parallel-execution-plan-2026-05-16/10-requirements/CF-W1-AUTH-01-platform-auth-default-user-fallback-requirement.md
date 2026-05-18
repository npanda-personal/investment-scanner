# CF-W1-AUTH-01 - Platform Auth Default-User Fallback Requirement

Date: 2026-05-18

## Status

Policy resolved. Team 03/04 post-decision contract/work-packet/QA refresh prepared. Not Ready for Implementation. Sequence this with `CF-W1-SUB-01` rather than parallelizing the overlapping subscription files unless Team 00 records an exact combined reservation.

Resolution: `07-decisions/DECISION-20260517-platform-auth-default-user-fallback-policy-resolution.md`.

## Product Value

Authenticated platform routes should not silently fall back to `default-user` if auth context is missing. Silent fallback can hide two-user isolation failures and make protected subscription or notification behavior look valid when auth is broken.

## Evidence

- Decision packet identified controller-level `req.user?.id || 'default-user'` fallback in protected Team 09 routes.
- Product Owner approved Option A: protected Team 09 controllers must fail closed when `req.user.id` is missing.
- Affected modules: `subscription-billing` and `notifications-delivery`.
- Team 03 prepared the module-local contract/work packet and Team 04 prepared the Option A QA refresh.
- Source work still needs Team 00 Ready promotion, Team 09 implementation handoff, and sequencing with `CF-W1-SUB-01` because subscription files overlap.

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

Team 00 evaluates Ready promotion for the prepared module-local backend packet, then hands off to Team 09 on a sequenced AUTH/SUB path. Only combine with `CF-W1-SUB-01` if Team 00 records exact shared-file reservations.
