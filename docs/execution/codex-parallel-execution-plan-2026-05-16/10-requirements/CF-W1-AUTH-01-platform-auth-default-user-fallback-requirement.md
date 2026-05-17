# CF-W1-AUTH-01 - Platform Auth Default-User Fallback Requirement

Date: 2026-05-17

## Status

Decision-blocked. Not Ready for Implementation.

Open decision: `99-decision-inbox/DECISION-20260517-platform-auth-default-user-fallback-policy.md`.

## Product Value

Authenticated platform routes should not silently fall back to `default-user` if auth context is missing. Silent fallback can hide two-user isolation failures and make protected subscription or notification behavior look valid when auth is broken.

## Evidence

- Open decision packet identifies controller-level `req.user?.id || 'default-user'` fallback in protected Team 09 routes.
- Affected modules: `subscription-billing` and `notifications-delivery`.
- Source work is blocked until Product Owner, Architect, and QA decide the accepted policy.

## Acceptance Criteria

- Accepted policy clearly states whether protected controllers fail closed or retain documented local fallback behavior.
- Implementation, if later approved, stays module-local unless a separate decision reserves auth middleware, route registry, Prisma, or shared utility files.
- Focused tests prove missing-auth-context behavior and two-user isolation for the selected policy.

## Non-Goals

- No source, route, auth middleware, Prisma, frontend, package, or shared utility work before decision resolution.
- No broad platform nullable-owner migration in this requirement.

## Next Gate

Product Owner, Architect, and QA decision resolution.
