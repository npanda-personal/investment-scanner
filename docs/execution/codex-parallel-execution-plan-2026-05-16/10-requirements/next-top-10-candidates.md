# Next Top 10 Candidates

Date: 2026-05-26

Status: Team 02 refreshed this queue against the live execution board. `CF-W2-SPL-02` is still the active Team 06 QA-rerun lane, and `CF-W1-UX-01B` is now an active Team 08 implementation lane. `CF-W2-DOV-01` (`a371e2f`), `CF-W2-SPL-01B` (`ca31d79`), `CF-W1-RH-01A` (`30460aa`), and `CF-W2-CAL-02A` (`1be7d1a`) remain accepted and locally committed. None of those items belong in fresh Team 02 discovery.

This file now separates:

1. the highest-value proposal items that still require explicit consent; and
2. the next truthful non-consent refinement candidates Team 02 can keep ready behind the current active lanes.

## Active / Accepted Exclusions

Do not rank these as fresh Team 02 discovery:

- `CF-W2-SPL-02` is already promoted and active in Team 06 QA rerun after review-reject rework.
- `CF-W1-UX-01B` is already promoted and active in Team 08 implementation.
- `CF-W2-DOV-01` is already accepted and committed as `a371e2f`.
- `CF-W2-SPL-01B` is already accepted and committed as `ca31d79`.
- `CF-W1-RH-01A` is already accepted and committed as `30460aa`.
- `CF-W2-CAL-02A` is already accepted and committed as `1be7d1a`.
- Accepted or committed direct-value slices remain excluded, including `CF-W1-BT-03`, `CF-W1-BT-04`, `CF-W1-CAL-01A`, `CF-W1-DQ-02A`, `CF-W1-DQ-03`, `CF-W1-HCTX-03`, `CF-W1-MCTX-02`, `CF-W1-RH-02A`, `CF-W1-RH-03`, `CF-W1-SIG-LATEST-01`, `CF-W1-SIG-TRIGGER-ENTRY-01`, `CF-W1-SQLAB-03`, `CF-W1-STRAT-04`, `CF-W1-TSC-02A-TREV-HEALTH`, `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE`, `CF-W1-TP-01A`, `CF-W2-BT-05`, and `CF-W2-SIG-01A`.

## Consent-Gated Proposal Front

These remain the highest direct-value backlog items by investor/trader value, but they stay proposal-only until Team 00 intentionally opens the required scope.

| Rank | ID | Current state | Why it stays high | Next gate |
| --- | --- | --- | --- | --- |
| 1 | `CF-W1-MD-02A` | Consent-gated proposal | Strongest remaining upstream provenance gap across market data, DQ, signals, calibration, backtests, and research review. | Hold until Team 00 opens schema/storage consent. |
| 2 | `CF-W1-SQLAB-02B` | Consent-gated proposal | Strongest durable measured-outcome follow-through gap after accepted calibration and active SPL surface work. | Hold until Team 00 opens storage consent. |
| 3 | `CF-W1-STRAT-02B` | Consent-gated proposal | Strongest durable rule/version audit-history gap for later backtest, signal, and research replay. | Hold until Team 00 opens schema/generated/repository consent. |
| 4 | `CF-W2-SPL-03` | New consent-gated proposal | Highest new post-SPL-02 investor/trader gap: truthful closed-history proof for the Signal Position Ledger once active rows are surfaced. | Hold until Team 00 opens close-lifecycle/schema-storage consent. |

## Actionable Non-Consent Refinement Front

These are the next bounded candidates Team 02 can honestly keep ready for Team 03 without reopening the active SPL-02 or UX-01B lanes.

| Rank | ID | Current state | Why now | Next gate |
| --- | --- | --- | --- | --- |
| 1 | `CF-W2-DOV-02` | New bounded draft | Best current Daily Overview follow-on: replace the explicit calibration placeholder with truthful evidence-through summary once the accepted calibration basis child is on base. | Team 03 architecture packet next. |
| 2 | `CF-W1-L3-DQ-01A` | Existing contract-only child | Still useful for passive readiness truth, but behind Daily Overview and ledger trust follow-through. | Team 03 architecture only if Team 00 prefers the passive DTO contract next. |

## Dispatch Notes

- Keep `CF-W2-SPL-02` and `CF-W1-UX-01B` in their active gate states. Team 02 is not reopening either lane from this queue.
- `CF-W2-SPL-03` is intentionally a later consent-sensitive child. It must not be disguised as a no-schema follow-on while `CF-W2-SPL-02` is still active.
- `CF-W2-DOV-02` is the cleanest new non-consent follow-on because Daily Overview already owns the placeholder and accepted `CF-W2-CAL-02A` created the calibration evidence-basis dependency it needs.
- `CF-W1-L3-DQ-01A` remains valid, but it is more passive and less investor-facing than the Daily Overview and Signal Position Ledger trust gaps.

## Team 02 Result

- Removed stale queue language that still treated active `CF-W1-UX-01B` as a fresh next-candidate packet.
- Preserved the consent-gated top-value trio and added `CF-W2-SPL-03` as the next honest ledger-history proposal.
- Added `CF-W2-DOV-02` as the next bounded non-consent architecture candidate.
- No item was moved to Ready.
