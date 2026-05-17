# Blocked By Decision

Date: 2026-05-18

## Decision Inbox State

Five active implementation items are blocked by open Decision Inbox items.

| ID | Open decision | Owner needed | State |
| --- | --- | --- | --- |
| CF-W1-AUTH-01 | `DECISION-20260517-platform-auth-default-user-fallback-policy` | Product Owner + Architect + QA | Do not edit platform controllers until policy is resolved and a bounded packet is promoted. |
| CF-W1-SUB-01 | `DECISION-20260517-local-manual-subscription-plan-change-policy` | Product Owner + Architect + QA | Do not edit subscription source or UI until local/manual subscription policy is resolved and a bounded packet is promoted. |
| CF-W1-UX-02 | `DECISION-20260517-copilot-trust-ux-policy` | Product Owner + UX + Architect | Do not edit Copilot UI/backend or Playwright trust states until naming, blocked-summary, trust-field, and scope policy is resolved. |
| CF-W1-UX-05 | `DECISION-20260517-ux-product-language-status-policy` | Product Owner + UX + Architect | Do not edit Copilot/research/Market Data/shared status copy until first target surface and shared UI reservation are resolved. |
| CF-W1-MD-01 | `DECISION-20260517-market-data-validation-hardening-policy` | Product Owner + Architect + QA | Do not edit Market Data validation source/tests until future-date, adjusted-close, suspicious-volume, and spike policy is resolved. |

Team 00 reconciliation on 2026-05-18 found no stale or duplicate open decisions. All five decisions remain open and block only their scoped workstreams.

The three current Decision Inbox items were resolved on 2026-05-17:

- `DECISION-20260517-lane3-readiness-consumer-policy`: Option B approved.
- `DECISION-20260517-trade-plan-no-target-dq-hard-block`: Option B approved.
- `DECISION-20260517-market-data-durable-readiness-storage-adr`: Option B approved as ADR direction only.

## Still Blocked By Product / UX Policy Not Currently In Decision Inbox

| ID | Blocker | Owner |
| --- | --- | --- |
| CF-W1-TP-01 | Broad Trade Plan target geometry/API/UI/stored-row migration beyond the approved backend-only compatibility direction | Product Owner + Architect + QA |

## Moved Out Of Decision Blocker State

| ID | New state |
| --- | --- |
| CF-W1-L3-DQ-01 | Decision resolved; PORT and ALERT child contracts and QA plans are prepared, but Team 00 Ready promotion is still needed before source work. |
| CF-W1-TP-01A | Decision resolved; backend-only TP-01B child contract and QA plan are prepared, but Team 00 Ready promotion is still needed before source work. |
| CF-W1-MD-02 | ADR direction resolved; source/schema/test work remains blocked by shared/high-risk file and separate implementation-slice gates. |
| CF-W1-L3-ALERT-01 | No longer waiting on the parent policy decision; child alert-readiness contract and QA plan are prepared, but Team 00 Ready promotion is still needed before source work. |

## Not Blocked By Current Decision Inbox

These items are not blocked by the five current open decisions, but they remain out of Ready until Team 00 promotes exact implementation handoffs:

- `CF-W1-L3-PORT-01A`
- `CF-W1-TP-01B`
- `CF-W1-NOTIF-02`
- `CF-W1-L3-ALERT-01`
