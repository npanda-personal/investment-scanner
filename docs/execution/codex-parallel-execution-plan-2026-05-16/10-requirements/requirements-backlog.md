# Requirements Backlog

Date: 2026-05-26

Status: Team 02 refreshed the backlog to the current execution truth. `CF-W2-DOV-01` is accepted and locally committed as `a371e2f`. `CF-W2-SPL-01B` is accepted and locally committed as `ca31d79`. `CF-W2-SPL-02` is promoted and assigned to Team 06. `CF-W1-RH-01A` is accepted and locally committed as `30460aa`. `CF-W2-CAL-02A` is accepted and locally committed as `1be7d1a`. Backlog-front discovery now excludes those items and focuses on what actually comes next after the active SPL surface lane.

Product Owner priority remains direct investor/trader value first: market-data provenance, data-quality truth, signal/review evidence, measured outcomes, strategy-version auditability, calibration/backtesting honesty, and research-surface trust before admin/settings/auth/subscription/notifications convenience.

## Current Cycle Requirement Focus

### Active implementation lane

| ID | Why it matters now | Next gate |
| --- | --- | --- |
| `CF-W2-SPL-02` | First truthful user-facing Signal Position Ledger active positions surface. | Team 06 implementation in progress. |

### Accepted / committed and therefore excluded from fresh Team 02 discovery

| ID | Status |
| --- | --- |
| `CF-W2-DOV-01` | Accepted and locally committed as `a371e2f`. |
| `CF-W2-SPL-01B` | Accepted and locally committed as `ca31d79`. |
| `CF-W1-RH-01A` | Accepted and locally committed as `30460aa`. |
| `CF-W2-CAL-02A` | Accepted and locally committed as `1be7d1a`. |

### Highest-value consent-gated proposals

| ID | Why it matters now | Next gate |
| --- | --- | --- |
| `CF-W1-MD-02A` | Strongest remaining upstream provenance gap across market data, DQ, signals, calibration, backtests, and research review. | Proposal-only until Team 00 opens schema/storage consent. |
| `CF-W1-SQLAB-02B` | Strongest durable measured-outcome memory gap after accepted calibration and active SPL surface work. | Proposal-only until Team 00 opens storage consent. |
| `CF-W1-STRAT-02B` | Strongest durable strategy/rule revision-history gap for later signal, backtest, and research replay. | Proposal-only until Team 00 opens schema/generated/repository consent. |

### Next actionable docs-only refinement candidates

| ID | Why it matters now | Next gate |
| --- | --- | --- |
| `CF-W1-UX-01B` | Best current no-schema/no-shared-file follow-on: direct research-surface trust evidence on the existing Stock Research Workbench route after accepted `CF-W1-UX-01A`. | Team 03 architecture next. |
| `CF-W1-L3-DQ-01A` | Useful passive readiness DTO truth, but lower direct investor/trader value than Workbench trust evidence. | Team 03 architecture only if Team 00 prefers passive DTO work next. |

## Current Priority Order

This ranking now reflects both direct value and honest executability after active `CF-W2-SPL-02`.

| Rank | ID | State | Why now |
| --- | --- | --- | --- |
| 1 | `CF-W1-MD-02A` | Proposal-only | Highest remaining upstream provenance gap. |
| 2 | `CF-W1-SQLAB-02B` | Proposal-only | Highest remaining durable measured-outcome memory gap. |
| 3 | `CF-W1-STRAT-02B` | Proposal-only | Highest remaining durable strategy/rule revision-history gap. |
| 4 | `CF-W1-UX-01B` | Docs-only refinement candidate | Best current bounded no-schema/no-shared-file direct-value child. |
| 5 | `CF-W1-L3-DQ-01A` | Contract-only | Valid, but more passive and lower direct value than `CF-W1-UX-01B`. |

## Rolling Audit Notes

- `CF-W2-DOV-01` must no longer appear in Team 02 backlog language as "waiting for refresh." It is already accepted and committed.
- `CF-W2-SPL-01B` must no longer appear as merely routed. It is already accepted and committed.
- `CF-W2-SPL-02` is the active ledger follow-on. Team 02 should not queue another SPL child while Team 06 owns that surface.
- Closed-history Signal Position Ledger work remains a later durable lifecycle/proof requirement and should not be disguised as a lightweight non-consent candidate.
- `CF-W1-RH-01A` is no longer the next no-consent architecture packet because it is already accepted and committed.
- `CF-W2-CAL-02A` is accepted and committed; later calibration value should be expressed as a new child, not as stale carryover text inside this backlog.
- `CF-W1-UX-01B` is now the preferred bounded Team 03 architecture recommendation after active `CF-W2-SPL-02`.

## Active Or Parked Exclusions

Keep these out of fresh Team 02 discovery:

- `CF-W2-SPL-02`
- `CF-W2-DOV-01`
- `CF-W2-SPL-01B`
- `CF-W1-RH-01A`
- `CF-W2-CAL-02A`
- `CF-W1-BT-03`
- `CF-W1-BT-04`
- `CF-W1-CAL-01A`
- `CF-W1-DQ-02A`
- `CF-W1-DQ-03`
- `CF-W1-HCTX-03`
- `CF-W1-MCTX-02`
- `CF-W1-RH-02A`
- `CF-W1-RH-03`
- `CF-W1-SIG-LATEST-01`
- `CF-W1-SIG-TRIGGER-ENTRY-01`
- `CF-W1-SQLAB-03`
- `CF-W1-STRAT-04`
- `CF-W1-TSC-02A-TREV-HEALTH`
- `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE`
- `CF-W1-TP-01A`
- `CF-W2-BT-05`
- `CF-W2-SIG-01A`

## Architecture-Next Candidates

These are the next Team 03 candidates after the active SPL surface lane, separated by consent:

1. `CF-W1-UX-01B` as the next bounded non-consent Workbench trust-evidence child.
2. `CF-W1-L3-DQ-01A` if Team 00 prefers passive readiness DTO work over Workbench trust evidence.
3. `CF-W1-MD-02A` only if Team 00 intentionally opens schema/storage consent.
4. `CF-W1-SQLAB-02B` only if Team 00 intentionally opens storage consent.
5. `CF-W1-STRAT-02B` only if Team 00 intentionally opens schema/generated/repository consent.

## Low-Priority Classes

Keep these behind the direct-value trust stack unless they block correctness, privacy, or user-data safety:

- admin/settings convenience
- auth/subscription expansion beyond existing privacy/correctness fixes
- notifications convenience
- alert convenience work that does not improve evidence quality or reviewability
