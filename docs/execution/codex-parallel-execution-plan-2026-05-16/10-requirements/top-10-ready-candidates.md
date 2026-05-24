# Top 10 Candidate Queue

Date: 2026-05-24

Status: Team 02 rolling PO refresh after source/docs audit. This file is a docs-only candidate view, not proof of implementation readiness. Team 00 owns all Ready queue movement.

Team 00 override: `CF-W1-BT-03`, `CF-W1-CAL-01A`, `CF-W1-TP-01A`, and `CF-W1-DQ-02A` are accepted and locally committed parked branches, not fresh candidates.

Team 02 audit update: `CF-W1-MD-05`, `CF-W1-TSC-02A-TREV-HEALTH`, `CF-W2-SIG-01A`, `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE`, and `CF-W2-BT-05` have moved through implementation/validation gates and are not fresh Team 02 pulls. Next fresh-pull value should prioritize Today Review no-target cleanup, ranking/eligibility cleanup, and additional signal trust gaps over admin, subscription, notification, or Copilot convenience work.

Team 00 correction: `CF-W1-SIG-LATEST-01` is already accepted from 2026-05-17 and must not be ranked as a new Ready candidate.

## Team 02 Current Read

After `TSC-03A` and `BT-05` closure, only six current non-completed/non-accepted items remain in this queue. Team 02 should refill the list with fresh direct investor/trader-value findings before Team 00 promotes more implementation work.

| Rank | ID | Why now | Next gate |
| --- | --- | --- | --- |
| 1 | `CF-W2-TSC-04` | Today Review source/docs still expose target/reward and Trade Plan-style language that conflicts with trusted signal candidate workflow. | Planning-only; Team 03/04 can prepare bounded contract/QA now that `TSC-03A` released Today Review files. |
| 2 | `CF-W2-TSC-05` | Today Review ranking/eligibility must not continue relying on target/reward geometry after copy cleanup. | Planning-only; route to Team 03 for a bounded split before implementation. |
| 3 | `OPEN-PO-DISCOVERY-01` | Keep the backlog filled with direct investor/trader-value candidates. | Team 02 rolling audit should continue across Market Data, DQ, Signal Generation, Backtesting, Calibration, and Today Review. |
| 4 | `CF-W1-DQ-02` residual parent | `DQ-02A` is complete, but parent read-side/public-contract scope still holds an upstream trust gap for signals and backtesting. | Team 03 found the residual blocked until Team 00 opens a DQE persisted read-side/public-contract packet. |
| 5 | `CF-W1-MD-02A` | Market-data durable evidence storage remains high-value upstream trust work, even though it is still consent-gated. | Proposal-only until explicit schema/storage consent opens. |
| 6 | `CF-W1-SQLAB-02B` | Durable Signal Quality learning memory would strengthen post-event review and calibration continuity. | Proposal-only until storage consent opens. |

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
- `CF-W1-TSC-01A-TREV` is accepted and locally committed on the Team 07 branch as `9fbc989`; do not treat it as unassigned.
- `CF-W1-L3-TREV-02` and `CF-W1-L3-INTEL-03` are already promoted and assigned to Team 07.
- `CF-W1-L3-AUTH-03` is already promoted and assigned; do not pull it as fresh Team 02 discovery.
- `CF-W1-L3-DQ-01B` is already promoted and assigned to Team 07.
- `CF-W1-L3-INTEL-02` is already promoted and assigned to Team 07.
- `CF-W1-RH-01` is already in active implementation/QA/review flow.
- `CF-W1-MD-01`, `CF-W1-MD-04`, `CF-W1-HCTX-02`, `CF-W1-MD-03`, `CF-W1-MCTX-01`, `CF-W1-TP-02`, `CF-W1-SIG-02`, `CF-W1-STRAT-03`, `CF-W1-L3-WATCH-01`, `CF-W1-BT-02`, and `CF-W1-CAL-01` are active, accepted, parked, or already in the live gate path.
- `CF-W1-TP-03` is paused/stale as currently framed. Do not execute Trade Plan proof-snapshot freshness work unless it is reframed into Trusted Signal Candidate health with no R:R, arbitrary targets, synthetic targets, or Trade Plan-first UX.
- `CF-W2-SIG-01A` is accepted and locally committed as `24f938b`; it is no longer a fresh Team 02 or Team 06 pull.
- `CF-W1-SIG-LATEST-01` is already accepted from 2026-05-17; it is no longer a fresh Team 02 or Team 06 pull.
- `CF-W2-BT-05` is promoted and assigned to Team 06; do not treat it as fresh planning work.
- `CF-W2-TSC-04` and `CF-W2-TSC-05` remain planning-only Today Review follow-ons.
- `CF-W1-BT-04` remains separate from accepted `BT-03` and must not widen into advanced validation scope.

## Routing Guidance

- `CF-W1-SIG-TRIGGER-ENTRY-01` is accepted and locally committed as `649e645`; keep it out of fresh Team 02 pulls.
- `CF-W1-TSC-01A-SIG` is accepted upstream and `CF-W1-DQ-03` is active with Team 05; do not duplicate either as a fresh Team 02 pull.
- Do not execute `CF-W1-TP-03` as framed; pause and reframe only if needed for Trusted Signal Candidate health.
- `CF-W1-MD-05` is promoted and assigned to Team 05; do not pull it as fresh Team 02 work.
- `CF-W1-TSC-02A-TREV-HEALTH` is promoted and assigned to Team 07; do not pull it as fresh Team 02 work.
- Use `CF-W1-TSC-03` as the next Today Review supporting-trust architecture-prep candidate after `TSC-02A`.
- `CF-W1-BT-04` is accepted and locally committed as `2bd794f`; it is no longer a fresh Team 03 architecture-prep candidate.
- `CF-W1-STRAT-04` and `CF-W1-SQLAB-03` gates are closed and parked as accepted branch commits; do not reopen them for fresh implementation.
- Treat `CF-W1-DQ-02` as the next Market Data / Data Quality residual parent only after the two requirement-ready direct-value slices above are placed.
- Keep `CF-W1-MD-02A` and `CF-W1-SQLAB-02B` proposal-only until explicit consent opens the gated paths.

## Rolling Audit Note

- The 2026-05-20 backtesting proof-basis audit keeps `CF-W1-BT-03` parked and reinforces `CF-W1-BT-04` as the fresh backtesting current-proof slice.

## Ready Result

No item is moved to Ready by this Team 02 refresh.
