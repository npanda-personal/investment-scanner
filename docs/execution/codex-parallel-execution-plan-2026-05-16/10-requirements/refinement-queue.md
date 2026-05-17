# Refinement Queue

Date: 2026-05-18

Status: Refreshed by Team 00 after Product Owner resolved the five current Decision Inbox items. This queue is refinement-only; Team 00 owns Ready queue movement.

Team 00 promoted `CF-W1-L3-PORT-01A` to Ready on 2026-05-18. It is no longer a refinement item.

## Decision Inbox State

No open decisions.

Product Owner action not required.

Daemon should continue autonomous work.

The former Decision Inbox items moved to refinement / Ready-evaluation prep:

| ID | Approved policy | Next refinement need |
| --- | --- | --- |
| CF-W1-AUTH-01 | Option A: protected Team 09 controllers fail closed when `req.user.id` is missing. | Team 09/Team 03/Team 04 module-local backend packet, exact controller/test reservations, focused tests, and Team 00 Ready evaluation. |
| CF-W1-SUB-01 | Option A: ordinary users may not self-change plan or self-select `ADMIN`; plan changes are admin/manual only. | Team 09/Team 03/Team 04 backend-only packet, exact source/test reservations, focused tests, and frontend mismatch limitation record if needed. |
| CF-W1-UX-02 | Option B: Copilot-only first slice, research-support naming, blocked narrative hidden, no shared UI/navigation. | Team 08/Team 03/Team 04 Copilot-only contract refresh, source-supported trust-field fallback rules, exact backend/frontend/test reservations, and QA plan refresh. |
| CF-W1-UX-05 | Option A: Copilot-only copy cleanup after or with `CF-W1-UX-02`; no shared `StatusBadge` yet. | Child sequencing with `CF-W1-UX-02`, exact Copilot-only file reservations, and shared UI work kept future. |
| CF-W1-MD-01 | Option A: future-dated candles and invalid adjusted close rejected; missing adjusted close fallback/incomplete; suspicious volume warning; spike rejection opt-in. | Team 05/Team 03/Team 04 validation-only packet, focused QA refresh, exact validation source/test reservations, and no durable-storage/provider/schema scope. |

## Needs Post-Decision Architecture / QA Refresh

| ID | Resolved policy | Next refinement need |
| --- | --- | --- |
| CF-W1-L3-DQ-01 | Option B: passive `LIMITED` display with action-like blocking. | Child module contracts, DTO fields, QA scenarios, exact file reservations, and Team 00 Ready promotion. |
| CF-W1-TP-01A | Option B: backend-only compatibility direction. | Backend-only child packet as `CF-W1-TP-01B`, exact source/test file reservation, QA scenarios, and Team 00 Ready promotion. |
| CF-W1-MD-02 | Option B as ADR direction only: companion durable readiness/evidence storage. | Formal ADR, ADR QA checklist, and separate future implementation slice planning. |
| CF-W1-AUTH-01 | Option A fail-closed protected controllers. | Module-local Team 09 backend packet and exact reservation refresh. |
| CF-W1-SUB-01 | Option A admin/manual subscription plan changes only. | Module-local Team 09 backend packet and known frontend limitation handling. |
| CF-W1-UX-02 | Option B Copilot-only trust UX. | Copilot-only implementation packet, no shared UI/navigation, source-supported trust evidence only. |
| CF-W1-UX-05 | Option A Copilot-only copy cleanup. | Sequence behind or with `CF-W1-UX-02`; no shared `StatusBadge` reservation. |
| CF-W1-MD-01 | Option A validation hardening policy. | Market Data validation-only packet and focused QA refresh. |

## Needs Architecture Acceptance / Contract Finalization

| ID | Contract status |
| --- | --- |
| CF-W1-L3-PORT-01A | Promoted to Ready by Team 00 on 2026-05-18; implementation handoff copied to Team 07. |
| CF-W1-L3-PORT-01B | Watchlist-only child remains future after portfolio slice; do not combine without Team 00 exception. |
| CF-W1-L3-AUTH-03 | Requirement, architecture review, contract, work packet, and QA plan prepared; needs Team 00 Ready evaluation. |
| CF-W1-L3-ALERT-01 | Child contract, Team 03 reservation matrix, backend reservations, and QA plan prepared; needs Team 00 Ready evaluation. |
| CF-W1-L3-INTEL-01 | Requirement, architecture review, contract, work packet, and QA plan prepared; waits for accepted `CF-W1-L3-PORT-01A` portfolio readiness DTOs. |
| CF-W1-TP-01B | Backend-only child contract, Team 03 reservation matrix, backend reservations, Team 06 inspection, and QA plan prepared; needs Team 00 Ready evaluation. |
| CF-W1-NOTIF-02 | Requirement, architecture, contract, work packet, Team 03 reservation matrix, and platform QA plan prepared; needs Team 00/Team 09 Ready evaluation. |
| CF-W1-MD-02 | ADR direction accepted; formal ADR and separate future source/schema split remain. |
| CF-W1-AUTH-01 | Policy accepted; contract/work-packet needs refresh around allowed controller/test scope. |
| CF-W1-SUB-01 | Policy accepted; contract/work-packet needs backend-only refresh and UI limitation note. |
| CF-W1-UX-02 | Policy accepted; contract/work-packet needs Copilot-only trust-field and file-reservation refresh. |
| CF-W1-UX-05 | Policy accepted; contract/work-packet needs Copilot-only child sequencing. |
| CF-W1-MD-01 | Policy accepted; architecture/work-packet needs validation source/test reservations only. |

## Needs QA Plan / QA Refresh

| ID | QA focus/status |
| --- | --- |
| CF-W1-L3-PORT-01A | Child QA plan prepared; executable validation begins after Team 07 implementation in the dedicated worktree. |
| CF-W1-L3-PORT-01B | Child QA plan covers future watchlist slice; executable validation blocked until separate Team 00 handoff. |
| CF-W1-L3-AUTH-03 | QA plan prepared; executable validation blocked until Team 00 Ready promotion and implementation handoff. |
| CF-W1-L3-ALERT-01 | Child QA plan prepared; executable validation blocked until Team 00 Ready promotion and implementation handoff. |
| CF-W1-L3-INTEL-01 | QA plan prepared; executable validation blocked until `CF-W1-L3-PORT-01A` acceptance and Team 00 implementation handoff. |
| CF-W1-TP-01B | Child QA plan prepared; executable validation blocked until Team 00 Ready promotion and implementation handoff. |
| CF-W1-MD-02 | ADR direction accepted; no executable validation until future source/schema implementation is approved. |
| CF-W1-NOTIF-02 | Platform QA plan prepared; executable validation blocked until Ready promotion and implementation handoff. |
| CF-W1-AUTH-01 | Combined platform QA plan exists but must be refreshed against Option A before executable validation. |
| CF-W1-SUB-01 | Combined platform QA plan exists but must be refreshed against Option A before executable validation. |
| CF-W1-UX-02 | QA plan exists but must be refreshed against Option B Copilot-only scope; UI smoke remains blocked until exact spec/startup/resource plan exists. |
| CF-W1-UX-05 | QA plan prepared but must be refreshed against Option A Copilot-only first slice. |
| CF-W1-MD-01 | QA plan prepared but must be refreshed against Option A validation policy before executable validation. |

## Next Non-Blocked Architecture / QA Prep Candidates

These items are not implementation-ready.

| Rank | ID | Prep needed |
| --- | --- | --- |
| 1 | CF-W1-TP-01B | Team 00 Ready evaluation. |
| 2 | CF-W1-NOTIF-02 | Team 00/Team 09 Ready evaluation and implementation handoff. |
| 3 | CF-W1-L3-ALERT-01 | Team 00 Ready evaluation. |
| 4 | CF-W1-L3-AUTH-03 | Team 00 Ready evaluation. |
| 5 | CF-W1-MD-02 | Formal ADR and future slice plan under approved Option B ADR direction. |
| 6 | CF-W1-AUTH-01 | Refresh Team 09 fail-closed backend packet after Option A. |
| 7 | CF-W1-SUB-01 | Refresh Team 09 admin/manual-only backend packet after Option A. |
| 8 | CF-W1-MD-01 | Refresh Market Data validation-only packet after Option A. |
| 9 | CF-W1-UX-02 | Refresh Copilot-only trust UX packet after Option B. |
| 10 | CF-W1-UX-05 | Refresh Copilot-only copy cleanup as child of or companion to `CF-W1-UX-02`. |

## Current Priority Refinement Output

| ID | Useful next output | Owner to route |
| --- | --- | --- |
| CF-W1-TP-01B | Ready-promotion check for backend-only Trade Plan DQ hard-block implementation. | Team 00 |
| CF-W1-NOTIF-02 | Ready-promotion check and implementation handoff for notification log redaction. | Team 00 + Team 09 |
| CF-W1-L3-ALERT-01 | Ready-promotion check for alert readiness suppression implementation. | Team 00 |
| CF-W1-L3-AUTH-03 | Ready-promotion check for alert rule target ownership implementation. | Team 00 |
| CF-W1-MD-02 | Formal ADR for companion durable readiness/evidence storage and future slice plan. | Team 03 with Team 04 ADR QA checklist |
| CF-W1-L3-INTEL-01 | Hold as upstream-blocked until portfolio readiness DTO implementation is accepted. | Team 00 + Team 07 |
| CF-W1-AUTH-01 | Refresh platform fail-closed controller packet. | Team 09 + Team 03 + Team 04 |
| CF-W1-SUB-01 | Refresh local/manual subscription plan backend packet. | Team 09 + Team 03 + Team 04 |
| CF-W1-MD-01 | Refresh validation-hardening architecture/QA packet. | Team 05 + Team 03 + Team 04 |
| CF-W1-UX-02 | Refresh Copilot-only trust UX packet. | Team 08 + Team 03 + Team 04 |
| CF-W1-UX-05 | Refresh Copilot-only copy cleanup packet, sequenced with `CF-W1-UX-02`. | Team 08 + Team 03 + Team 04 |

## Decision Packet Routing

No current Decision Packet is open.

Create a new Decision Packet only if post-decision child preparation reveals a broader API/UI/stored-row migration, Prisma/schema/migration need, shared-file conflict, provider/startup requirement, unavailable trust evidence that needs product semantics, or unresolved product-language/UX policy.

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
