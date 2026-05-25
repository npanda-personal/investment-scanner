# Top 10 Candidate Queue

Date: 2026-05-25

Status: Team 00 routing correction after Team 03 confirmed `CF-W1-TSC-02` has no fresh executable child. `CF-W2-TSC-04A-TREV-CANDIDATE-LANGUAGE` is implemented in the Team 07 worktree, accepted by Team 04 QA and Team 10 review, and is now in Team 03 Architect Signoff. Team 03 has already prepared `CF-W2-TSC-05A-TREV-RANKING-ELIGIBILITY-REFRAME`, but it remains intentionally blocked until accepted `TSC-04A` branch/commit evidence is recorded. Current main still contains pre-`TSC-04A` Today Review target/R:R and Trade Plan-first wording, so `TSC-05A` must not start from current main. This file is a docs-only candidate view, not proof of implementation readiness. Team 00 owns all Ready queue movement.

Team 00 override: `CF-W1-BT-03`, `CF-W1-CAL-01A`, `CF-W1-TP-01A`, and `CF-W1-DQ-02A` are accepted and locally committed parked branches, not fresh candidates.

Team 02 audit update: direct investor/trader value continues to prioritize market data, DQ, explainable signals/triggers, Today Review trusted candidates, active signal health, backtests/calibration, and pipeline reliability above admin/settings/alerts/notifications. Trade Plan / R:R / target-price framing remains stale and must not re-enter fresh routing.

## Team 02 Current Read

After the active `TSC-04A` signoff gate, the next direct-value queue should start with the stacked Today Review follow-on, then the DQ residual/public-contract trust gap.

| Rank | ID | Why now | Next gate |
| --- | --- | --- | --- |
| 1 | `CF-W2-TSC-05` | Once `TSC-04A` clears, Today Review still needs ranking and eligibility to stop depending on target/reward geometry, synthetic targets, and reward/risk thresholds. | Blocked / stacked behind accepted `CF-W2-TSC-04A`; Team 00 must re-anchor `CF-W2-TSC-05A-TREV-RANKING-ELIGIBILITY-REFRAME` to the accepted base commit before QA planning or Ready evaluation. |
| 2 | `CF-W1-DQ-02` residual parent | `DQ-02A` is done, but the public/read-side currentness contract still appears to need a bounded no-schema follow-up. | Route Team 03 to confirm or reject a bounded DQE read-side/public-contract child after `TSC-04A` signoff pressure clears. |
| 3 | `CF-W1-MD-02A` | Durable market-data evidence storage remains high-value upstream trust work. | Blocked by schema/storage consent until Team 00 intentionally opens the evidence packet. |
| 4 | `CF-W1-SQLAB-02B` | Durable Signal Quality learning memory would improve post-event review and calibration continuity. | Blocked by storage consent until Team 00 intentionally opens the learning-memory packet. |
| 5 | `CF-W1-STRAT-02B` | Durable strategy revision history would preserve exact rule/version provenance for review and backtesting trust. | Blocked by schema/generated/repository consent until Team 00 intentionally opens the revision-history packet. |
| 6 | `CF-W1-L3-DQ-01A` | Passive Lane 3 readiness semantics remain a real trust-contract gap. | Contract-only until Team 03/04 define a bounded child that does not collide with active Lane 3 work or shared UI rules. |
| 7 | `CF-W1-UX-01` residual parent | Workbench trust framing child `UX-01A` was only frontend-safe framing; verified scope, trusted-date, blocker provenance, and downstream eligibility still remain open. | Keep behind upstream data/signal trust slices; do not reopen accepted `UX-01A`. |
| 8 | `CF-W1-UX-02` | Copilot trust UX still matters once the core signal/data/backtest stack is stronger. | Downstream trust UX candidate; keep behind direct investor/trader value unless a trust blocker appears. |
| 9 | `CF-W1-UX-05` | Product-language cleanup can reduce advice-like wording after trust UX scope is clear. | Downstream copy-cleanup candidate; fold into or follow `CF-W1-UX-02`, and do not reserve shared UI yet. |
| 10 | `CF-W1-TSC-02` residual | Historical first child `CF-W1-TSC-02A-TREV-HEALTH` is already accepted as `34c9993`; only a new residual health child could create fresh value. | Do not route now. Team 02 must define a new residual child after `TSC-04A` / `TSC-05A` if a real health gap remains. |

## In-Flight / Not Fresh

Do not treat these as the next fresh Team 02 pull:

- `CF-W2-TSC-04A-TREV-CANDIDATE-LANGUAGE` is implemented in the Team 07 worktree, accepted by Team 04 QA and Team 10 review, and in active Team 03 Architect Signoff. Do not reopen the child or the `CF-W2-TSC-04` parent as fresh planning work while this gate is open.
- `CF-W2-TSC-05A-TREV-RANKING-ELIGIBILITY-REFRAME` is defined by Team 03, but it stays blocked until Team 00 records accepted `TSC-04A` base evidence.
- `CF-W1-TSC-02A-TREV-HEALTH` is accepted and locally committed as `34c9993`; Team 03 found no fresh executable `CF-W1-TSC-02` child remains under the current parent.
- `CF-W3-MDPIPE-01B5`, `CF-W3-MDPIPE-01B6`, and `CF-W3-MDPIPE-01C` remain in the pipeline-reliability lane; do not duplicate them as new Team 02 discovery.
- `CF-W1-MD-05`, `CF-W1-TSC-02A-TREV-HEALTH`, `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE`, `CF-W2-SIG-01A`, `CF-W2-BT-05`, and `CF-W1-BT-04` have already moved through implementation and/or validation gates and are not fresh Team 02 pulls.
- `CF-W1-RH-03`, `CF-W1-RH-02A`, `CF-W1-SIG-LATEST-01`, `CF-W1-SIG-TRIGGER-ENTRY-01`, `CF-W1-SQLAB-03`, `CF-W1-SQLAB-01`, `CF-W1-STRAT-04`, `CF-W1-CAL-01A`, `CF-W1-TP-01A`, and `CF-W1-DQ-02A` are accepted and locally committed or otherwise closed for fresh discovery.
- `CF-W1-TP-03` stays paused/stale as currently framed. Do not execute Trade Plan proof freshness work unless it is fully reframed into Trusted Signal Candidate health with no targets, R:R, synthetic targets, or Trade Plan-first UX.

## Routing Guidance

- Treat `CF-W2-TSC-05` as the next direct Today Review requirement after `TSC-04A` clears QA/review/signoff/PO gates and Team 00 records the accepted base commit.
- Treat `CF-W1-DQ-02` as the next upstream DQ residual architecture question after `TSC-05A` sequencing.
- Do not reopen `CF-W1-TSC-02` unless Team 02 writes a new residual child requirement after `TSC-04A` / `TSC-05A`.
- Keep `CF-W1-MD-02A`, `CF-W1-SQLAB-02B`, and `CF-W1-STRAT-02B` proposal-only until explicit consent opens the gated paths.
- Keep pipeline reliability in the MDPIPE lane unless a new investor-facing trust gap survives the accepted B4/B6/01C direction.

## Ready Result

No item is moved to Ready by this Team 02 refresh.
