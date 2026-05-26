# Next Top 10 Candidates

Date: 2026-05-26

Status: Team 02 refreshed this queue again against the live execution board and current Product Owner direction. `CF-W1-UX-01B` remains an active Team 08 rework/QA lane, and `CF-W2-DOV-02` is already inside Team 03 dependency-base correction. Neither belongs in fresh Team 02 discovery. `CF-W2-SPL-02` is accepted and locally committed as `31115f0`. `CF-W2-DOV-01` (`a371e2f`), `CF-W2-SPL-01B` (`ca31d79`), `CF-W1-RH-01A` (`30460aa`), `CF-W2-CAL-02A` (`1be7d1a`), and `CF-W1-MD-05` (`93c29e2`) remain accepted and locally committed.

This file now separates:

1. the highest-value proposal items that still require explicit consent; and
2. the next truthful non-consent refinement candidates Team 02 can keep ready behind the current active lanes.

## Active / Accepted Exclusions

Do not rank these as fresh Team 02 discovery:

- `CF-W1-UX-01B` is already promoted and active in Team 08 rework/QA.
- `CF-W2-DOV-02` is already routed into Team 03 dependency-base correction.
- `CF-W2-SPL-02` is already accepted and locally committed as `31115f0`.
- `CF-W2-DOV-01` is already accepted and committed as `a371e2f`.
- `CF-W2-SPL-01B` is already accepted and committed as `ca31d79`.
- `CF-W1-RH-01A` is already accepted and committed as `30460aa`.
- `CF-W2-CAL-02A` is already accepted and committed as `1be7d1a`.
- `CF-W1-MD-05` is already accepted and committed as `93c29e2`.
- Accepted or committed direct-value slices remain excluded, including `CF-W1-BT-03`, `CF-W1-BT-04`, `CF-W1-CAL-01A`, `CF-W1-DQ-02A`, `CF-W1-DQ-03`, `CF-W1-HCTX-03`, `CF-W1-MCTX-02`, `CF-W1-RH-02A`, `CF-W1-RH-03`, `CF-W1-SIG-LATEST-01`, `CF-W1-SIG-TRIGGER-ENTRY-01`, `CF-W1-SQLAB-03`, `CF-W1-STRAT-04`, `CF-W1-TSC-02A-TREV-HEALTH`, `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE`, `CF-W1-TP-01A`, `CF-W2-BT-05`, and `CF-W2-SIG-01A`.

## Consent-Gated Proposal Front

These remain the highest direct-value backlog items by investor/trader value, but they stay proposal-only until Team 00 intentionally opens the required scope.

| Rank | ID | Current state | Why it stays high | Next gate |
| --- | --- | --- | --- | --- |
| 1 | `CF-W1-MD-02A` | Consent-gated proposal | Strongest remaining upstream provenance gap across market data, DQ, signals, calibration, backtests, and research review. | Hold until Team 00 opens schema/storage consent. |
| 2 | `CF-W1-SQLAB-02B` | Consent-gated proposal | Strongest durable measured-outcome follow-through gap after accepted calibration and review-loop work. | Hold until Team 00 opens storage consent. |
| 3 | `CF-W2-SPL-03` | Consent-gated proposal | Highest user-facing ledger trust gap that still remains honestly blocked: closed-history proof must be evidence-first, not UI-first. | Hold until Team 00 opens close-lifecycle/schema-storage consent. |
| 4 | `CF-W1-STRAT-02B` | Consent-gated proposal | Strong durable rule/version audit-history gap for later backtest, signal, and research replay. | Hold until Team 00 opens schema/generated/repository consent. |

## Actionable Non-Consent Refinement Front

These are the next bounded candidates Team 02 can honestly keep ready without depending on active `CF-W1-UX-01B` or Team 03's current `CF-W2-DOV-02` dependency-base correction.

| Rank | ID | Current state | Why now | Next gate |
| --- | --- | --- | --- | --- |
| 1 | `CF-W2-STRAT-05` | New bounded draft | Best new non-consent direct-value packet: existing `/strategies` route, existing proof registry, and an investor-facing strategy-evidence surfacing gap that does not reopen DOV or Workbench lanes. | Team 03 architecture packet next. |
| 2 | `CF-W1-L3-DQ-01A` | Existing contract-only child | Still useful for passive readiness truth, but behind the new strategy-evidence follow-on. | Team 03 architecture only if Team 00 prefers the passive DTO contract next. |

## Dispatch Notes

- Keep `CF-W1-UX-01B` and `CF-W2-DOV-02` in their active gate states. Team 02 is not reopening either lane from this queue.
- `CF-W2-SPL-03` is intentionally a later consent-sensitive child. It must not be disguised as a no-schema follow-on.
- `CF-W2-STRAT-05` is the cleanest new non-consent follow-on because `/strategies` already owns proof rows, rankings, and detail views; the remaining gap is investor-facing proof visibility, not a new route or a new engine.
- `CF-W1-L3-DQ-01A` remains valid, but it is more passive and less investor-facing than Strategy Library proof surfacing.

## Team 02 Result

- Removed stale queue language that still treated active `CF-W1-UX-01B` and routed `CF-W2-DOV-02` as fresh next-candidate packets.
- Preserved the consent-gated high-value stack and kept `CF-W2-SPL-03` as the honest ledger-history proposal.
- Added `CF-W2-STRAT-05` as the next bounded non-consent architecture candidate.
- No item was moved to Ready.
