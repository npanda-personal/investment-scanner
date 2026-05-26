# Next Top 10 Candidates

Date: 2026-05-26

Status: Team 02 refreshed this queue after reconciling the live runtime queue with the current Ready lanes. `CF-W2-DOV-01`, `CF-W2-SPL-01B`, and `CF-W1-RH-01A` are already routed as the active or queued non-overlapping implementation family, so they no longer belong in fresh requirement discovery. The next unassigned direct-value stack is now headed by proposal-only consent-gated packets, with `CF-W1-MD-02A` first. This file is a docs-only planning view. Team 00 still owns consent decisions, Ready movement, file reservations, and one-writer sequencing.

## Routing Guardrails

- Do not treat `CF-W2-CAL-02A` or parent `CF-W2-CAL-02` as unassigned backlog while the calibration child remains in the routed delivery path.
- Do not treat historical Today Review parents `CF-W1-TSC-02` or `CF-W1-TSC-03` as fresh queue heads; their honest executable children were already prepared or consumed in earlier stacked work and are not the next Team 02 discovery packet from current `dev`.
- Do not duplicate `CF-W1-DQ-02-RS1` while it remains an isolated DQ decision/rework stream.
- Do not treat `CF-W2-DOV-01` as fresh Team 02 discovery while it remains a routed high-priority packet; after the 2026-05-26 Product Owner correction, its Team 08 UX and Team 03 architecture outputs must be refreshed before implementation can resume.
- Do not treat `CF-W2-SPL-01B` as fresh Team 02 discovery while Team 03 architecture and Team 04 QA outputs already exist.
- Do not treat `CF-W1-RH-01A` as fresh Team 02 discovery while Team 00 has already promoted it into the active Ready family.
- Do not reopen accepted MDPIPE slices as new Team 02 discovery. Remaining pipeline value should surface only if a real investor-facing trust gap survives the accepted dashboard/status direction.
- Keep admin/settings/auth/subscription/notifications convenience behind direct data/signal/research value unless correctness, privacy, or user-data safety is blocked.

## Current Priority Order

| Rank | ID | Current state | Why it matters now | Next Team 00 action |
| --- | --- | --- | --- | --- |
| 1 | `CF-W1-MD-02A` | Consent-gated proposal accepted by docs-only QA | Durable market-data evidence remains the strongest upstream provenance gap left after the active DOV / SPL / RH lanes are accounted for. | Keep proposal-only until Team 00 intentionally opens the schema/storage packet. |
| 2 | `CF-W1-SQLAB-02B` | Consent-gated proposal accepted by docs-only QA | Durable Signal Quality learning memory is the cleanest measured-outcome follow-through packet once Team 00 decides whether to open storage scope. | Keep proposal-only until Team 00 intentionally opens the storage packet. |
| 3 | `CF-W1-STRAT-02B` | Consent-gated proposal accepted by docs-only QA | Durable strategy revision history would preserve exact strategy/rule/version provenance for later signal, backtest, and research review. | Keep proposal-only until Team 00 intentionally opens the schema/generated/repository packet. |
| 4 | `CF-W1-L3-DQ-01A` | Contract-only | Passive Lane 3 readiness semantics still need a truthful DTO contract, but remain behind direct market-data and post-event trust work. | Keep contract-only until a bounded child can be reserved without shared-file collision. |
| 5 | `CF-W1-UX-01` residual parent | Open parent | Research Workbench trust gaps remain, but they still sit behind upstream trust/evidence work. | Keep behind the core direct-value stack. |

## Dispatch Notes

- `CF-W2-CAL-02` remains important, but its bounded child `CF-W2-CAL-02A` is already routed and therefore stays out of the unassigned stack.
- `CF-W2-DOV-01`, `CF-W2-SPL-01B`, and `CF-W1-RH-01A` have already moved past Team 02 fresh discovery and should stay with Team 00 / Team 03 / Team 04 / owning implementation teams for the current gate flow. `CF-W2-DOV-01` specifically remains high priority, but it is blocked from implementation until the investor/trader-first Team 08 UX and Team 03 architecture refreshes replace the superseded admin-style framing.
- `CF-W1-MD-02A`, `CF-W1-SQLAB-02B`, and `CF-W1-STRAT-02B` remain valuable, but all three are honest consent-gated proposals rather than Ready-adjacent slices.
- Parent `CF-W1-TSC-02` and `CF-W1-TSC-03` docs remain useful historical context, but they are not the next fresh Team 02 queue heads from current `dev`.
- `CF-W2-SPL-01A` remains a split-history requirement, not the next intake target.
- Any closed-history Signal Position Ledger follow-on should remain a later durable-lifecycle consent decision.

## Team 02 Result

- Refined queue priority to exclude active or already-routed gate work from the unassigned ranking.
- Removed stale Today Review-parent recommendations from the near-front stack because they no longer represent fresh executable discovery.
- No item was moved to Ready.
- The queue now reflects the next unassigned candidates without mislabeling routed DOV / SPL / RH work as fresh backlog.
