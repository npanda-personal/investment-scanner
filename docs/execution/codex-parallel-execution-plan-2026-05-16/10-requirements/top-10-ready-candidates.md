# Top 10 Candidate Queue

Date: 2026-05-24

Status: Team 00 updated after Product Owner redirected signal workflow away from Trade Plan, R:R, arbitrary targets, and target-price framing. This file is a docs-only candidate view, not proof of implementation readiness. Team 00 owns all Ready queue movement.

Team 00 override: `CF-W1-BT-03`, `CF-W1-CAL-01A`, `CF-W1-TP-01A`, and `CF-W1-DQ-02A` are accepted and locally committed parked branches, not fresh candidates.

Team 02 rolling update: `CF-W1-TSC-01A-TREV` is active with Team 07 / Team 04, `CF-W1-DQ-03` is active with Team 05, and `CF-W1-TSC-01A-SIG` is already accepted upstream. The table below lists the next unassigned Product Owner candidates after those active pulls; it does not move any item to Ready.

## Team 02 Current Read

| Rank | ID | Why now | Next gate |
| --- | --- | --- | --- |
| 1 | `CF-W1-TSC-02` | Today Review is the primary daily workflow, and the next direct investor/trader gap is ongoing active-signal health with rule-backed exit/invalidation evidence. | Requirement-ready; route to Team 03 architecture prep next, but do not move to Ready. |
| 2 | `CF-W1-BT-04` | Backtesting still needs saved-run current-proof labeling so old historical runs do not read like fresh validation. | Requirement-ready; route to Team 03 architecture prep after or alongside `TSC-02`. |
| 3 | `CF-W1-DQ-02` residual parent | `DQ-02A` is complete, but parent read-side/public-contract scope may still hold an upstream trust gap for signals and backtesting. | Team 03 should either define a bounded no-schema child or keep the parent blocked. |
| 4 | `CF-W1-MD-02A` | Market-data durable evidence storage remains high-value upstream trust work, even though it is still consent-gated. | Proposal-only until explicit schema/storage consent opens. |
| 5 | `CF-W1-SQLAB-02B` | Durable Signal Quality learning memory would strengthen post-event review and calibration continuity. | Proposal-only until storage consent opens. |
| 6 | `CF-W1-STRAT-02B` | Durable strategy revision history preserves exact rule/version provenance for signals and backtests. | Proposal-only until schema/generated/repository consent opens. |
| 7 | `CF-W1-L3-DQ-01A` | Passive readiness DTO semantics still matter, but they sit behind core signal/backtest/data trust work. | Contract refresh only unless Team 03/04 define a bounded child. |
| 8 | `CF-W1-UX-02` | Copilot trust UX is useful, but downstream of direct data/signal/backtesting value. | Keep Copilot-only behind the higher-value queue. |
| 9 | `CF-W1-UX-05` | Product-language cleanup can reduce advice-like wording after Copilot trust UX scope is clear. | Fold into or follow `CF-W1-UX-02`; no shared UI reservation. |
| 10 | `CF-W1-TSC-01` parent residual | The parent remains important, but fresh implementation should continue through bounded children only. | Keep the parent out of implementation and route only through children. |

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
- `CF-W1-TSC-01A-TREV` is now promoted and assigned to Team 07 with Team 04 QA in flight; do not treat it as unassigned.
- `CF-W1-L3-TREV-02` and `CF-W1-L3-INTEL-03` are already promoted and assigned to Team 07.
- `CF-W1-L3-AUTH-03` is already promoted and assigned; do not pull it as fresh Team 02 discovery.
- `CF-W1-L3-DQ-01B` is already promoted and assigned to Team 07.
- `CF-W1-L3-INTEL-02` is already promoted and assigned to Team 07.
- `CF-W1-RH-01` is already in active implementation/QA/review flow.
- `CF-W1-MD-01`, `CF-W1-MD-04`, `CF-W1-HCTX-02`, `CF-W1-MD-03`, `CF-W1-MCTX-01`, `CF-W1-TP-02`, `CF-W1-SIG-02`, `CF-W1-STRAT-03`, `CF-W1-L3-WATCH-01`, `CF-W1-BT-02`, and `CF-W1-CAL-01` are active, accepted, parked, or already in the live gate path.
- `CF-W1-TP-03` is paused/stale as currently framed. Do not execute Trade Plan proof-snapshot freshness work unless it is reframed into Trusted Signal Candidate health with no R:R, arbitrary targets, synthetic targets, or Trade Plan-first UX.
- `CF-W1-BT-04` remains separate from accepted `BT-03` and must not widen into advanced validation scope.

## Routing Guidance

- `CF-W1-SIG-TRIGGER-ENTRY-01` is accepted and locally committed as `649e645`; keep it out of fresh Team 02 pulls.
- `CF-W1-TSC-01A-SIG` is accepted upstream and `CF-W1-DQ-03` is active with Team 05; do not duplicate either as a fresh Team 02 pull.
- Do not execute `CF-W1-TP-03` as framed; pause and reframe only if needed for Trusted Signal Candidate health.
- Use `CF-W1-TSC-02` as the next Team 03 requirement-factory handoff while Team 07 / Team 04 complete active Today Review adoption work.
- Use `CF-W1-BT-04` as the next parallel Team 03 follow-on if architecture capacity remains after `CF-W1-TSC-02`.
- `CF-W1-STRAT-04` and `CF-W1-SQLAB-03` gates are closed and parked as accepted branch commits; do not reopen them for fresh implementation.
- Treat `CF-W1-DQ-02` as the next Market Data / Data Quality residual parent only after the two requirement-ready direct-value slices above are placed.
- Keep `CF-W1-MD-02A` and `CF-W1-SQLAB-02B` proposal-only until explicit consent opens the gated paths.

## Rolling Audit Note

- The 2026-05-20 backtesting proof-basis audit keeps `CF-W1-BT-03` parked and reinforces `CF-W1-BT-04` as the fresh backtesting current-proof slice.

## Ready Result

No item is moved to Ready by this Team 02 refresh.
