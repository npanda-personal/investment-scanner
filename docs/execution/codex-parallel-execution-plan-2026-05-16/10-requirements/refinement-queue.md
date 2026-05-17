# Refinement Queue

Date: 2026-05-17

Status: Refreshed by Team 02 Requirement Factory for the current daemon cycle after checking current module audits, active board, risk register, ready/blocked queues, next architecture contracts, and next validation plans. This queue is refinement-only; Team 00 owns Ready queue movement.

## Needs Product / UX / Architect Decision

| ID | Question |
| --- | --- |
| CF-W1-L3-DQ-01 | Should portfolio/watchlist surfaces display limited data while action-like alerts and reliability claims remain blocked? |
| CF-W1-TP-01A | What replaces Trade Plan target-price geometry in user-facing output, which API/UI compatibility boundaries apply, and which DQ states hard-block paper-review readiness? |
| CF-W1-MD-02 | Which durable OHLC/readiness evidence storage model, natural key, migration/rollback path, and query/test strategy should be accepted before Prisma or source changes? |
| CF-W1-UX-02 | Should the product keep the `AI Investment Copilot` label, and should blocked summaries hide generated text or show diagnostic untrusted context? |
| CF-W1-UX-05 | Which advisory-feeling labels and status colors should be replaced first, especially shared status labels? |
| CF-W1-MD-01 | What are the accepted policies for future-dated candles, adjusted-close gaps, and suspicious price spikes? |

## Blocked By Decision Inbox

The following items are blocked from implementation by open Decision Inbox entries. Docs-only refinement, option framing, architecture prep, and QA planning may continue.

| ID | Decision Inbox blocker | Implementation impact |
| --- | --- | --- |
| CF-W1-L3-DQ-01 | `DECISION-20260517-lane3-readiness-consumer-policy` | No portfolio/watchlist/alerts/portfolio-intelligence/copilot readiness consumer implementation until display-vs-action policy is accepted. |
| CF-W1-TP-01A | `DECISION-20260517-trade-plan-no-target-dq-hard-block` | No Trade Plan source/API/UI compatibility work until no-target replacement semantics and DQ hard-block behavior are accepted. |
| CF-W1-MD-02 | `DECISION-20260517-market-data-durable-readiness-storage-adr` | No Prisma, schema, source, provider, startup, or executable storage validation work until durable evidence storage direction is accepted. |

If a new true consent blocker appears during Team 02 docs-only work, record it in the Team 02 outbox and ask Team 00 to route the decision.

## Needs Architecture Acceptance / Contract Finalization

| ID | Contract status |
| --- | --- |
| CF-W1-L3-DQ-01 | Draft exists; needs Product/Architect acceptance for Lane 3 readiness policy for portfolio, watchlist, alerts, and portfolio intelligence |
| CF-W1-TP-01A | Draft exists; needs Product/Architect acceptance for Trade Plan no-target compatibility, DQ hard-block, and API/UI migration boundary |
| CF-W1-MD-02 | Draft exists; needs ADR/decision packet for durable Market Data readiness evidence, natural key, and storage model |
| CF-W1-L3-ALERT-01 | Alert readiness suppression contract after `CF-W1-L3-DQ-01` |
| CF-W1-UX-02 | Copilot trust fields, blocked states, local deterministic proof, and UI scope |

## Needs QA Plan

| ID | QA focus/status |
| --- | --- |
| CF-W1-L3-DQ-01 | Draft exists; final Lane 3 display-only versus action-like readiness scenarios depend on accepted policy |
| CF-W1-TP-01A | Draft exists; final Trade Plan no-target, DQ hard-block, and API/frontend compatibility scenarios depend on accepted semantics |
| CF-W1-MD-02 | ADR QA checklist draft exists; no executable validation until storage/natural-key ADR is accepted |
| CF-W1-L3-ALERT-01 | Alert event suppression and DQ evidence tests |
| CF-W1-UX-02 | Copilot trusted, blocked, stale, scoped, deterministic-local, and safe empty states |
| CF-W1-MD-01 | Market Data validation tests for future dates, adjusted close, and spike policy |

## Next Non-Blocked Architecture / QA Prep Candidates

These items are not implementation-ready.

| Rank | ID | Prep needed |
| --- | --- | --- |
| 1 | CF-W1-L3-DQ-01 | Lane 3 display-vs-action readiness policy contract and QA scenarios. |
| 2 | CF-W1-TP-01A | Architecture contract and QA scenarios for no-target compatibility and DQ hard-block states. |
| 3 | CF-W1-MD-02 | ADR packet and ADR QA checklist for durable readiness evidence and natural key. |
| 4 | CF-W1-MD-01 | Validation-policy clarification and QA plan for future-dated, adjusted-close, and suspicious-spike behavior. |
| 5 | CF-W1-UX-02 | Copilot trust UX contract refinement, Product/UX naming decision, blocked-state behavior, and QA validation scenarios. |

`CF-W1-UX-05` remains in refinement, but it is behind the current five because its QA checklist and shared UI reservation decision are less mature than `CF-W1-UX-02`.

## Current Priority Refinement Output

| ID | Useful next output | Owner to route |
| --- | --- | --- |
| CF-W1-L3-DQ-01 | Product/Architect policy options for display-only, limited-review, alert/action blocking, DTO fields, and child-slice split. | Team 03 with Team 00 decision routing if consent is needed |
| CF-W1-TP-01A | Product/Architect options for target compatibility, replacement output fields, DQ hard blockers, `LIMITED` behavior, and backend-vs-frontend split. | Team 03 with Team 00 decision routing if consent is needed |
| CF-W1-MD-02 | ADR option matrix for `PriceTick` expansion, companion OHLC evidence table, durable readiness evidence table, or explicitly limited derived-evidence claims. | Team 03 with Team 04 ADR QA checklist |

## Recommended Decision Packets For Team 00 Routing

Team 02 found product-policy ambiguity but did not create or edit Decision Inbox files under this write scope.

| ID | Recommended packet | Why |
| --- | --- | --- |
| CF-W1-L3-DQ-01 | Lane 3 display-vs-action readiness policy | Required before portfolio/watchlist/alerts/portfolio-intelligence can distinguish display-only data from action-like or reliability-bearing output. |
| CF-W1-TP-01A | Trade Plan no-target replacement and DQ hard-block policy | Required before source work can remove target-price geometry without breaking API/UI compatibility or creating fail-open paper-review readiness. |
| CF-W1-MD-02 | Durable readiness evidence storage and natural-key ADR | Required before any Prisma, schema, source, provider, startup, backfill, or executable validation scope can be proposed. |

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
