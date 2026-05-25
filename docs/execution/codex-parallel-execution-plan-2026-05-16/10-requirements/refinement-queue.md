# Refinement Queue

Date: 2026-05-25

Status: Team 00 updated after Product Owner redirected the signal workflow away from Trade Plan, R:R, arbitrary targets, and target-price framing. This queue is refinement-only and tracks what stays behind the new Trusted Signal Candidate direction. Team 05's pipeline command API work is committed, and the B6 compact-indicator follow-up is active separately; neither is part of this refinement stack.

Team 00 override: `CF-W1-BT-03`, `CF-W1-CAL-01A`, `CF-W1-TP-01A`, and `CF-W1-DQ-02A` are accepted parked branch commits, not fresh refinement-front items.

Team 02 rolling update: `CF-W1-TSC-01A-SIG` is active with Team 06 and `CF-W1-DQ-03` is active with Team 05. `CF-W1-TSC-01A-TREV`, `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE`, `CF-W2-BT-05`, and `CF-W1-BT-04` have now moved through the implementation/validation gates and should not stay in the fresh refinement front.

## Current Refinement Stack Behind The Top Five

| Rank | ID | Why it stays next | Team 00 routing note |
| --- | --- | --- | --- |
| 1 | `CF-W2-TSC-04` | Today Review should remove target/reward and Trade Plan-style wording that conflicts with the trusted signal candidate direction. | Fresh planning candidate; planning-only, and Team 03/04 can prepare bounded contract/QA now that `TSC-03A` released Today Review files. |
| 2 | `CF-W2-TSC-05` | Today Review ranking and eligibility still need a no-target reframe beyond copy cleanup. | Fresh planning candidate; planning-only, and route to Team 03 for a bounded split before implementation. |
| 3 | `CF-W1-TSC-02` | Trusted candidates still need rule-based health tracking after entry until exit, invalidation, expiry, or blockage. | Fresh planning candidate; requirement-ready, and Team 03 refinement can follow the Today Review cleanup slices. |
| 4 | `CF-W1-DQ-02` residual parent | `DQ-02A` is complete, but the parent still has read-side/public-contract scope that may need a bounded no-schema child. | Blocked by the residual read-side/public-contract split decision until Team 03 confirms a bounded follow-up. |
| 5 | `CF-W1-MD-02A` | Durable market-data evidence storage still has clear investor value, but it is consent-gated. | Blocked by schema/storage consent until Team 00 opens the durable evidence packet. |
| 6 | `CF-W1-SQLAB-02B` | Durable Signal Quality learning memory remains useful after the current read/review trust slices. | Blocked by storage consent until Team 00 opens the durable memory packet. |
| 7 | `CF-W1-STRAT-02B` | Durable strategy revision history still matters for explainability and review trust. | Blocked by schema/migration/generated/repository consent until Team 00 opens the revision-history packet. |
| 8 | `CF-W1-L3-DQ-01A` | Passive readiness display semantics remain a real Lane 3 trust contract gap. | Contract-only until Team 03/04 define a bounded child that does not collide with active Lane 3 work or shared UI rules. |
| 9 | `CF-W1-UX-02` | Copilot trust UX still matters, but it remains downstream of the core data and strategy trust stack. | Downstream trust UX candidate; keep behind direct investor/trader value unless a trust blocker appears. |
| 10 | `CF-W1-UX-05` | Copilot-only product language cleanup can reduce advice-like wording after trust UX scope is clear. | Downstream copy-cleanup candidate; fold into or follow `CF-W1-UX-02`, and do not reserve shared UI yet. |

## Audit-Backed Notes

- `audit-fresh-direct-value-gaps-2026-05-20.md` confirms the current top five stay ahead of all other fresh gaps. No new evidence outranks `CF-W1-HCTX-03`, `CF-W1-DQ-03`, `CF-W1-MCTX-02`, `CF-W1-STRAT-04`, or `CF-W1-SQLAB-03`.
- The 2026-05-24 Product Owner direction pauses `CF-W1-TP-03` as currently framed. Do not execute Trade Plan proof freshness work unless it is reframed into Trusted Signal Candidate health with no R:R, target, or Trade Plan-first UX.
- `CF-W1-SIG-TRIGGER-ENTRY-01` is accepted and locally committed as `649e645`, so Team 02 should not keep it in the fresh refinement front.
- `CF-W1-TSC-02` now captures the next active signal health gap after candidate adoption.
- `CF-W1-DQ-02A` is accepted and locally committed as `c2d6753`; only the `DQ-02` residual parent stays in this stack behind active TSC/DQ work.
- `CF-W1-SQLAB-01` is accepted and locally committed as `1a41d95`; `CF-W1-SQLAB-02A` is promoted and assigned, so the next Signal Quality storage child remains `CF-W1-SQLAB-02B`.
- `CF-W1-BT-04` is accepted and locally committed as `2bd794f`; it no longer belongs in the fresh refinement front.
- `CF-W3-MDPIPE-01B4` is accepted and locally committed as `8d45ddc`; do not treat it as fresh refinement-front work.
- `CF-W3-MDPIPE-01B6` is active Team 08 frontend-only work; do not treat it as fresh refinement-front work.

## Not Fresh Discovery

These items remain valid but should stay out of the immediate refinement front:

- `CF-W1-RH-03`
- `CF-W1-L3-TREV-02`
- `CF-W1-L3-INTEL-03`
- `CF-W1-L3-AUTH-03`
- `CF-W1-L3-DQ-01B`
- `CF-W1-L3-INTEL-02`
- `CF-W1-RH-01`
- `CF-W1-RH-02A`
- `CF-W1-MD-04`
- `CF-W1-HCTX-02`
- `CF-W1-MD-03`
- `CF-W1-MCTX-01`
- `CF-W1-TP-02`
- `CF-W1-SIG-02`
- `CF-W1-STRAT-03`
- `CF-W1-L3-WATCH-01`
- `CF-W1-BT-02`
- `CF-W1-CAL-01`
- `CF-W3-MDPIPE-01B4`
- `CF-W3-MDPIPE-01B6`

Reason: active, accepted, parked, or already assigned in the Ready flow.

## Teams Ready For New Prep

- Team 02: keep rolling discovery active after Team 03/04 consume `CF-W2-TSC-04` and `CF-W2-TSC-05`.
- Team 03: prepare architecture/file-reservation readiness for `CF-W2-TSC-04`, `CF-W2-TSC-05`, and then `CF-W1-TSC-02`.
- Team 04: prepare QA plans for the Today Review cleanup slices and the next active-signal-health slice, including rejection checks for invented trigger prices, target/R:R leakage, direct advice wording, and table regressions.
- Team 00: keep `CF-W2-TSC-04` and `CF-W2-TSC-05` out of Ready until architecture, QA, exact file reservations, source inspection, and sequencing pass. Keep `CF-W1-TP-03` paused as framed. Keep `CF-W3-MDPIPE-01B4` and `CF-W3-MDPIPE-01B6` out of Team 02 routing.

## Team 02 Constraint Reminder

Do not move anything to Ready from this file.
