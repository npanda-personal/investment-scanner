# Next Top 10 Candidates

Date: 2026-05-26

Status: Team 02 reconciled this queue to the current accepted/promoted state. `CF-W2-DOV-01` is accepted and locally committed as `a371e2f`. `CF-W2-SPL-01B` is accepted and locally committed as `ca31d79`. `CF-W2-SPL-02` is the active Team 06 implementation lane. `CF-W1-RH-01A` is accepted and locally committed as `30460aa`. `CF-W2-CAL-02A` is also accepted and locally committed as `1be7d1a`. None of those items belong in fresh Team 02 discovery.

This file now separates:

1. the highest-value proposal items that still require explicit consent; and
2. the next truthful no-schema/no-shared-file refinement candidates Team 02 can keep moving without pretending storage or closed-history proof already exists.

## Active / Accepted Exclusions

Do not rank these as fresh Team 02 discovery:

- `CF-W2-SPL-02` is already promoted and assigned to Team 06.
- `CF-W2-DOV-01` is already accepted and committed as `a371e2f`.
- `CF-W2-SPL-01B` is already accepted and committed as `ca31d79`.
- `CF-W1-RH-01A` is already accepted and committed as `30460aa`.
- `CF-W2-CAL-02A` is already accepted and committed as `1be7d1a`.
- Accepted or committed direct-value slices remain excluded, including `CF-W1-BT-03`, `CF-W1-BT-04`, `CF-W1-CAL-01A`, `CF-W1-DQ-02A`, `CF-W1-DQ-03`, `CF-W1-HCTX-03`, `CF-W1-MCTX-02`, `CF-W1-RH-02A`, `CF-W1-RH-03`, `CF-W1-SIG-LATEST-01`, `CF-W1-SIG-TRIGGER-ENTRY-01`, `CF-W1-SQLAB-03`, `CF-W1-STRAT-04`, `CF-W1-TSC-02A-TREV-HEALTH`, `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE`, `CF-W1-TP-01A`, `CF-W2-BT-05`, and `CF-W2-SIG-01A`.
- Do not open another Signal Position Ledger child from this queue while `CF-W2-SPL-02` is active. Any closed-history ledger follow-on remains deferred until durable close-proof truth exists.

## Consent-Gated Proposal Front

These remain the highest direct-value backlog items by investor/trader value, but they stay proposal-only until Team 00 intentionally opens storage/schema scope.

| Rank | ID | Current state | Why it stays high | Next gate |
| --- | --- | --- | --- | --- |
| 1 | `CF-W1-MD-02A` | Consent-gated proposal | Strongest remaining upstream provenance gap across market data, DQ, signals, calibration, backtests, and research review. | Hold until Team 00 opens schema/storage consent. |
| 2 | `CF-W1-SQLAB-02B` | Consent-gated proposal | Strongest durable measured-outcome follow-through gap after accepted calibration and active SPL surface work. | Hold until Team 00 opens storage consent. |
| 3 | `CF-W1-STRAT-02B` | Consent-gated proposal | Strongest durable rule/version audit-history gap for later backtest, signal, and research replay. | Hold until Team 00 opens schema/generated/repository consent. |

## Actionable Docs-Only Refinement Front

These are the next bounded non-consent candidates Team 02 can honestly keep ready for Team 03 without schema, route-registry, navigation, or shared-file widening.

| Rank | ID | Current state | Why now | Next gate |
| --- | --- | --- | --- | --- |
| 1 | `CF-W1-UX-01B` | New bounded draft | Best current no-schema/no-shared-file follow-on: direct investor research value on the existing Stock Research Workbench route after accepted `CF-W1-UX-01A`. | Team 03 architecture packet next. |
| 2 | `CF-W1-L3-DQ-01A` | Existing contract-only child | Still useful for passive readiness truth, but behind direct research-surface trust evidence. | Team 03 architecture only if Team 00 wants the passive DTO contract next. |

## Dispatch Notes

- Team 02 is not sending another Signal Position Ledger child next. `CF-W2-SPL-02` is already the honest active-surface follow-on, and a later closed-history child would be consent-sensitive because current source does not prove durable close lifecycle truth.
- `CF-W2-DOV-01` no longer waits on a Team 02 requirement refresh. It is already accepted and committed; any future Daily Overview follow-on should be handled as a separate requirement family later.
- `CF-W1-RH-01A` is no longer the next non-consent architecture packet because it is already accepted and committed.
- `CF-W2-CAL-02A` no longer belongs in active-implementation language inside the Team 02 queue. It is accepted and committed, so later calibration work should be framed as a new child, not as stale queue carryover.
- `CF-W1-UX-01B` is the current Team 02 recommendation for the next Team 03 architecture assignment because it is direct research value, bounded to an existing route/module, and does not require schema or shared-file consent if kept inside the Workbench module/feature.

## Team 02 Result

- Removed stale queue language that still treated `CF-W2-DOV-01` as waiting for refresh.
- Removed stale queue language that kept `CF-W2-SPL-02` behind DOV or treated `CF-W2-SPL-01B` as still merely routed.
- Preserved the consent-gated top-value trio.
- Added `CF-W1-UX-01B` as the next bounded no-schema/no-shared-file refinement candidate.
- No item was moved to Ready.
