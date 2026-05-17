# Open Decisions

Date: 2026-05-17

No open decisions.

Product Owner action not required.

Daemon should continue autonomous work.

## Resolved This Cycle

| Decision ID | Resolution | Resolution Doc | Implementation Impact |
| --- | --- | --- | --- |
| DECISION-20260517-lane3-readiness-consumer-policy | Option B approved: passive `LIMITED` display with action-like blocking. | `07-decisions/DECISION-20260517-lane3-readiness-consumer-policy-resolution.md` | Removes the Decision Inbox blocker for `CF-W1-L3-DQ-01`; child slices still need exact contracts, QA scenarios, file reservations, and implementation handoffs. |
| DECISION-20260517-trade-plan-no-target-dq-hard-block | Option B approved: backend-only compatibility direction. | `07-decisions/DECISION-20260517-trade-plan-no-target-dq-hard-block-resolution.md` | Removes the Decision Inbox blocker for `CF-W1-TP-01A`; source work still needs refreshed backend-only child packet, QA scenarios, and exact reservations. |
| DECISION-20260517-market-data-durable-readiness-storage-adr | Option B approved as ADR direction only: companion durable readiness/evidence storage. | `07-decisions/DECISION-20260517-market-data-durable-readiness-storage-adr-resolution.md` | Removes the Decision Inbox blocker for `CF-W1-MD-02`; no Prisma/schema/source/test implementation is approved by this resolution. |

## Standing Authorization Reminder

Standing worktree, commit, and scoped push authorization to `dev` is recorded in `98-orchestrator/standing-delegation-policy.md`.

Push remains allowed only when all standing push gates pass. Force push and push to `main` or `master` are forbidden.

## Prior Resolved Decisions

- `DECISION-20260517-alert-event-ownership-model`: resolved as Option B, parent `AlertRule` owner for the first bounded backend slice.
- `DECISION-20260517-trigger-object-contract-path`: resolved as Option A, optional module-local Signal Generation trigger DTO projection only.

