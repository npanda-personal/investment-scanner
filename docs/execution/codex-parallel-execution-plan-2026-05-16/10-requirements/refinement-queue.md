# Refinement Queue

Date: 2026-05-20

Status: Team 02 follow-up refresh after confirming the 2026-05-20 top five drafts remain the highest fresh direct investor/trader-value items. This queue is refinement-only and now tracks what stays behind those five without duplicating Team 03's active architecture prep for `CF-W1-HCTX-03`, `CF-W1-DQ-03`, and `CF-W1-MCTX-02`.

Team 00 override: `CF-W1-BT-03`, `CF-W1-CAL-01A`, `CF-W1-TP-01A`, and `CF-W1-DQ-02A` are accepted parked branch commits, not fresh refinement-front items.

## Current Refinement Stack Behind The Top Five

| Rank | ID | Why it stays next | Team 00 routing note |
| --- | --- | --- | --- |
| 1 | `CF-W1-TP-03` | Trade Plan proof snapshots need an explicit current/stale label and mixed-proof reason summary. | Keep refinement-only; Team 03 should stop and split if the first child needs schema, route, shared UI, or policy reinterpretation. |
| 2 | `CF-W1-BT-04` | Backtesting saved runs need a current-proof label so older simulations do not read like the latest proof window. | Keep refinement-only; Team 03 should stop and split if the first child needs schema, route, shared UI, or advanced validation scope. |
| 3 | `CF-W1-DQ-02` residual parent | `DQ-02A` is complete, but the parent still has read-side/public-contract scope that may need a bounded no-schema child. | Team 03 should identify a bounded follow-up or keep the residual parent blocked. |
| 4 | `CF-W1-L3-DQ-01A` | Passive readiness display semantics remain a real Lane 3 trust contract gap. | Keep contract-only unless Team 03/04 define a bounded child that does not collide with active Lane 3 work. |
| 5 | `CF-W1-MD-02A` | Durable market-data evidence storage still has clear investor value, but it is consent-gated. | Keep proposal-only until schema/generated/repository consent opens. |
| 6 | `CF-W1-SQLAB-02B` | Durable Signal Quality learning memory remains useful after the current read/review trust slices. | Keep proposal-only until storage/schema/repository/generated consent opens. |
| 7 | `CF-W1-STRAT-02B` | Durable strategy revision history still matters for explainability and review trust. | Keep proposal-only until schema/migration/generated/repository approval opens. |
| 8 | `CF-W1-L3-ALERT-03` | Alert follow-through traceability is useful, but it is lower value than current market-data, DQ, strategy, trade-plan, and backtesting trust gaps. | Keep behind the direct-value trust stack unless it becomes a correctness or privacy blocker. |
| 9 | `CF-W1-UX-02` | Copilot trust UX still matters, but it remains downstream of the core data and strategy trust stack. | Keep behind direct investor/trader value unless a trust blocker appears. |
| 10 | `CF-W1-UX-05` | Research-support copy cleanup is still useful, but not ahead of core evidence gaps. | Keep proposal-only until higher-value trust slices clear. |

## Audit-Backed Notes

- `audit-fresh-direct-value-gaps-2026-05-20.md` confirms the current top five stay ahead of all other fresh gaps. No new evidence outranks `CF-W1-HCTX-03`, `CF-W1-DQ-03`, `CF-W1-MCTX-02`, `CF-W1-STRAT-04`, or `CF-W1-SQLAB-03`.
- The same audit justifies two new bounded drafts behind the top five: `CF-W1-TP-03` for Trade Plan proof freshness labels and `CF-W1-BT-04` for Backtesting current-proof labels.
- `audit-research-hub-explainability-2026-05-20.md` does not justify a new requirement ID. Its findings map to the already drafted `CF-W1-RH-03` explainability child, so Team 02 should not duplicate that work.
- No fresh unclaimed Today Review requirement was found beyond active `CF-W1-L3-TREV-02`.
- `CF-W1-DQ-02A` is accepted and locally committed as `c2d6753`; only the `DQ-02` residual parent stays in this stack behind `TP-03` and `BT-04`.
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

- Team 03: continue active architecture prep for `CF-W1-HCTX-03`, `CF-W1-DQ-03`, and `CF-W1-MCTX-02`; next follow-ons remain `CF-W1-STRAT-04` and `CF-W1-SQLAB-03`.
- Team 04: keep QA planning aligned with the same order; do not pull residual or consent-gated items ahead of the current top five.
- Team 00: keep the current top five order intact unless new evidence beats it; after that, route `CF-W1-TP-03`, `CF-W1-BT-04`, `CF-W1-DQ-02` residual work, and `CF-W1-L3-DQ-01A` before any consent-gated storage proposals or lower-value admin/settings/notification convenience work.

## Team 02 Constraint Reminder

Do not move anything to Ready from this file.
