# Refinement Queue

Date: 2026-05-24

Status: Team 00 updated after Product Owner redirected the signal workflow away from Trade Plan, R:R, arbitrary targets, and target-price framing. This queue is refinement-only and tracks what stays behind the new Trusted Signal Candidate direction.

Team 00 override: `CF-W1-BT-03`, `CF-W1-CAL-01A`, `CF-W1-TP-01A`, and `CF-W1-DQ-02A` are accepted parked branch commits, not fresh refinement-front items.

Team 02 rolling update: `CF-W1-TSC-01A-SIG` is active with Team 06 and `CF-W1-DQ-03` is active with Team 05. The current front below is the next unassigned refinement stack after those active pulls.

## Current Refinement Stack Behind The Top Five

| Rank | ID | Why it stays next | Team 00 routing note |
| --- | --- | --- | --- |
| 1 | `CF-W1-TSC-01A-TREV` | Today Review should adopt the accepted Team 06 signal bridge into Trusted Signal Candidate groups and daily review counts. | Not Ready until Team 06 bridge acceptance and Team 03/04 Today Review reservations pass. |
| 2 | `CF-W1-BT-04` | Backtesting saved runs need a current-proof label so older saved simulations do not read like the latest proof window. | Keep refinement-only behind active TSC/DQ work; Team 04 QA planning can run later. |
| 3 | `CF-W1-TSC-02` | Trusted candidates need rule-based health tracking after entry until exit, invalidation, expiry, or blockage. | New requirement draft; Team 03 refinement after active TSC-01A/DQ-03 gates settle. |
| 4 | `CF-W1-DQ-02` residual parent | `DQ-02A` is complete, but the parent still has read-side/public-contract scope that may need a bounded no-schema child. | Team 03 should identify a bounded follow-up or keep the residual parent blocked. |
| 5 | `CF-W1-L3-DQ-01A` | Passive readiness display semantics remain a real Lane 3 trust contract gap. | Keep contract-only unless Team 03/04 define a bounded child that does not collide with active Lane 3 work. |
| 6 | `CF-W1-MD-02A` | Durable market-data evidence storage still has clear investor value, but it is consent-gated. | Keep proposal-only until schema/generated/repository consent opens. |
| 7 | `CF-W1-SQLAB-02B` | Durable Signal Quality learning memory remains useful after the current read/review trust slices. | Keep proposal-only until storage/schema/repository/generated consent opens. |
| 8 | `CF-W1-STRAT-02B` | Durable strategy revision history still matters for explainability and review trust. | Keep proposal-only until schema/migration/generated/repository approval opens. |
| 9 | `CF-W1-UX-02` | Copilot trust UX still matters, but it remains downstream of the core data and strategy trust stack. | Keep behind direct investor/trader value unless a trust blocker appears. |
| 10 | `CF-W1-UX-05` | Copilot-only product language cleanup can reduce advice-like wording after trust UX scope is clear. | Fold into or follow `CF-W1-UX-02`; do not reserve shared UI yet. |

## Audit-Backed Notes

- `audit-fresh-direct-value-gaps-2026-05-20.md` confirms the current top five stay ahead of all other fresh gaps. No new evidence outranks `CF-W1-HCTX-03`, `CF-W1-DQ-03`, `CF-W1-MCTX-02`, `CF-W1-STRAT-04`, or `CF-W1-SQLAB-03`.
- The 2026-05-24 Product Owner direction pauses `CF-W1-TP-03` as currently framed. Do not execute Trade Plan proof freshness work unless it is reframed into Trusted Signal Candidate health with no R:R, target, or Trade Plan-first UX.
- `CF-W1-SIG-TRIGGER-ENTRY-01` is accepted and locally committed as `649e645`, so Team 02 should not keep it in the fresh refinement front.
- `CF-W1-TSC-01A` is now the front refinement item because it directly adopts source-proven trigger evidence into the Product Owner's trusted candidate, entry trigger price, reason summary, and health-tracking workflow.
- Today Review still needs architecture-approved adoption and exact file reservations before any `Highly Trusted` implementation can ship.
- The 2026-05-20 backtesting proof-basis audit keeps `CF-W1-BT-03` parked and reinforces `CF-W1-BT-04` as the fresh backtesting current-proof slice.
- `audit-research-hub-explainability-2026-05-20.md` does not justify a new requirement ID. Its findings map to the already drafted `CF-W1-RH-03` explainability child, so Team 02 should not duplicate that work.
- No fresh unclaimed Today Review requirement was found beyond active `CF-W1-L3-TREV-02`.
- `CF-W1-TSC-01A-SIG` is active with Team 06 and `CF-W1-DQ-03` is active with Team 05; neither should be duplicated in the unassigned refinement stack.
- `CF-W1-TSC-02` now captures the next active signal health gap after candidate adoption.
- `CF-W1-DQ-02A` is accepted and locally committed as `c2d6753`; only the `DQ-02` residual parent stays in this stack behind active TSC/DQ work and `BT-04`.
- `CF-W1-SQLAB-01` is accepted and locally committed as `1a41d95`; `CF-W1-SQLAB-02A` is promoted and assigned, so the next Signal Quality storage child remains `CF-W1-SQLAB-02B`.

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

Reason: active, accepted, parked, or already assigned in the Ready flow.

## Teams Ready For New Prep

- Team 02: `CF-W1-TSC-01A` requirement draft exists; keep rolling discovery active after Team 03/04 consume it.
- Team 03: prepare architecture/file-reservation readiness for `CF-W1-TSC-01A`, including any bounded Today Review to Signal Generation service-contract adoption.
- Team 04: prepare a QA plan for `CF-W1-TSC-01A`, including rejection checks for invented trigger prices, target/R:R leakage, direct advice wording, and Today Review table regressions.
- Team 00: keep `CF-W1-TSC-01A` out of Ready until architecture, QA, exact file reservations, source inspection, and sequencing pass. Keep `CF-W1-TP-03` paused as framed.

## Team 02 Constraint Reminder

Do not move anything to Ready from this file.
