# Refinement Queue

Date: 2026-05-17

Status: Refreshed by Team 02 Requirement Factory for the current daemon cycle after checking current module audits, active board, risk register, ready/blocked queues, next architecture contracts, and next validation plans. This queue is refinement-only; Team 00 owns Ready queue movement.

## Needs Product / UX / Architect Decision

| ID | Question |
| --- | --- |
| CF-W1-AUTH-01 | Should protected Team 09 controllers fail closed when `req.user.id` is missing, or may they retain controller-level `default-user` fallback? |
| CF-W1-SUB-01 | May ordinary authenticated local users change their own plan, including `ADMIN`, or must plan changes stay manual/admin-only? |
| CF-W1-UX-02 | Should the product keep the `AI Investment Copilot` label, and should blocked summaries hide generated text or show diagnostic untrusted context? |
| CF-W1-UX-05 | Which advisory-feeling labels and status colors should be replaced first, especially shared status labels? |
| CF-W1-MD-01 | What are the accepted policies for future-dated candles, adjusted-close gaps, and suspicious price spikes? |

`CF-W1-AUTH-01`, `CF-W1-SUB-01`, `CF-W1-UX-02`, `CF-W1-UX-05`, and `CF-W1-MD-01` already have Decision Inbox packets. Team 02 must not create duplicate packets.

## Needs Post-Decision Architecture / QA Refresh

| ID | Resolved policy | Next refinement need |
| --- | --- | --- |
| CF-W1-L3-DQ-01 | Option B: passive `LIMITED` display with action-like blocking. | Child module contracts, DTO fields, QA scenarios, and exact file reservations. |
| CF-W1-TP-01A | Option B: backend-only compatibility direction. | Backend-only child packet, exact source/test file reservation, and QA scenarios. |
| CF-W1-MD-02 | Option B as ADR direction only: companion durable readiness/evidence storage. | Formal ADR, ADR QA checklist, and separate future implementation slice planning. |

## Blocked By Decision Inbox

| ID | Open decision |
| --- | --- |
| CF-W1-AUTH-01 | `DECISION-20260517-platform-auth-default-user-fallback-policy` |
| CF-W1-SUB-01 | `DECISION-20260517-local-manual-subscription-plan-change-policy` |
| CF-W1-UX-02 | `DECISION-20260517-copilot-trust-ux-policy` |
| CF-W1-UX-05 | `DECISION-20260517-ux-product-language-status-policy` |
| CF-W1-MD-01 | `DECISION-20260517-market-data-validation-hardening-policy` |

If a new true consent blocker appears during Team 02 docs-only work, record it in the Team 02 outbox and ask Team 00 to route the decision.

## Needs Architecture Acceptance / Contract Finalization

| ID | Contract status |
| --- | --- |
| CF-W1-L3-PORT-01 | Child contract, backend reservations, and QA plan prepared; needs Team 00 child selection and Ready evaluation |
| CF-W1-L3-AUTH-03 | Requirement, architecture review, contract, work packet, and QA plan prepared; needs Team 00 Ready evaluation |
| CF-W1-L3-ALERT-01 | Child contract, backend reservations, and QA plan prepared; needs Team 00 Ready evaluation |
| CF-W1-L3-INTEL-01 | Requirement, architecture review, contract, work packet, and QA plan prepared; waits for accepted `CF-W1-L3-PORT-01A` portfolio readiness DTOs |
| CF-W1-TP-01B | Backend-only child contract, backend reservations, and QA plan prepared; needs Team 00 Ready evaluation |
| CF-W1-MD-02 | ADR direction accepted; needs formal ADR and separate future implementation split |
| CF-W1-NOTIF-02 | Requirement, architecture, contract, work packet, and platform QA plan prepared; needs Ready evaluation |
| CF-W1-UX-02 | Copilot trust fields, blocked states, local deterministic proof, and UI scope |
| CF-W1-UX-05 | Product-language/status contract and work packet prepared; blocked by first target/shared UI policy decision |

## Needs QA Plan

| ID | QA focus/status |
| --- | --- |
| CF-W1-L3-PORT-01 | Child QA plan prepared; executable validation blocked until Team 00 selection and implementation handoff |
| CF-W1-L3-AUTH-03 | QA plan prepared; executable validation blocked until Team 00 Ready promotion and implementation handoff |
| CF-W1-L3-ALERT-01 | Child QA plan prepared; executable validation blocked until Team 00 Ready promotion and implementation handoff |
| CF-W1-L3-INTEL-01 | QA plan prepared; executable validation blocked until `CF-W1-L3-PORT-01A` acceptance and Team 00 implementation handoff |
| CF-W1-TP-01B | Child QA plan prepared; executable validation blocked until Team 00 Ready promotion and implementation handoff |
| CF-W1-MD-02 | ADR direction accepted; no executable validation until future source/schema implementation is approved |
| CF-W1-NOTIF-02 | Platform QA plan prepared; executable validation blocked until Ready promotion and implementation handoff |
| CF-W1-UX-02 | Copilot trusted, blocked, stale, scoped, deterministic-local, and safe empty states |
| CF-W1-UX-05 | Product-language/status QA plan prepared; executable validation blocked until first target and shared UI policy are accepted |
| CF-W1-MD-01 | Market Data validation QA plan prepared; executable validation blocked until validation policy decision resolves |

## Next Non-Blocked Architecture / QA Prep Candidates

These items are not implementation-ready.

| Rank | ID | Prep needed |
| --- | --- | --- |
| 1 | CF-W1-L3-PORT-01 | Team 00 child slice selection and Ready evaluation. |
| 2 | CF-W1-L3-AUTH-03 | Team 00 Ready evaluation. |
| 3 | CF-W1-L3-ALERT-01 | Team 00 Ready evaluation. |
| 4 | CF-W1-TP-01B | Team 00 Ready evaluation. |
| 5 | CF-W1-NOTIF-02 | Team 00/Team 09 Ready evaluation and implementation handoff. |
| 6 | CF-W1-MD-02 | Formal ADR and future slice plan under approved Option B ADR direction. |
| 7 | CF-W1-MD-01 | Validation-policy clarification and QA plan for future-dated, adjusted-close, and suspicious-spike behavior. |

`CF-W1-UX-05` remains in refinement, but it is behind the current active prep candidates because its QA checklist and shared UI reservation decision are less mature than `CF-W1-UX-02`.

## Current Priority Refinement Output

| ID | Useful next output | Owner to route |
| --- | --- | --- |
| CF-W1-L3-PORT-01 | Ready-promotion check and child slice selection for portfolio/watchlist readiness DTO implementation. | Team 00 |
| CF-W1-L3-AUTH-03 | Ready-promotion check for alert rule target ownership implementation. | Team 00 |
| CF-W1-L3-ALERT-01 | Ready-promotion check for alert readiness suppression implementation. | Team 00 |
| CF-W1-TP-01B | Ready-promotion check for backend-only Trade Plan DQ hard-block implementation. | Team 00 |
| CF-W1-MD-02 | Formal ADR for companion durable readiness/evidence storage and future slice plan. | Team 03 with Team 04 ADR QA checklist |
| CF-W1-NOTIF-02 | Ready-promotion check and implementation handoff for notification log redaction. | Team 00 + Team 09 |
| CF-W1-L3-INTEL-01 | Hold as upstream-blocked until portfolio readiness DTO implementation is accepted. | Team 00 + Team 07 |
| CF-W1-MD-01 | Decision routing for validation hardening policy; no source/test execution. | Product Owner + Architect + QA |
| CF-W1-UX-05 | Decision routing for first target surface and shared UI policy. | Product Owner + UX + Architect |

## Decision Packet Routing

No new Decision Packet is required from the three resolved items. Create a new Decision Packet only if post-decision child preparation reveals a broader API/UI/stored-row migration, Prisma/schema/migration need, shared-file conflict, provider/startup requirement, or unresolved product-language/UX policy.

Existing open Decision Packets already cover `CF-W1-AUTH-01`, `CF-W1-SUB-01`, `CF-W1-UX-02`, `CF-W1-UX-05`, and `CF-W1-MD-01`; Team 02 should not duplicate them.

## Completed Or Split Out Of Active Refinement

| ID | Disposition |
| --- | --- |
| CF-W1-QA-01 | Completed as documentation-only focused command matrix. |
| CF-W1-L3-AUTH-01 | Completed portfolio/watchlist child ownership implementation; local commit `74ba6dd`. |
| CF-W1-L3-AUTH-02 | Completed bounded alert event ownership through parent rule owner; local commit `503bcd9`. |
| CF-W1-SIG-TRIGGER-01 | Completed bounded optional Signal Generation trigger DTO projection; local commit `6ab3999`. Full persisted trigger snapshot / normalized trigger model / downstream adoption remains future work. |
| CF-W2-DQ-01 | Completed Data Quality fail-closed defaults. |
| CF-W2-SIG-01A | Completed Signal Generation run-path DQ fail-closed behavior. |
| CF-W1-SIG-01B | Completed trusted signal list read-path filtering. |
| CF-W1-SIG-LATEST-01 | Completed latest-instrument DQ gating. |
| CF-W1-STRAT-01 | Completed bounded Strategy Decision Option B-Strict compatibility. |
| CF-W1-SIG-01 | Parent split; do not pull as active implementation. |
| CF-W1-DQ-01 | Superseded by `CF-W2-DQ-01`; downstream consumers need separate requirements. |
| CF-W1-TP-01 | Parent split into policy `CF-W1-TP-01A`, active child `CF-W1-TP-01B`, and future broader target-geometry/API/UI migration `CF-W1-TP-02`. |
