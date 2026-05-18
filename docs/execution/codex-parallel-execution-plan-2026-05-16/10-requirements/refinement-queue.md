# Refinement Queue

Date: 2026-05-18

Status: Refreshed by Team 02 after Team 03/04 post-decision readiness refresh evidence. This queue is refinement-only; Team 00 owns Ready queue movement.

Team 00 promoted `CF-W1-L3-PORT-01A` to Ready on 2026-05-18. It is no longer a refinement item.

The current Ready-promotion front-runners after the PORT-01A rework routing are `CF-W1-TP-01B`, `CF-W1-NOTIF-02`, and `CF-W1-L3-ALERT-01`.

## New Audit-Derived Requirements

These are the newest high-value discovery items from read-only module audits. None is Ready for Implementation.

| Rank | ID | Next gate |
| --- | --- | --- |
| 1 | CF-W1-STRAT-02 | Product refinement and architecture contract for durable rule provenance and explicit DQ-gated strategy trust. |
| 2 | CF-W1-SQLAB-02 | Product refinement and architecture contract for durable learning memory from measured signal outcomes. |
| 3 | CF-W1-BT-02 | Product refinement and architecture contract for trusted, partial, diagnostic, and legacy-repaired review outcomes. |
| 4 | CF-W1-CAL-01 | Product refinement and architecture contract for trusted versus diagnostic calibration outputs. |
| 5 | CF-W1-HCTX-01 | Product refinement and architecture contract for selected-snapshot provenance and gap explanation. |
| 6 | CF-W1-MCTX-01 | Product refinement and bounded architecture contract for regime evidence and partial-context explanation. |
| 7 | CF-W1-SQLAB-01 | Product refinement and architecture contract for trusted versus untrusted signal-quality outputs. |
| 8 | CF-W1-L3-TREV-01 | Product refinement and architecture contract for trusted publication, withheld-candidate explanation, and readiness coherence. |
| 9 | CF-W1-L3-ALERT-03 | Product refinement and bounded architecture contract for post-trigger review outcomes and review-note persistence. |
| 10 | CF-W1-L3-INTEL-03 | Product refinement and bounded architecture contract for explainable concentration and exposure review. |
| 11 | CF-W1-L3-WATCH-01 | Product refinement and bounded architecture contract for explainable watchlist review priority and reason summaries. |
| 12 | CF-W1-L3-INTEL-02 | Product refinement and architecture contract for explainable portfolio intelligence review output. |

## Decision Inbox State

No open decisions.

Product Owner action not required.

Daemon should continue autonomous work.

The former Decision Inbox items moved to refinement / Ready-evaluation prep:

| ID | Approved policy | Next refinement need |
| --- | --- | --- |
| CF-W1-AUTH-01 | Option A: protected Team 09 controllers fail closed when `req.user.id` is missing. | Team 03 contract/work packet and Team 04 QA refresh are prepared; needs Team 00 Ready evaluation and a sequenced Team 09 implementation handoff. Do not run in parallel with `CF-W1-SUB-01`; combine only if Team 00 records exact shared-file reservations. |
| CF-W1-SUB-01 | Option A: ordinary users may not self-change plan or self-select `ADMIN`; plan changes are admin/manual only. | Team 03 contract/work packet and Team 04 QA refresh are prepared; needs Team 00 Ready evaluation and a sequenced Team 09 implementation handoff. Prefer sequencing after `CF-W1-AUTH-01`; combine only if Team 00 records exact shared-file reservations. |
| CF-W1-UX-02 | Option B: Copilot-only first slice, research-support naming, blocked narrative hidden, no shared UI/navigation. | Team 03 contract/work packet and Team 04 QA refresh are prepared; still needs Team 08 source-supported trust-field mapping, Team 00 Ready evaluation, and no shared UI/navigation scope. |
| CF-W1-UX-05 | Option A: Copilot-only copy cleanup after or with `CF-W1-UX-02`; no shared `StatusBadge` yet. | Team 03 contract/work packet and Team 04 QA refresh are prepared for the Copilot-only first child; sequence after or fold into `CF-W1-UX-02`. |
| CF-W1-MD-01 | Option A: future-dated candles and invalid adjusted close rejected; missing adjusted close fallback/incomplete; suspicious volume warning; spike rejection opt-in. | Team 03 validation-only contract/work packet and Team 04 QA refresh are prepared; needs Team 05 readiness acceptance and Team 00 Ready evaluation. No durable-storage/provider/schema scope. |

## Post-Decision Architecture / QA Refresh State

| ID | Resolved policy | Next refinement need |
| --- | --- | --- |
| CF-W1-L3-DQ-01 | Option B: passive `LIMITED` display with action-like blocking. | Child module contracts, DTO fields, QA scenarios, exact file reservations, and Team 00 Ready promotion. |
| CF-W1-TP-01A | Option B: backend-only compatibility direction. | Backend-only child packet as `CF-W1-TP-01B`, exact source/test file reservation, QA scenarios, and Team 00 Ready promotion. |
| CF-W1-MD-02 | Option B as ADR direction only: companion durable readiness/evidence storage. | Formal ADR, ADR QA checklist, and separate future implementation slice planning. |
| CF-W1-AUTH-01 | Option A fail-closed protected controllers. | Contract/work packet and QA refresh prepared; needs Team 00 Ready evaluation and Team 09 handoff. |
| CF-W1-SUB-01 | Option A admin/manual subscription plan changes only. | Contract/work packet and QA refresh prepared; needs Team 00 Ready evaluation and Team 09 handoff, preferably sequenced with `CF-W1-AUTH-01`. |
| CF-W1-UX-02 | Option B Copilot-only trust UX. | Contract/work packet and QA refresh prepared; needs Team 08 source-supported trust-field mapping and Team 00 Ready evaluation. |
| CF-W1-UX-05 | Option A Copilot-only copy cleanup. | Contract/work packet and QA refresh prepared; first child must sequence with or fold into `CF-W1-UX-02`. |
| CF-W1-MD-01 | Option A validation hardening policy. | Validation-only contract/work packet and QA refresh prepared; needs Team 05 readiness acceptance and Team 00 Ready evaluation. |

## Needs Architecture Acceptance / Contract Finalization

| ID | Contract status |
| --- | --- |
| CF-W1-L3-PORT-01A | Promoted to Ready by Team 00 on 2026-05-18; implementation handoff copied to Team 07. |
| CF-W1-L3-PORT-01B | Watchlist-only child remains future after portfolio slice; do not combine without Team 00 exception. |
| CF-W1-L3-AUTH-03 | Requirement, architecture review, contract, work packet, and QA plan prepared; needs Team 00 Ready evaluation. |
| CF-W1-L3-ALERT-01 | Child contract, Team 03 reservation matrix, backend reservations, and QA plan prepared; needs Team 00 Ready evaluation. |
| CF-W1-L3-INTEL-01 | Requirement, architecture review, contract, work packet, and QA plan prepared; waits for accepted `CF-W1-L3-PORT-01A` portfolio readiness DTOs. |
| CF-W1-STRAT-02 | Audit-derived requirement draft | Product refinement drafted | QA plan needed | Future Strategy Framework backend/frontend child only after Team 00/03 reservation | durable rule provenance and DQ-gated trust remain explicit | Keep future-child prep; not Ready |
| CF-W1-L3-TREV-01 | Audit-derived requirement draft | Product refinement drafted | QA plan needed | Future Today Review backend/frontend child only after Team 00/03 reservation | publication coherence and readiness mismatch remain explicit | Keep future-child prep; not Ready |
| CF-W1-SQLAB-02 | Audit-derived requirement draft | Product refinement drafted | QA plan needed | Future signal-quality-lab backend child only after Team 00/03 reservation | Durable signal-outcome learning memory remains explicit | Keep future-child prep; not Ready |
| CF-W1-BT-02 | Audit-derived requirement draft | Product refinement drafted | QA plan needed | Future backtesting-strategy-lab backend/frontend child only after Team 00/03 reservation | review outcome trust, diagnostic framing, and repair/benchmark warnings remain explicit | Keep future-child prep; not Ready |
| CF-W1-CAL-01 | Audit-derived requirement draft | Product refinement drafted | QA plan needed | Future signal-calibration-engine backend child only after Team 00/03 reservation | DQ-as-penalty behavior and missing hard gates remain explicit | Keep future-child prep; not Ready |
| CF-W1-HCTX-01 | Audit-derived requirement draft | Product refinement drafted | QA plan needed | Future historical-context-snapshots backend child only after Team 00/03 reservation | Selected-snapshot provenance and gap explanation remain explicit | Keep future-child prep; not Ready |
| CF-W1-MCTX-01 | Audit-derived requirement draft | Product refinement drafted | QA plan needed | Future market-context-intelligence backend child only after Team 00/03 reservation | Regime evidence and partial-context explanation remain explicit | Keep future-child prep; not Ready |
| CF-W1-SQLAB-01 | Audit-derived requirement draft; future Signal Quality Lab child remains outside Ready until a Team 00/03 reservation and contract are prepared. |
| CF-W1-TP-01B | Backend-only child contract, Team 03 reservation matrix, backend reservations, Team 06 inspection, and QA plan prepared; needs Team 00 Ready evaluation. |
| CF-W1-NOTIF-02 | Requirement, architecture, contract, work packet, Team 03 reservation matrix, and platform QA plan prepared; needs Team 00/Team 09 Ready evaluation. |
| CF-W1-MD-02 | ADR direction accepted; formal ADR and separate future source/schema split remain. |
| CF-W1-AUTH-01 | Policy accepted; Team 03 contract/work packet prepared around module-local Team 09 controller/test scope; needs Team 00 Ready evaluation. |
| CF-W1-SUB-01 | Policy accepted; Team 03 backend-only contract/work packet prepared with UI limitation note; needs Team 00 Ready evaluation. |
| CF-W1-UX-02 | Policy accepted; Team 03 Copilot-only contract/work packet refreshed; needs Team 08 source-supported trust-field mapping and Team 00 Ready evaluation. |
| CF-W1-UX-05 | Policy accepted; Team 03 Copilot-only child sequencing refreshed; should fold into or follow `CF-W1-UX-02`. |
| CF-W1-MD-01 | Policy accepted; Team 03 validation-only contract/work packet prepared with source/test reservations only; needs Team 05 readiness acceptance and Team 00 Ready evaluation. |

## Needs QA Plan / QA Refresh

| ID | QA focus/status |
| --- | --- |
| CF-W1-L3-TREV-01 | QA plan needed; executable validation blocked until Team 00/03 reservation and implementation handoff. |
| CF-W1-SQLAB-02 | QA plan needed; executable validation blocked until Team 00/03 reservation and implementation handoff. |
| CF-W1-BT-02 | QA plan needed; executable validation blocked until Team 00/03 reservation and implementation handoff. |
| CF-W1-L3-PORT-01A | Child QA plan prepared; executable validation begins after Team 07 implementation in the dedicated worktree. |
| CF-W1-L3-PORT-01B | Child QA plan covers future watchlist slice; executable validation blocked until separate Team 00 handoff. |
| CF-W1-L3-AUTH-03 | QA plan prepared; executable validation blocked until Team 00 Ready promotion and implementation handoff. |
| CF-W1-L3-ALERT-01 | Child QA plan prepared; executable validation blocked until Team 00 Ready promotion and implementation handoff. |
| CF-W1-L3-INTEL-01 | QA plan prepared; executable validation blocked until `CF-W1-L3-PORT-01A` acceptance and Team 00 implementation handoff. |
| CF-W1-STRAT-02 | QA plan needed; executable validation blocked until Team 00/03 reservation and implementation handoff. |
| CF-W1-CAL-01 | QA plan needed; executable validation blocked until Team 00/03 reservation and implementation handoff. |
| CF-W1-HCTX-01 | QA plan needed; executable validation blocked until Team 00/03 reservation and implementation handoff. |
| CF-W1-MCTX-01 | QA plan needed; executable validation blocked until Team 00/03 reservation and implementation handoff. |
| CF-W1-SQLAB-01 | QA plan needed; executable validation blocked until Team 00/03 reservation and implementation handoff. |
| CF-W1-TP-01B | Child QA plan prepared; executable validation blocked until Team 00 Ready promotion and implementation handoff. |
| CF-W1-MD-02 | ADR direction accepted; no executable validation until future source/schema implementation is approved. |
| CF-W1-NOTIF-02 | Platform QA plan prepared; executable validation blocked until Ready promotion and implementation handoff. |
| CF-W1-AUTH-01 | Team 04 Option A platform QA refresh prepared; executable validation blocked until Ready promotion and Team 09 implementation handoff. |
| CF-W1-SUB-01 | Team 04 Option A platform QA refresh prepared; executable validation blocked until Ready promotion and Team 09 implementation handoff. |
| CF-W1-UX-02 | Team 04 Option B Copilot-only QA refresh prepared; UI smoke remains blocked until exact implementation handoff, source-supported trust mapping, startup/resource plan, and Ready promotion exist. |
| CF-W1-UX-05 | Team 04 Option A Copilot-only QA refresh prepared; executable validation should run with or after the `CF-W1-UX-02` Copilot handoff. |
| CF-W1-MD-01 | Team 04 Option A validation QA refresh prepared; executable validation blocked until Team 05 readiness acceptance, exact handoff, and Team 00 Ready promotion. |

## Next Non-Blocked Architecture / QA Prep Candidates

These items are not implementation-ready.

| Rank | ID | Prep needed |
| --- | --- | --- |
| 1 | CF-W1-L3-TREV-01 | Team 00/03 reservation and QA plan for prepared Today Review publication-evidence packet. |
| 2 | CF-W1-SQLAB-02 | Team 00/03 reservation and QA plan for prepared signal outcome journal packet. |
| 3 | CF-W1-BT-02 | Team 00/03 reservation and QA plan for prepared backtesting outcome-review packet. |
| 4 | CF-W1-L3-ALERT-03 | Team 00/03 reservation and QA plan for prepared alert follow-through packet. |
| 5 | CF-W1-L3-INTEL-03 | Team 00/03 reservation and QA plan for prepared portfolio concentration-review packet. |
| 6 | CF-W1-L3-WATCH-01 | Team 00/03 reservation and QA plan for prepared watchlist review-actionability packet. |
| 7 | CF-W1-CAL-01 | Team 00/03 reservation and QA plan for prepared Signal Calibration reliability packet. |
| 8 | CF-W1-HCTX-01 | Team 00/03 reservation and QA plan for prepared Historical Context explainability packet. |
| 9 | CF-W1-MCTX-01 | Team 00/03 reservation and QA plan for prepared Market Context regime-evidence packet. |
| 10 | CF-W1-TP-01B | Team 00 Ready evaluation. |
| 11 | CF-W1-NOTIF-02 | Team 00/Team 09 Ready evaluation and implementation handoff. |

## Current Priority Refinement Output

| ID | Useful next output | Owner to route |
| --- | --- | --- |
| CF-W1-STRAT-02 | Strategy Framework rule-versioning and DQ-gate contract and QA plan. | Team 00 / Team 03 |
| CF-W1-L3-TREV-01 | Today Review publication-evidence contract and QA plan. | Team 00 / Team 03 |
| CF-W1-SQLAB-02 | Signal outcome journal and post-event learning contract and QA plan. | Team 00 / Team 03 |
| CF-W1-BT-02 | Backtesting outcome-review contract and QA plan. | Team 00 / Team 03 |
| CF-W1-CAL-01 | Signal Calibration trust-state contract and QA plan. | Team 00 / Team 03 |
| CF-W1-HCTX-01 | Historical Context explainability contract and QA plan. | Team 00 / Team 03 |
| CF-W1-MCTX-01 | Market Context regime-evidence contract and QA plan. | Team 00 / Team 03 |
| CF-W1-SQLAB-01 | Signal Quality outcome-confidence contract and QA plan. | Team 00 / Team 03 |
| CF-W1-L3-ALERT-03 | Alert follow-through contract and QA plan. | Team 00 / Team 03 |
| CF-W1-L3-INTEL-03 | Portfolio concentration-review contract and QA plan. | Team 00 / Team 03 |
| CF-W1-L3-WATCH-01 | Watchlist review-actionability contract and QA plan. | Team 00 / Team 03 |
| CF-W1-TP-01B | Ready-promotion check for backend-only Trade Plan DQ hard-block implementation. | Team 00 |
| CF-W1-NOTIF-02 | Ready-promotion check and implementation handoff for notification log redaction. | Team 00 + Team 09 |
| CF-W1-L3-ALERT-01 | Ready-promotion check for alert readiness suppression implementation. | Team 00 |
| CF-W1-L3-AUTH-03 | Ready-promotion check for alert rule target ownership implementation. | Team 00 |
| CF-W1-MD-02 | Formal ADR for companion durable readiness/evidence storage and future slice plan. | Team 03 with Team 04 ADR QA checklist |
| CF-W1-L3-INTEL-01 | Hold as upstream-blocked until portfolio readiness DTO implementation is accepted. | Team 00 + Team 07 |
| CF-W1-AUTH-01 | Team 00 Ready evaluation for prepared fail-closed controller packet. | Team 00 + Team 09 |
| CF-W1-SUB-01 | Team 00 Ready evaluation for prepared local/manual subscription plan backend packet. | Team 00 + Team 09 |
| CF-W1-MD-01 | Team 05 readiness acceptance and Team 00 Ready evaluation for prepared validation-hardening packet. | Team 05 + Team 00 |
| CF-W1-UX-02 | Team 08 source-supported trust-field mapping and Team 00 Ready evaluation for prepared Copilot-only trust UX packet. | Team 08 + Team 00 |
| CF-W1-UX-05 | Sequence or fold Copilot-only copy cleanup into `CF-W1-UX-02`; no separate shared UI handoff. | Team 08 + Team 00 |

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
