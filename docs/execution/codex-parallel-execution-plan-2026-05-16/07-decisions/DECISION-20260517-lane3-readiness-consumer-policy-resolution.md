# DECISION-20260517 Lane 3 Readiness Consumer Policy Resolution

Date: 2026-05-17

Status: Resolved by Product Owner

Decision Inbox source: `99-decision-inbox/DECISION-20260517-lane3-readiness-consumer-policy.md`

## Approved Option

Option B: passive `LIMITED` display with action-like blocking.

## Approved Policy

- `READY` supports trusted display and action-like workflows.
- `LIMITED` may appear only in passive portfolio, watchlist, or research contexts.
- `LIMITED` must show visible warnings, reasons, and no reliability or action labels.
- Alerts, action-like workflows, reliability labels, and trusted summaries require `READY`.
- Missing Data Quality, stale hard blockers, unsupported scope, `NOT_READY`, and `UNUSABLE` remain blocked.
- Child slices must not overclaim reliability.
- Implement one module at a time with focused tests.

## Not Approved

This decision does not approve:

- Prisma/schema changes.
- Backend or frontend route registry changes.
- Shared backend utility changes.
- Shared UI changes.
- Package manifest changes.
- Generated type changes.
- Provider or live-provider behavior.
- Startup/backfill behavior.
- Broad UI implementation.
- Push to `main` or `master`.

## Queue Impact

The Decision Inbox blocker for `CF-W1-L3-DQ-01` is resolved.

`CF-W1-L3-DQ-01` is not automatically Ready for Implementation. Team 03 and Team 04 must refresh child contracts, QA scenarios, and exact file reservations before Team 07 or another implementation team may pull a bounded module-local slice.

Recommended next child-slice preparation order:

1. `CF-W1-L3-PORT-01`: portfolio/watchlist passive display readiness DTO policy.
2. `CF-W1-L3-ALERT-01`: alert readiness suppression requiring `READY`.
3. `CF-W1-L3-INTEL-01`: portfolio-intelligence reliability gate.
4. Copilot/research trust surface only after separate UX scope acceptance.

## Product Owner Action

No further Product Owner action is required for this Decision Inbox item.

