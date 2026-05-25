# Top 10 Candidate Queue

Date: 2026-05-25

Status: Team 00 routing correction after Team 03 confirmed `CF-W1-TSC-02` has no fresh executable child and Team 02 resolved the `CF-W1-DQ-02` residual product direction. `CF-W2-TSC-04A-TREV-CANDIDATE-LANGUAGE` is accepted on Team 07 branch commit `68f0a19`, and Team 03 has already prepared `CF-W2-TSC-05A-TREV-RANKING-ELIGIBILITY-REFRAME` as the next stacked Today Review follow-on. `CF-W1-DQ-02A` remains accepted as `c2d6753`; the remaining DQ gap is now defined as a consent-gated read-side/public-contract reconstruction requirement, not a no-schema child and not a durable-schema packet. This file is a docs-only candidate view, not proof of implementation readiness. Team 00 owns all Ready queue movement.

Team 00 override: `CF-W1-BT-03`, `CF-W1-CAL-01A`, `CF-W1-TP-01A`, and `CF-W1-DQ-02A` are accepted and locally committed parked branches, not fresh candidates.

Team 02 audit update: direct investor/trader value continues to prioritize market data, DQ, explainable signals/triggers, Today Review trusted candidates, active signal health, backtests/calibration, and pipeline reliability above admin/settings/alerts/notifications. Trade Plan / R:R / target-price framing remains stale and must not re-enter fresh routing.

## Team 02 Current Read

After accepted `TSC-04A`, Team 00 promoted the stacked Today Review follow-on `CF-W2-TSC-05A` to Team 07. The next unassigned direct-value prep item is the DQ residual/public-contract trust gap.

| Rank | ID | Why now | Next gate |
| --- | --- | --- | --- |
| 1 | `CF-W2-TSC-05` | Today Review still needs ranking and eligibility to stop depending on target/reward geometry, synthetic targets, and reward/risk thresholds. | Promoted as `CF-W2-TSC-05A-TREV-RANKING-ELIGIBILITY-REFRAME` on Team 07 branch `codex/team07-portfolio-alerts/CF-W2-TSC-05A-TREV-RANKING-ELIGIBILITY`, required base `68f0a19`. |
| 2 | `CF-W1-DQ-02` residual read-side requirement | `DQ-02A` is done, and Team 03 confirmed no honest no-schema child remains. The remaining user value is truthful currentness across DQ read paths, which Team 02 now defines as a read-time reconstruction packet instead of a durable-schema packet. | Team 00 opened Team 03 docs-only architecture prep for an explicit DQE read-side/public-contract packet; do not imply Ready and do not widen into schema unless a later durable-history need is proven. |
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
- `CF-W2-TSC-05A-TREV-RANKING-ELIGIBILITY-REFRAME` is promoted and assigned to Team 07 in a dedicated stacked worktree. It is no longer a fresh Team 02 pull.
- `CF-W1-TSC-02A-TREV-HEALTH` is accepted and locally committed as `34c9993`; Team 03 found no fresh executable `CF-W1-TSC-02` child remains under the current parent.
- `CF-W3-MDPIPE-01B5`, `CF-W3-MDPIPE-01B6`, and `CF-W3-MDPIPE-01C` remain in the pipeline-reliability lane; do not duplicate them as new Team 02 discovery.
- `CF-W1-MD-05`, `CF-W1-TSC-02A-TREV-HEALTH`, `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE`, `CF-W2-SIG-01A`, `CF-W2-BT-05`, and `CF-W1-BT-04` have already moved through implementation and/or validation gates and are not fresh Team 02 pulls.
- `CF-W1-RH-03`, `CF-W1-RH-02A`, `CF-W1-SIG-LATEST-01`, `CF-W1-SIG-TRIGGER-ENTRY-01`, `CF-W1-SQLAB-03`, `CF-W1-SQLAB-01`, `CF-W1-STRAT-04`, `CF-W1-CAL-01A`, `CF-W1-TP-01A`, and `CF-W1-DQ-02A` are accepted and locally committed or otherwise closed for fresh discovery.
- `CF-W1-TP-03` stays paused/stale as currently framed. Do not execute Trade Plan proof freshness work unless it is fully reframed into Trusted Signal Candidate health with no targets, R:R, synthetic targets, or Trade Plan-first UX.

## Routing Guidance

- Treat `CF-W2-TSC-05A` as the active Team 07 implementation handoff, not as unassigned backlog.
- Treat `CF-W1-DQ-02` as the next upstream DQ residual read-side architecture packet while `TSC-05A` runs.
- Use `10-requirements/CF-W1-DQ-02-residual-read-side-currentness-requirement.md` as the product decision record for that residual scope.
- Do not reopen `CF-W1-TSC-02` unless Team 02 writes a new residual child requirement after `TSC-04A` / `TSC-05A`.
- Keep `CF-W1-MD-02A`, `CF-W1-SQLAB-02B`, and `CF-W1-STRAT-02B` proposal-only until explicit consent opens the gated paths.
- Keep pipeline reliability in the MDPIPE lane unless a new investor-facing trust gap survives the accepted B4/B6/01C direction.

## Ready Result

Team 02 did not move an item to Ready. Team 00 later promoted `CF-W2-TSC-05A` after Team 03/04 evidence and accepted base verification.
