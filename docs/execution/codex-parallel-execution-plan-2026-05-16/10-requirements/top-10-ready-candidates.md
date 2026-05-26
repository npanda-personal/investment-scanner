# Top 10 Candidate Queue

Date: 2026-05-26

Status: Team 02 refreshed this queue after reconciling the live Ready lanes with older requirement rankings. `CF-W2-DOV-01`, `CF-W2-SPL-01B`, and `CF-W1-RH-01A` are already routed and no longer belong in fresh Team 02 discovery. That leaves a proposal-first next stack, headed by `CF-W1-MD-02A`. Team 00 still owns consent decisions, Ready promotion, exact file reservations, and all implementation routing.

Priority rule for this pass: direct investor/trader value first. Keep market-data freshness, DQ trust, source-proven signals, signal/backtest/calibration health, market context, research evidence, and pipeline reliability ahead of admin/settings/auth/subscription/notifications convenience. Do not route Trade Plan-first, target-price, or reward/risk work back into the queue.

## Reserved / Not Unassigned

Do not rank these as fresh unassigned candidates:

- `CF-W2-CAL-02A` is active with Team 06 as the bounded child of `CF-W2-CAL-02`; do not treat the parent calibration requirement as fresh unassigned backlog while the child is in flight.
- Historical Today Review parents `CF-W1-TSC-02` and `CF-W1-TSC-03` are not fresh unassigned backlog heads from current `dev`; their honest executable children were already prepared or consumed in earlier stacked work.
- `CF-W1-DQ-02-RS1` remains its own isolated DQ stream and must not be duplicated.
- `CF-W2-DOV-01` already has Team 08 UX planning, Team 03 architecture, and Team 04 pre-architecture QA scaffold output. It is no longer a fresh Team 02 requirement-discovery item.
- `CF-W2-SPL-01B` already has Team 03 architecture plus Team 04 QA planning. It is now a Team 00 promotion/sequencing decision, not a fresh Team 02 requirement-discovery item.
- `CF-W1-RH-01A` is already promoted into the current Ready family and is no longer a fresh Team 02 requirement-discovery item.
- Accepted parked or already-routed items remain excluded from fresh discovery, including `CF-W1-BT-03`, `CF-W1-BT-04`, `CF-W1-CAL-01A`, `CF-W1-TP-01A`, `CF-W1-DQ-02A`, `CF-W1-HCTX-03`, `CF-W1-MCTX-02`, `CF-W1-STRAT-04`, `CF-W1-SQLAB-03`, `CF-W1-RH-03`, `CF-W1-RH-02A`, `CF-W1-SIG-LATEST-01`, `CF-W1-SIG-TRIGGER-ENTRY-01`, `CF-W1-SMI-01`, `CF-W2-SIG-01A`, and `CF-W2-BT-05`.
- Accepted MDPIPE slices remain in the pipeline lane; do not re-open them as new Team 02 discovery.

## Next Unassigned Direct-Value Candidates

These are the next high-value candidates that do not duplicate the active Team 06 calibration child, Team 03 Today Review addendum, or Team 05 DQ rework. Several are consent-gated proposals, not implementation candidates.

| Rank | ID | Current state | Why now | Next gate |
| --- | --- | --- | --- | --- |
| 1 | `CF-W1-MD-02A` | Consent-gated proposal accepted by docs-only QA | Durable market-data evidence storage remains the strongest upstream trust gap left after DOV / SPL / RH are already in motion. | Keep proposal-only until Team 00 intentionally opens the schema/storage packet. |
| 2 | `CF-W1-SQLAB-02B` | Consent-gated proposal accepted by docs-only QA | Durable Signal Quality learning memory is the strongest measured-outcome follow-through proposal once Team 00 decides whether to open storage scope. | Keep proposal-only until Team 00 intentionally opens the storage packet. |
| 3 | `CF-W1-STRAT-02B` | Consent-gated proposal accepted by docs-only QA | Durable strategy revision history would preserve exact rule/version provenance for later signal, backtest, and research review. | Keep proposal-only until Team 00 intentionally opens the schema/generated/repository packet. |
| 4 | `CF-W1-L3-DQ-01A` | Contract-only requirement | Passive portfolio/watchlist readiness semantics remain a truthful DTO gap, but this sits behind direct market-data and post-event trust work. | Keep contract-only until Team 03/04 define a bounded child with isolated reservations. |
| 5 | `CF-W1-UX-01` | Open parent behind accepted child | Workbench trust gaps remain real, but they still sit behind upstream data/signal trust work. | Keep behind the core direct-value trust stack. |

## Team 02 Read

- `CF-W2-CAL-02` remains high value, but its bounded child `CF-W2-CAL-02A` is already routed and should not appear as a fresh unassigned queue head.
- The storage-gated candidates remain `CF-W1-MD-02A`, `CF-W1-SQLAB-02B`, and `CF-W1-STRAT-02B`; they should stay explicitly proposal-only.
- `CF-W2-DOV-01`, `CF-W2-SPL-01B`, and `CF-W1-RH-01A` have already moved past Team 02 requirement shaping and must stay out of fresh requirement discovery.
- Parent `CF-W1-TSC-02` and `CF-W1-TSC-03` remain useful historical product context, but they are not the next honest Team 02 queue heads from current `dev`.
- `CF-W2-SPL-01A` remains the original over-broad split source and should not be routed as the next child.
- `CF-W1-DQ-02-RS1` remains excluded while it stays in its isolated DQ stream.

## Ready Result

Team 02 did not move any item to Ready.
