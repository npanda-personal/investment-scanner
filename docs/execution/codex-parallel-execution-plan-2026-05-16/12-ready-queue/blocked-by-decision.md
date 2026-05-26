# Blocked By Decision

Date: 2026-05-18

## Decision Inbox State

Two workstreams are currently blocked by open Product Owner decisions.

`99-decision-inbox/open-decisions.md` reports two open decisions: `CF-W1-MD-02B` and `CF-W1-DQ-02-RS1`. The previously open policy items were resolved on 2026-05-18 and remain refinement/Ready-promotion candidates only.

## Currently Blocked By Open Decision

| ID | Decision | Blocker | Routing |
| --- | --- | --- | --- |
| CF-W1-MD-02B | `99-decision-inbox/DECISION-20260526-md-02b-schema-generated-consent.md` | Market Data durable companion evidence work would require Prisma schema, migration, generated client/types, and Market Data writer reservations. | Keep `CF-W1-MD-02A` proposal-only; no schema/generated/source implementation until resolved. |
| CF-W1-DQ-02-RS1 | `99-decision-inbox/DECISION-20260525-dq-rs1-currentness-summary-parity.md` | Team 10 and Team 03 found no bounded DQE-only path that satisfies both bounded summary behavior and reconstructed summary/helper parity. | Stop current Team 05 RS1 rework. Decide whether to reduce scope or open upstream bulk/durable evidence work first. |

## Resolved This Cycle, Still Not Ready

| ID | Resolution | Remaining gate |
| --- | --- | --- |
| CF-W1-AUTH-01 | `07-decisions/DECISION-20260517-platform-auth-default-user-fallback-policy-resolution.md` | Decision resolved; implementation routed through combined Ready handoff `CF-W1-AUTH-SUB-01`. |
| CF-W1-SUB-01 | `07-decisions/DECISION-20260517-local-manual-subscription-plan-change-policy-resolution.md` | Decision resolved; implementation routed through combined Ready handoff `CF-W1-AUTH-SUB-01`. |
| CF-W1-UX-02 | `07-decisions/DECISION-20260517-copilot-trust-ux-policy-resolution.md` | Team 03/04 contract, work packet, and QA refresh prepared; needs Team 08 source-supported trust-field mapping and Team 00 Ready promotion. |
| CF-W1-UX-05 | `07-decisions/DECISION-20260517-ux-product-language-status-policy-resolution.md` | Team 03/04 Copilot-only child packet and QA refresh prepared; needs sequencing after or folding into `CF-W1-UX-02`; no shared UI scope. |
| CF-W1-MD-01 | `07-decisions/DECISION-20260517-market-data-validation-hardening-policy-resolution.md` | Team 03/04 validation-only contract, work packet, and QA refresh prepared; needs Team 05 readiness acceptance and Team 00 Ready promotion. |

## Still Blocked By Product / UX Policy Not Currently In Decision Inbox

| ID | Blocker | Owner |
| --- | --- | --- |
| CF-W1-TP-01 | Broad Trade Plan target geometry/API/UI/stored-row migration beyond the approved backend-only compatibility direction | Product Owner + Architect + QA |

## Not Blocked By Current Decision Inbox

These items are not blocked by Product Owner decisions, but they remain out of Ready until Team 00 promotes exact implementation handoffs:

- `CF-W1-L3-PORT-01A`
- `CF-W1-TP-01B`
- `CF-W1-NOTIF-02`
- `CF-W1-L3-ALERT-01`
- `CF-W1-L3-AUTH-03`
- `CF-W1-AUTH-01`
- `CF-W1-SUB-01`
- `CF-W1-UX-02`
- `CF-W1-UX-05`
- `CF-W1-MD-01`
- `CF-W2-SPL-02`
