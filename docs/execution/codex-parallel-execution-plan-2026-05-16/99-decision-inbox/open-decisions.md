# Open Decisions

Date: 2026-05-18

## Current Open Decisions

| Decision ID | Title | Owner Needed | Severity | Affected Module | Status | Created Date | Blocks Which Work | Parallel Work Still Available |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DECISION-20260517-platform-auth-default-user-fallback-policy | Authenticated route `default-user` fallback policy | Product Owner + Architect + QA | High | `subscription-billing`, `notifications-delivery` | Open | 2026-05-17 | `CF-W1-AUTH-01` controller fail-closed implementation | `CF-W1-NOTIF-02` redaction contract/QA prep; unrelated Lane 1/2/3 prep |
| DECISION-20260517-local-manual-subscription-plan-change-policy | Local/manual subscription self-plan change policy | Product Owner + Architect + QA | Medium | `subscription-billing`, optional subscription UI | Open | 2026-05-17 | `CF-W1-SUB-01` subscription policy implementation | `CF-W1-NOTIF-02` redaction contract/QA prep; unrelated auth audit and docs-only refinement |
| DECISION-20260517-copilot-trust-ux-policy | Copilot trust UX naming and blocked-summary policy | Product Owner + UX + Architect | Medium | `ai-investment-copilot`, optional `stock-research-workbench` | Open | 2026-05-17 | `CF-W1-UX-02` implementation and `CF-W1-QA-UI-01` Playwright trust-state validation | Team 08 docs-only audit/refinement; unrelated Lane 1/2/3/9 prep |
| DECISION-20260517-ux-product-language-status-policy | First target for product-language and status-color cleanup | Product Owner + UX + Architect | Medium | `ai-investment-copilot`, `research-hub`, `market-data-foundation`, shared UI | Open | 2026-05-17 | `CF-W1-UX-05` implementation and shared status-color changes | Team 08 docs-only audit/refinement; unrelated Lane 1/2/3/9 prep |
| DECISION-20260517-market-data-validation-hardening-policy | Market Data validation policy for future-dated candles, adjusted close, suspicious volume, and spike handling | Product Owner + Architect + QA | Medium | `market-data-foundation` | Open | 2026-05-17 | `CF-W1-MD-01` validation source/test implementation | `CF-W1-MD-02` ADR work; unrelated docs-only refinement |

Product Owner action is required for these policy blockers before related application-code work can move to Ready.

Unrelated autonomous docs-only prep can continue.

## Team 00 Reconciliation - 2026-05-18

Team 00 consumed Team 01 audit output and cross-checked this index against `07-decisions/`, `00-control/active-work-board.md`, and `00-control/risk-register.md`.

| Decision ID | Classification | Blocks specific work only | Notes |
| --- | --- | --- | --- |
| `DECISION-20260517-platform-auth-default-user-fallback-policy` | Still open | Yes, `CF-W1-AUTH-01` | No matching resolution doc exists under `07-decisions/`. |
| `DECISION-20260517-local-manual-subscription-plan-change-policy` | Still open | Yes, `CF-W1-SUB-01` | No matching resolution doc exists under `07-decisions/`. |
| `DECISION-20260517-copilot-trust-ux-policy` | Still open | Yes, `CF-W1-UX-02` and `CF-W1-QA-UI-01` | No matching resolution doc exists under `07-decisions/`. |
| `DECISION-20260517-ux-product-language-status-policy` | Still open | Yes, `CF-W1-UX-05` | No matching resolution doc exists under `07-decisions/`. |
| `DECISION-20260517-market-data-validation-hardening-policy` | Still open | Yes, `CF-W1-MD-01` | No matching resolution doc exists under `07-decisions/`. |

Already resolved decisions remain in the resolved sections below and are not duplicated in the current open-decision table.

Stale decisions closed this reconciliation: none.

Duplicated decisions found this reconciliation: none.

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
