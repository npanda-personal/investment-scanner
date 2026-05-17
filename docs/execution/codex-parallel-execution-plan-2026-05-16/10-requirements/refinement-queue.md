# Refinement Queue

Date: 2026-05-17

Status: Refreshed by Team 02 Requirement Factory after `CF-W1-L3-AUTH-01` completion and new Decision Inbox blockers.

## Needs Product / UX / Architect Decision

| ID | Question |
| --- | --- |
| CF-W1-TP-01A | What replaces Trade Plan target-price geometry in user-facing output, and which DQ states hard-block paper-review readiness? |
| CF-W1-L3-DQ-01 | Should portfolio/watchlist surfaces display limited data while action-like alerts and reliability claims remain blocked? |
| CF-W1-MD-02 | Which durable OHLC/readiness evidence storage model and natural key should be accepted before Prisma or source changes? |
| CF-W1-UX-02 | Should the product keep the `AI Investment Copilot` label, and should blocked summaries hide generated text or show diagnostic untrusted context? |
| CF-W1-L3-AUTH-02 | Should alert event ownership be stored directly on events or enforced through owned alert rules? |
| CF-W1-SIG-TRIGGER-01 | Which trigger contract implementation path is approved: DTO projection, persisted snapshot, or normalized trigger table? |
| CF-W1-UX-05 | Which advisory-feeling labels and status colors should be replaced first, especially shared status labels? |
| CF-W1-MD-01 | What are the accepted policies for future-dated candles, adjusted-close gaps, and suspicious price spikes? |

## Blocked By Decision Inbox

| ID | Decision blocker | Required resolution before app-code readiness |
| --- | --- | --- |
| CF-W1-L3-AUTH-02 | `99-decision-inbox/DECISION-20260517-alert-event-ownership-model.md` | Product Owner + Architect choose direct event owner, rule-owner join, or deferral. |
| CF-W1-SIG-TRIGGER-01 | `99-decision-inbox/DECISION-20260517-trigger-object-contract-path.md` | Product Owner + Architect choose DTO projection, persisted snapshot, or normalized trigger table path. |

## Needs Architecture Contract

| ID | Contract needed |
| --- | --- |
| CF-W1-TP-01A | Trade Plan no-target compatibility, DQ hard-block, API/UI migration boundary |
| CF-W1-L3-DQ-01 | Lane 3 readiness consumer policy for portfolio, watchlist, alerts, and portfolio intelligence |
| CF-W1-L3-AUTH-02 | Alert event ownership boundary; hold pending Decision Inbox resolution |
| CF-W1-L3-ALERT-01 | Alert readiness suppression contract after `CF-W1-L3-DQ-01` |
| CF-W1-UX-02 | Copilot trust fields, blocked states, local deterministic proof, and UI scope |
| CF-W1-MD-02 | Durable Market Data readiness evidence / natural key ADR and storage-model decision packet |
| CF-W1-SIG-TRIGGER-01 | Full root trigger object completion contract; hold pending Decision Inbox resolution |

## Needs QA Plan

| ID | QA focus |
| --- | --- |
| CF-W1-TP-01A | Trade Plan no-target compatibility, DQ hard-block states, and API/frontend compatibility risks |
| CF-W1-L3-DQ-01 | Lane 3 display-only versus action-like readiness scenarios |
| CF-W1-MD-02 | ADR QA checklist for natural key, provenance, migration, rollback, DQE handoff, and no-source/no-provider constraints |
| CF-W1-L3-ALERT-01 | Alert event suppression and DQ evidence tests |
| CF-W1-UX-02 | Copilot trusted, blocked, stale, scoped, deterministic-local, and safe empty states |
| CF-W1-MD-01 | Market Data validation tests for future dates, adjusted close, and spike policy |
| CF-W1-SIG-TRIGGER-01 | Trigger object contract fields, rule provenance, DQ status, lifecycle state, and auditability; hold pending Decision Inbox resolution |

## Next Non-Blocked Architecture / QA Prep Candidates

These items may continue as docs-only prep while `CF-W1-L3-AUTH-02` and `CF-W1-SIG-TRIGGER-01` wait in Decision Inbox. They are not implementation-ready.

| Rank | ID | Prep needed |
| --- | --- | --- |
| 1 | CF-W1-TP-01A | Architecture contract and QA scenarios for no-target compatibility and DQ hard-block states. |
| 2 | CF-W1-MD-02 | ADR packet and ADR QA checklist for durable readiness evidence and natural key. |
| 3 | CF-W1-MD-01 | Validation-policy clarification and QA plan for future-dated, adjusted-close, and suspicious-spike behavior. |
| 4 | CF-W1-UX-05 | Product/UX copy refinement and QA checklist for research-support labels and status language. |

## Completed Or Split Out Of Active Refinement

| ID | Disposition |
| --- | --- |
| CF-W1-QA-01 | Completed as documentation-only focused command matrix. |
| CF-W1-L3-AUTH-01 | Completed portfolio/watchlist child ownership implementation; local commit `74ba6dd`. |
| CF-W2-DQ-01 | Completed Data Quality fail-closed defaults. |
| CF-W2-SIG-01A | Completed Signal Generation run-path DQ fail-closed behavior. |
| CF-W1-SIG-01B | Completed trusted signal list read-path filtering. |
| CF-W1-SIG-LATEST-01 | Completed latest-instrument DQ gating. |
| CF-W1-STRAT-01 | Completed bounded Strategy Decision Option B-Strict compatibility. |
| CF-W1-SIG-01 | Parent split; do not pull as active implementation. |
| CF-W1-DQ-01 | Superseded by `CF-W2-DQ-01`; downstream consumers need separate requirements. |
| CF-W1-TP-01 | Parent split into `CF-W1-TP-01A`, future `CF-W1-TP-01B`, and future `CF-W1-TP-02`. |
