# DECISION-20260517 Trade Plan No-Target And DQ Hard-Block Resolution

Date: 2026-05-17

Status: Resolved by Product Owner

Decision Inbox source: `99-decision-inbox/DECISION-20260517-trade-plan-no-target-dq-hard-block.md`

## Approved Option

Option B: backend-only compatibility direction.

## Approved Policy

- Keep existing target-shaped fields as compatibility-only for now.
- Do not treat target-shaped fields as trusted paper-readiness.
- Do not generate arbitrary predefined target-price semantics.
- Replace trusted output language with rule-based exit, invalidation, risk-review, evidence, and reason-summary wording.
- Missing or blocked Data Quality states must hard-block trusted Trade Plan readiness.
- `LIMITED` is blocked or limited-review-only until a later Product Owner-approved policy narrows it.

## Not Approved

This decision does not approve:

- Frontend changes.
- Today Review changes.
- Prisma/schema changes.
- Backend or frontend route registry changes.
- Shared backend utility changes.
- Shared UI changes.
- Package manifest changes.
- Generated type changes.
- Provider or live-provider behavior.
- Startup/backfill behavior.
- Broad UI implementation.

If implementation requires broader API, UI, or stored-row migration, create a new Decision Packet and continue unrelated work.

## Queue Impact

The Decision Inbox blocker for `CF-W1-TP-01A` is resolved.

`CF-W1-TP-01A` is not automatically Ready for Implementation. Team 03 and Team 04 must refresh the backend-only child work packet, QA scenarios, and exact source/test file reservations against the approved Option B compatibility boundary.

Recommended next child-slice preparation:

- `CF-W1-TP-01B`: backend-only Trade Plan compatibility and DQ hard-block implementation, excluding frontend and Today Review unless separately approved.

## Product Owner Action

No further Product Owner action is required for this Decision Inbox item.

