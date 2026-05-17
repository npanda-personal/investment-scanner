# DECISION-20260517 Local Manual Subscription Plan Change Policy Resolution

Date: 2026-05-18

Status: Resolved by Product Owner

Decision Inbox source: `99-decision-inbox/DECISION-20260517-local-manual-subscription-plan-change-policy.md`

## Approved Option

Option A: subscription plan changes are admin/manual only for now.

## Approved Policy

- Ordinary authenticated users may not self-change their subscription plan.
- Ordinary authenticated users may not self-select `ADMIN`.
- Subscription plan changes are admin/manual only for now.
- The admin plan endpoint with `ADMIN_API_KEY` may remain the approved local/manual path if already present and safe.
- Backend-first implementation is approved only if it stays module-local.
- Frontend subscription UI updates are not approved by this decision; if existing UI becomes mismatched, record the limitation or create a separate UX work item.

## Not Approved

This decision does not approve:

- paid billing providers or payment services;
- Prisma schema or migration changes;
- route registry changes;
- package manifest changes;
- shared UI changes;
- frontend implementation.

## Queue Impact

The Decision Inbox blocker for `CF-W1-SUB-01` is resolved.

`CF-W1-SUB-01` is not automatically Ready for Implementation. Team 09, Team 03, and Team 04 must refresh a backend-only module-local packet, exact file reservations, focused tests, and known frontend limitation notes before Team 00 can promote implementation.

## Product Owner Action

No further Product Owner action is required for this Decision Inbox item.

