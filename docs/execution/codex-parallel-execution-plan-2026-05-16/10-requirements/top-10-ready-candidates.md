# Top 10 Candidate Queue

Date: 2026-05-24

Status: Team 00 updated after Product Owner redirected signal workflow away from Trade Plan, R:R, arbitrary targets, and target-price framing. This file is a docs-only candidate view, not proof of implementation readiness. Team 00 owns all Ready queue movement.

Team 00 override: `CF-W1-BT-03`, `CF-W1-CAL-01A`, `CF-W1-TP-01A`, and `CF-W1-DQ-02A` are accepted and locally committed parked branches, not fresh candidates.

Team 02 rolling update: `CF-W1-TSC-01A-SIG` is active with Team 06 and `CF-W1-DQ-03` is active with Team 05. The table below lists the next unassigned Product Owner candidates after those active pulls; it does not move any item to Ready.

## Team 02 Current Read

| Rank | ID | Why now | Next gate |
| --- | --- | --- | --- |
| 1 | `CF-W1-TSC-01A-TREV` | Today Review still needs to consume the Team 06 signal bridge and expose trusted candidate grouping without Trade Plan/R:R framing. | Team 00 promotes only after Team 06 bridge acceptance, architecture/QA confirmation, and exact Team 07 reservations. |
| 2 | `CF-W1-BT-04` | Backtesting saved runs need current-proof labels so older saved simulations do not read like current proof. | Architecture prepared; Team 04 QA planning and Team 00 Ready evaluation later. |
| 3 | `CF-W1-TSC-02` | Active Trusted Signal Candidates need rule-based health tracking until exit, invalidation, expiry, or blockage. | New requirement draft; Team 03 architecture/refinement only after TSC-01A and DQ-03 gates settle. |
| 4 | `CF-W1-DQ-02` residual parent | `DQ-02A` is complete, but parent read-side/public-contract scope remains split-required. | Team 03 should identify a bounded no-schema follow-up or keep the parent blocked. |
| 5 | `CF-W1-L3-DQ-01A` | Passive readiness DTO semantics remain a contract gap, but not a fresh implementation pull. | Contract refresh only unless Team 03/04 define a bounded child. |
| 6 | `CF-W1-MD-02A` | Market-data evidence storage is useful, but schema / generated / repository consent is required. | Proposal-only until explicit storage consent opens. |
| 7 | `CF-W1-SQLAB-02B` | Durable Signal Quality learning memory remains useful after current read/review trust slices. | Proposal-only until storage consent opens. |
| 8 | `CF-W1-STRAT-02B` | Durable strategy revision history remains useful for explainability. | Proposal-only until schema/generated/repository consent opens. |
| 9 | `CF-W1-UX-02` | Copilot trust UX is still valuable but downstream of core signal evidence. | Keep Copilot-only behind direct signal/data/backtest trust work. |
| 10 | `CF-W1-UX-05` | Copilot-only product-language cleanup can reduce advice-like wording after trust UX scope is clear. | Fold into or follow `CF-W1-UX-02`; do not touch shared UI yet. |

## Fresh Pull Exclusions

Do not treat these as the next fresh Team 02 pull:

- `CF-W1-RH-03` is accepted and locally committed as `5bd176b`; do not treat it as a fresh Team 02 pull.
- `CF-W1-RH-02A` is accepted and locally committed as `f391a6d`; do not treat it as a fresh Team 02 pull.
- `CF-W1-BT-03` is accepted and locally committed as `8f984b1`.
- `CF-W1-CAL-01A` is accepted and locally committed as `308cee3`.
- `CF-W1-TP-01A` is accepted and locally committed as `309a853`.
- `CF-W1-DQ-02A` is accepted and locally committed as `c2d6753`.
- `CF-W1-STRAT-04` is accepted and locally committed as `8b3498e`.
- `CF-W1-SQLAB-03` is accepted and locally committed as `5db98f2`.
- `CF-W1-SQLAB-01` is accepted and locally committed as `1a41d95`.
- `CF-W1-SQLAB-02A` is now promoted and assigned to Team 06; do not treat it as unassigned.
- `CF-W1-L3-TREV-02` and `CF-W1-L3-INTEL-03` are already promoted and assigned to Team 07.
- `CF-W1-L3-AUTH-03` is already promoted and assigned; do not pull it as fresh Team 02 discovery.
- `CF-W1-L3-DQ-01B` is already promoted and assigned to Team 07.
- `CF-W1-L3-INTEL-02` is already promoted and assigned to Team 07.
- `CF-W1-RH-01` is already in active implementation/QA/review flow.
- `CF-W1-MD-01`, `CF-W1-MD-04`, `CF-W1-HCTX-02`, `CF-W1-MD-03`, `CF-W1-MCTX-01`, `CF-W1-TP-02`, `CF-W1-SIG-02`, `CF-W1-STRAT-03`, `CF-W1-L3-WATCH-01`, `CF-W1-BT-02`, and `CF-W1-CAL-01` are active, accepted, parked, or already in the live gate path.
- `CF-W1-TP-03` is paused/stale as currently framed. Do not execute Trade Plan proof-snapshot freshness work unless it is reframed into Trusted Signal Candidate health with no R:R, arbitrary targets, synthetic targets, or Trade Plan-first UX.
- `CF-W1-BT-04` is a new draft only. It must not be merged into accepted `BT-03` or widened into advanced validation scope.

## Routing Guidance

- `CF-W1-SIG-TRIGGER-ENTRY-01` is accepted and locally committed as `649e645`; keep it out of fresh Team 02 pulls.
- `CF-W1-TSC-01A-SIG` is active with Team 06 and `CF-W1-DQ-03` is active with Team 05; do not duplicate either as a fresh Team 02 pull.
- Use `CF-W1-TSC-01A-TREV` as the next product-direction follow-on after the Team 06 bridge is accepted, but do not promote implementation until Team 03 architecture, Team 04 QA planning, exact file reservations, source inspection, and sequencing pass.
- Do not execute `CF-W1-TP-03` as framed; pause and reframe only if needed for Trusted Signal Candidate health.
- `CF-W1-STRAT-04` and `CF-W1-SQLAB-03` gates are closed and parked as accepted branch commits; do not reopen them for fresh implementation.
- Use `CF-W1-BT-04` as a later backtesting trust slice behind the Trusted Signal Candidate direction.
- Treat `CF-W1-DQ-02` as the next Market Data / Data Quality residual parent only after the two new trade-plan/backtesting drafts are placed.
- Keep `CF-W1-MD-02A` and `CF-W1-SQLAB-02B` proposal-only until explicit consent opens the gated paths.

## Rolling Audit Note

- The 2026-05-20 backtesting proof-basis audit keeps `CF-W1-BT-03` parked and reinforces `CF-W1-BT-04` as the fresh backtesting current-proof slice.

## Ready Result

No item is moved to Ready by this Team 02 refresh.
