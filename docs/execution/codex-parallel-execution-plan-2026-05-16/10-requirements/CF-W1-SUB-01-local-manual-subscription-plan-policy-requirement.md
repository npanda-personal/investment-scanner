# CF-W1-SUB-01 - Local Manual Subscription Plan Policy Requirement

Date: 2026-05-17

## Status

Decision-blocked. Not Ready for Implementation.

Open decision: `99-decision-inbox/DECISION-20260517-local-manual-subscription-plan-change-policy.md`.

## Product Value

Local validation should not accidentally encode ordinary user self-upgrade to `ADMIN` as intended product behavior. Subscription changes must stay aligned with the local-first, no-paid-provider, centralized subscription-gate model.

## Evidence

- Open decision packet identifies that authenticated users can post plan changes including `ADMIN`.
- Billing provider status says external billing is disabled and plan changes are manual/admin-ready.
- Frontend UI scope is not approved.

## Acceptance Criteria

- Accepted policy states whether ordinary users may self-change plans, which plans are allowed, and whether `ADMIN` is manual/admin-only.
- No paid provider, external billing, Prisma, route registry, package, shared UI, or frontend change occurs without separate approval.
- Focused tests cover the selected user self-change/admin-change behavior and plan-limit impact.

## Non-Goals

- No payment provider, cloud, broker, external telemetry, or paid service integration.
- No frontend subscription UI implementation before UX/product scope is approved.

## Next Gate

Product Owner, Architect, and QA decision resolution.
