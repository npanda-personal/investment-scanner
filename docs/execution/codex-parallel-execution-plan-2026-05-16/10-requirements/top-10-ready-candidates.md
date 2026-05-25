# Top 10 Candidate Queue

Date: 2026-05-25

Status: Team 02 completed a fresh direct-value audit. `CF-W2-TSC-05A-TREV-RANKING-ELIGIBILITY-REFRAME` remains active with Team 07, and Team 04 remains active on `CF-W1-DQ-02-RS1` QA planning. Team 00 still owns Ready promotion, exact file reservations, and all implementation routing.

Priority rule for this pass: direct investor/trader value first. Keep market-data freshness, DQ trust, source-proven signals, signal/backtest/calibration health, market context, research evidence, and pipeline reliability ahead of admin/settings/auth/subscription/notifications convenience. Do not route Trade Plan-first, target-price, or reward/risk work back into the queue.

## Reserved / Not Unassigned

Do not rank these as fresh unassigned candidates:

- `CF-W2-TSC-05A-TREV-RANKING-ELIGIBILITY-REFRAME` is active with Team 07 in the dedicated Today Review worktree.
- `CF-W1-DQ-02-RS1` QA-planning path is active with Team 04 and must not be duplicated.
- Accepted parked or already-routed items remain excluded from fresh discovery, including `CF-W1-BT-03`, `CF-W1-BT-04`, `CF-W1-CAL-01A`, `CF-W1-TP-01A`, `CF-W1-DQ-02A`, `CF-W1-HCTX-03`, `CF-W1-MCTX-02`, `CF-W1-STRAT-04`, `CF-W1-SQLAB-03`, `CF-W1-RH-03`, `CF-W1-RH-02A`, `CF-W1-SIG-LATEST-01`, `CF-W1-SIG-TRIGGER-ENTRY-01`, `CF-W1-SMI-01`, `CF-W2-SIG-01A`, and `CF-W2-BT-05`.
- Accepted MDPIPE slices remain in the pipeline lane; do not re-open them as new Team 02 discovery.

## Next Unassigned Direct-Value Candidates

These are the next high-value candidates that do not depend on active Team 07 Today Review writes or the active Team 04 DQ residual QA-planning packet. Several are consent-gated proposals, not implementation candidates.

| Rank | ID | Current state | Why now | Next gate |
| --- | --- | --- | --- | --- |
| 1 | `CF-W2-CAL-02` | Fresh requirement draft | Calibration currently shows trust/sample states without a truthful scoped evidence-through date or scoped aggregate basis, so a calibrated result can look newer or broader than the measured evidence behind it. | Route Team 03 architecture next for a bounded scoped evidence-basis child. |
| 2 | `CF-W1-MD-02A` | Consent-gated proposal accepted by docs-only QA | Durable market-data evidence storage remains a high-value upstream trust gap for freshness/provenance history. | Keep proposal-only until Team 00 intentionally opens the schema/storage packet. |
| 3 | `CF-W1-SQLAB-02B` | Consent-gated proposal accepted by docs-only QA | Durable Signal Quality learning memory would preserve measured post-event research evidence across sessions. | Keep proposal-only until Team 00 intentionally opens the storage packet. |
| 4 | `CF-W1-STRAT-02B` | Consent-gated proposal accepted by docs-only QA | Durable strategy revision history would preserve exact rule/version provenance for auditability and later backtest review. | Keep proposal-only until Team 00 intentionally opens the schema/generated/repository packet. |
| 5 | `CF-W1-RH-01A` | Fresh child requirement draft | Research Hub already exposes per-dimension `evidenceDate` in the contract, but the service leaves those dates unwired, which weakens reviewability on the actionability surface. | Keep behind `CF-W2-CAL-02`; route Team 03 only as a bounded no-storage child after calibration date-basis work is defined. |
| 6 | `CF-W1-L3-DQ-01A` | Contract-only requirement | Passive portfolio/watchlist readiness semantics remain a truthful DTO gap, but this is behind direct signal/data/backtest trust work. | Keep contract-only until Team 03/04 define a bounded child with isolated reservations. |
| 7 | `CF-W1-TSC-02` | Requirement draft with accepted first child history | Active candidate health remains important, but it is not independent of the current Today Review writer family. | Hold behind Team 07 completion of `TSC-05A`; do not route while Today Review files are reserved. |
| 8 | `CF-W1-TSC-03` residual/supporting-evidence path | Parent requirement with promoted child history | Candidate supporting evidence still matters, but it depends on Today Review plus accepted supporting slices such as `BT-04`. | Hold until Today Review writer set is clear and supporting dependencies are stable. |
| 9 | `CF-W1-UX-01` residual parent | Open parent behind accepted child | Workbench trust gaps remain real, but they sit behind upstream data/signal trust work. | Keep behind the core direct-value trust stack. |
| 10 | `CF-W1-UX-02` | Downstream trust UX | Copilot trust UX still matters later, once core evidence surfaces are stronger. | Keep behind direct investor/trader value unless a trust blocker appears. |

## Team 02 Read

- New direct-value gap found: `CF-W2-CAL-02` is the first independent non-consent-gated candidate after the accepted/active exclusions were reconciled.
- `CF-W2-CAL-02` is not a duplicate of accepted `CF-W1-CAL-01A`; it is a follow-on about scoped evidence freshness/basis visibility, not another DQ gate packet.
- The storage-gated candidates remain `CF-W1-MD-02A`, `CF-W1-SQLAB-02B`, and `CF-W1-STRAT-02B`; they should stay explicitly proposal-only.
- `CF-W1-RH-01A` is a viable smaller no-storage follow-on, but it stays behind `CF-W2-CAL-02` and behind the three consent-gated durable-proof proposals.
- `CF-W1-TSC-02` stays valuable, but routing it now would collide with the active Today Review write family that Team 07 already owns.

## Ready Result

Team 02 did not move any item to Ready.
