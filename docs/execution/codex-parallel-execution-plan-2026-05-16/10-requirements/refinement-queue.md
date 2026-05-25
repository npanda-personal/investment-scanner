# Refinement Queue

Date: 2026-05-25

Status: Team 02 refreshed this refinement-only queue after a Research Hub evidence-date follow-up audit. `CF-W2-TSC-05A` is active with Team 07 and `CF-W1-DQ-02-RS1` QA planning is active with Team 04. Team 00 still owns Ready promotion and implementation routing.

## Active / Reserved Outside This Queue

These are real work items, but not fresh refinement-front candidates for this pass:

- `CF-W2-TSC-05A-TREV-RANKING-ELIGIBILITY-REFRAME` is active with Team 07.
- `CF-W1-DQ-02-RS1` QA planning is active with Team 04.
- Accepted, parked, or already-routed items stay excluded from fresh refinement, including `CF-W1-BT-03`, `CF-W1-BT-04`, `CF-W1-CAL-01A`, `CF-W1-TP-01A`, `CF-W1-DQ-02A`, `CF-W1-HCTX-03`, `CF-W1-MCTX-02`, `CF-W1-STRAT-04`, `CF-W1-SQLAB-03`, `CF-W1-RH-03`, `CF-W1-RH-02A`, `CF-W1-SIG-LATEST-01`, `CF-W1-SIG-TRIGGER-ENTRY-01`, `CF-W1-SMI-01`, `CF-W2-SIG-01A`, and `CF-W2-BT-05`.

## Current Refinement Stack

| Rank | ID | Why it stays next | Team 00 routing note |
| --- | --- | --- | --- |
| 1 | `CF-W2-CAL-02` | Calibration trust is still missing a truthful scoped evidence-through date and page-level evidence-basis summary. | Route Team 03 architecture first; keep the child additive and bounded to calibration-owned contracts/UI. |
| 2 | `CF-W1-MD-02A` | Durable market-data evidence remains the strongest upstream provenance gap still outside active routing. | Keep blocked by schema/storage consent until Team 00 intentionally opens the packet. |
| 3 | `CF-W1-SQLAB-02B` | Durable Signal Quality learning memory remains useful after the current direct trust slices. | Keep blocked by storage consent until Team 00 intentionally opens the packet. |
| 4 | `CF-W1-STRAT-02B` | Durable strategy revision history still matters for exact rule/version auditability. | Keep blocked by schema/generated/repository consent until Team 00 intentionally opens the packet. |
| 5 | `CF-W1-RH-01A` | Research Hub already exposes `evidenceDate` per actionability dimension, but the service does not populate it yet. | Keep behind `CF-W2-CAL-02`; route only as a bounded no-storage child with calibration dependency made explicit. |
| 6 | `CF-W1-L3-DQ-01A` | Passive Lane 3 readiness semantics remain a truthful DTO contract gap. | Keep contract-only until a bounded child can be defined without shared-file collisions. |
| 7 | `CF-W1-TSC-02` | Active candidate health remains important, but it is not independent of the current Today Review writer set. | Hold behind Team 07 completion of `TSC-05A`; do not route while Today Review files are reserved. |
| 8 | `CF-W1-TSC-03` residual/supporting-evidence path | Supporting evidence still matters, but it depends on Today Review plus stable supporting evidence slices. | Hold until Today Review files are free and dependencies are settled. |
| 9 | `CF-W1-UX-01` residual parent | Research Workbench trust gaps still exist. | Keep behind the core direct-value trust stack. |
| 10 | `CF-W1-UX-02` | Copilot trust UX still matters later. | Keep behind direct investor/trader value unless a trust blocker appears. |

## Audit Notes

- `CF-W2-CAL-02` is a genuinely new independent candidate surfaced by the calibration audit.
- `CF-W1-RH-01A` is a viable smaller no-storage follow-on surfaced by Team 01's Research Hub audit evidence.
- The queue now keeps active Team 07 and Team 04 work visible without pretending either item is unassigned.
- The three storage-oriented proposals remain worth preserving in rank order, but they must stay explicitly consent-gated.
- `CF-W1-TSC-02` was not removed; it remains below independent candidates because routing it now would collide with Team 07's Today Review scope.

## Team 02 Constraint Reminder

- Do not move anything to Ready from this file.
- Do not treat active `TSC-05A` or active `CF-W1-DQ-02-RS1` QA planning as unassigned discovery.
