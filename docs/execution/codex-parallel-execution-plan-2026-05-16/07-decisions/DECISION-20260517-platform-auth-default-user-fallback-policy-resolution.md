# DECISION-20260517 Platform Auth Default-User Fallback Policy Resolution

Date: 2026-05-18

Status: Resolved by Product Owner

Decision Inbox source: `99-decision-inbox/DECISION-20260517-platform-auth-default-user-fallback-policy.md`

## Approved Option

Option A: protected Team 09 controllers fail closed when `req.user.id` is missing.

## Approved Policy

- Protected Team 09 controllers must fail closed when `req.user.id` is missing.
- Controllers protected by `requireAuth` must not silently fall back to `default-user`.
- Service-level legacy defaults may remain only for explicit internal or test compatibility until a later migration removes them.
- This decision approves a bounded backend Team 09 implementation slice only if it can stay module-local.

## Future Allowed Scope After Ready Promotion

- `backend/src/modules/subscription-billing/subscription-billing.controller.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.controller.ts`
- `backend/tests/modules/subscription-billing/**`
- `backend/tests/modules/notifications-delivery/**`

No file is reserved by this decision alone. Team 00 must still promote a child implementation handoff with exact allowed and forbidden files.

## Not Approved

This decision does not approve changes to:

- auth-identity source;
- shared auth middleware;
- route registries;
- Prisma schema or migrations;
- package manifests;
- frontend routes or shared UI;
- generated or common fixtures.

## Queue Impact

The Decision Inbox blocker for `CF-W1-AUTH-01` is resolved.

`CF-W1-AUTH-01` is not automatically Ready for Implementation. Team 09, Team 03, and Team 04 must refresh the module-local architecture/QA handoff and exact controller/test reservations before Team 00 can promote a bounded backend slice.

## Product Owner Action

No further Product Owner action is required for this Decision Inbox item.

