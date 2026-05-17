# Refinement Queue

Date: 2026-05-17

Status: Refreshed by Team 02 Requirement Factory for the current daemon cycle after checking current module audits, active board, risk register, ready/blocked queues, next architecture contracts, and next validation plans. This queue is refinement-only; Team 00 owns Ready queue movement.

## Needs Product / UX / Architect Decision

| ID | Question |
| --- | --- |
| CF-W1-UX-02 | Should the product keep the `AI Investment Copilot` label, and should blocked summaries hide generated text or show diagnostic untrusted context? |
| CF-W1-UX-05 | Which advisory-feeling labels and status colors should be replaced first, especially shared status labels? |
| CF-W1-MD-01 | What are the accepted policies for future-dated candles, adjusted-close gaps, and suspicious price spikes? |

## Needs Post-Decision Architecture / QA Refresh

| ID | Resolved policy | Next refinement need |
| --- | --- | --- |
| CF-W1-L3-DQ-01 | Option B: passive `LIMITED` display with action-like blocking. | Child module contracts, DTO fields, QA scenarios, and exact file reservations. |
| CF-W1-TP-01A | Option B: backend-only compatibility direction. | Backend-only child packet, exact source/test file reservation, and QA scenarios. |
| CF-W1-MD-02 | Option B as ADR direction only: companion durable readiness/evidence storage. | Formal ADR, ADR QA checklist, and separate future implementation slice planning. |

## Blocked By Decision Inbox

No items are currently blocked by an open Decision Inbox entry.

If a new true consent blocker appears during Team 02 docs-only work, record it in the Team 02 outbox and ask Team 00 to route the decision.

## Needs Architecture Acceptance / Contract Finalization

| ID | Contract status |
| --- | --- |
| CF-W1-L3-DQ-01 | Product policy accepted; needs child architecture contracts and exact file reservations |
| CF-W1-TP-01A | Product policy accepted; needs backend-only child architecture contract and exact file reservations |
| CF-W1-MD-02 | ADR direction accepted; needs formal ADR and separate future implementation split |
| CF-W1-L3-ALERT-01 | Alert readiness suppression contract after `CF-W1-L3-DQ-01` |
| CF-W1-UX-02 | Copilot trust fields, blocked states, local deterministic proof, and UI scope |

## Needs QA Plan

| ID | QA focus/status |
| --- | --- |
| CF-W1-L3-DQ-01 | Policy accepted; QA needs child module scenario matrix before executable validation |
| CF-W1-TP-01A | Policy accepted; QA needs backend-only child scenario matrix before executable validation |
| CF-W1-MD-02 | ADR direction accepted; no executable validation until future source/schema implementation is approved |
| CF-W1-L3-ALERT-01 | Alert event suppression and DQ evidence tests |
| CF-W1-UX-02 | Copilot trusted, blocked, stale, scoped, deterministic-local, and safe empty states |
| CF-W1-MD-01 | Market Data validation tests for future dates, adjusted close, and spike policy |

## Next Non-Blocked Architecture / QA Prep Candidates

These items are not implementation-ready.

| Rank | ID | Prep needed |
| --- | --- | --- |
| 1 | CF-W1-L3-DQ-01 | Child module readiness contracts and QA scenarios under approved Option B. |
| 2 | CF-W1-TP-01A | Backend-only child contract and QA scenarios under approved Option B. |
| 3 | CF-W1-MD-02 | Formal ADR and future slice plan under approved Option B ADR direction. |
| 4 | CF-W1-MD-01 | Validation-policy clarification and QA plan for future-dated, adjusted-close, and suspicious-spike behavior. |
| 5 | CF-W1-UX-02 | Copilot trust UX contract refinement, Product/UX naming decision, blocked-state behavior, and QA validation scenarios. |

`CF-W1-UX-05` remains in refinement, but it is behind the current five because its QA checklist and shared UI reservation decision are less mature than `CF-W1-UX-02`.

## Current Priority Refinement Output

| ID | Useful next output | Owner to route |
| --- | --- | --- |
| CF-W1-L3-DQ-01 | Child-slice split, DTO fields, file reservations, and QA scenarios under approved Option B. | Team 03 with Team 04 QA refresh |
| CF-W1-TP-01A | Backend-only child packet, compatibility limitation language, exact file reservations, and QA scenarios under approved Option B. | Team 03 with Team 04 QA refresh |
| CF-W1-MD-02 | Formal ADR for companion durable readiness/evidence storage and future slice plan. | Team 03 with Team 04 ADR QA checklist |

## Decision Packet Routing

No new Decision Packet is required from the three resolved items. Create a new Decision Packet only if post-decision child preparation reveals a broader API/UI/stored-row migration, Prisma/schema/migration need, shared-file conflict, provider/startup requirement, or unresolved product-language/UX policy.

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
| CF-W1-TP-01 | Parent split into `CF-W1-TP-01A`, future `CF-W1-TP-01B`, and future `CF-W1-TP-02`. |
