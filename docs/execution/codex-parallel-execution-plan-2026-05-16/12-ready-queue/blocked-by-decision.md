# Blocked By Decision

Date: 2026-05-17

## Decision Inbox State

No active implementation item is blocked by an open Decision Inbox item.

The three current Decision Inbox items were resolved on 2026-05-17:

- `DECISION-20260517-lane3-readiness-consumer-policy`: Option B approved.
- `DECISION-20260517-trade-plan-no-target-dq-hard-block`: Option B approved.
- `DECISION-20260517-market-data-durable-readiness-storage-adr`: Option B approved as ADR direction only.

## Still Blocked By Product / UX Policy Not Currently In Decision Inbox

| ID | Blocker | Owner |
| --- | --- | --- |
| CF-W1-UX-02 | Copilot naming, trust surface, blocked-state behavior, and UI scope | Product Owner + UX + Architect |
| CF-W1-SUB-01 | Whether local self-plan changes are allowed during validation | Product Owner |
| CF-W1-TP-01 | Broad Trade Plan target geometry/API/UI/stored-row migration beyond the approved backend-only compatibility direction | Product Owner + Architect + QA |
| CF-W1-AUTH-01 | Whether authenticated platform routes may retain `default-user` fallback behavior | Product Owner + Architect |

## Moved Out Of Decision Blocker State

| ID | New state |
| --- | --- |
| CF-W1-L3-DQ-01 | Decision resolved; needs child contracts, QA scenarios, exact file reservations, and implementation handoff before Ready. |
| CF-W1-TP-01A | Decision resolved; needs refreshed backend-only child work packet, QA scenarios, exact file reservations, and implementation handoff before Ready. |
| CF-W1-MD-02 | ADR direction resolved; source/schema/test work remains blocked by shared/high-risk file and separate implementation-slice gates. |
| CF-W1-L3-ALERT-01 | No longer waiting on the parent policy decision, but still blocked by child alert-readiness contract, QA handoff, and exact file reservation. |

