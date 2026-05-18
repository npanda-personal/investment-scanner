# CF-W1-SUB-01 - Local Manual Subscription Plan Policy Requirement

Date: 2026-05-17

## Status

Policy resolved. Not Ready for Implementation. Sequence this with `CF-W1-AUTH-01` rather than parallelizing the overlapping subscription files unless Team 00 records an exact combined reservation.

Resolution: `07-decisions/DECISION-20260517-local-manual-subscription-plan-change-policy-resolution.md`.

## Product Value

Local validation should not accidentally encode ordinary user self-upgrade to `ADMIN` as intended product behavior. Subscription changes must stay aligned with the local-first, no-paid-provider, centralized subscription-gate model.

## Evidence

- Decision packet identified that authenticated users can post plan changes including `ADMIN`.
- Product Owner approved Option A: ordinary users may not self-change plans or self-select `ADMIN`; subscription plan changes are admin/manual only for now.
- Billing provider status says external billing is disabled and plan changes are manual/admin-ready.
- Frontend UI scope remains not approved. If existing UI becomes mismatched, record the limitation or create a separate UX work item.
- Current Team 00 routing keeps this behind `CF-W1-AUTH-01` as the sequenced AUTH/SUB follow-up.

## Acceptance Criteria

- Ordinary authenticated users cannot self-change their own subscription plan.
- Ordinary authenticated users cannot self-select `ADMIN`.
- Existing admin/manual path remains the local route only if already present and safe.
- No paid provider, external billing, Prisma, route registry, package, shared UI, or frontend change occurs without separate approval.
- Focused tests cover the selected user self-change/admin-change behavior and plan-limit impact.

## Non-Goals

- No payment provider, cloud, broker, external telemetry, or paid service integration.
- No frontend subscription UI implementation before UX/product scope is approved.

## Next Gate

Team 09, Team 03, and Team 04 refresh a backend-only module-local packet with exact file reservations, focused tests, and frontend limitation notes, then Team 00 evaluates Ready promotion on the sequenced AUTH/SUB path.
