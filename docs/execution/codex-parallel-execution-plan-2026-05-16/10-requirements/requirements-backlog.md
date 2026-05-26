# Requirements Backlog

Date: 2026-05-26

Status: Team 02 refreshed the backlog to the current execution truth. `CF-W2-SPL-02` remains active in Team 06 QA rerun, and `CF-W1-UX-01B` is now active in Team 08 implementation. `CF-W2-DOV-01` is accepted and locally committed as `a371e2f`. `CF-W2-SPL-01B` is accepted and locally committed as `ca31d79`. `CF-W1-RH-01A` is accepted and locally committed as `30460aa`. `CF-W2-CAL-02A` is accepted and locally committed as `1be7d1a`. Backlog-front discovery now excludes those items and focuses on what actually comes next after the active SPL and Workbench trust lanes.

Product Owner priority remains direct investor/trader value first: market-data provenance, data-quality truth, signal/review evidence, measured outcomes, strategy-version auditability, ledger close-history truth, calibration/backtesting honesty, and research-surface trust before admin/settings/auth/subscription/notifications convenience.

## Current Cycle Requirement Focus

### Active implementation / review lanes

| ID | Why it matters now | Next gate |
| --- | --- | --- |
| `CF-W2-SPL-02` | First truthful user-facing Signal Position Ledger active positions surface. | Team 04 QA rerun, then Team 10 rereview if accepted. |
| `CF-W1-UX-01B` | Stock Research Workbench trust-evidence implementation on an existing user-facing route. | Team 08 implementation in progress. |

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
| `CF-W2-SPL-03` | First truthful closed-history foundation for the Signal Position Ledger after active rows are surfaced. | Proposal-only until Team 00 opens close-lifecycle/schema-storage consent. |

### Next actionable docs-only refinement candidates

| ID | Why it matters now | Next gate |
| --- | --- | --- |
| `CF-W2-DOV-02` | Best current non-consent follow-on: replace Daily Overview's calibration placeholder with truthful evidence-through summary once the accepted calibration basis child is on the implementation base. | Team 03 architecture next. |
| `CF-W1-L3-DQ-01A` | Useful passive readiness DTO truth, but lower direct investor/trader value than Daily Overview trust follow-through. | Team 03 architecture only if Team 00 prefers passive DTO work next. |

## Current Priority Order

This ranking now reflects both direct value and honest executability after active `CF-W2-SPL-02` and active `CF-W1-UX-01B`.

| Rank | ID | State | Why now |
| --- | --- | --- | --- |
| 1 | `CF-W1-MD-02A` | Proposal-only | Highest remaining upstream provenance gap. |
| 2 | `CF-W1-SQLAB-02B` | Proposal-only | Highest remaining durable measured-outcome memory gap. |
| 3 | `CF-W1-STRAT-02B` | Proposal-only | Highest remaining durable strategy/rule revision-history gap. |
| 4 | `CF-W2-SPL-03` | Proposal-only | Highest remaining user-facing ledger trust gap after the active positions surface. |
| 5 | `CF-W2-DOV-02` | Docs-only refinement candidate | Best current bounded non-consent Daily Overview follow-on. |
| 6 | `CF-W1-L3-DQ-01A` | Contract-only | Valid, but more passive and lower direct value than Daily Overview or ledger trust follow-through. |

## Rolling Audit Notes

- `CF-W1-UX-01B` must no longer appear in Team 02 backlog language as the next fresh architecture candidate. It is already active with Team 08.
- `CF-W2-SPL-02` remains the active ledger follow-on. Team 02 should not queue another implementation-safe SPL child while Team 06 owns that surface.
- `CF-W2-SPL-03` is intentionally framed as a later consent-sensitive ledger-history foundation, not as a lightweight no-schema follow-on.
- `CF-W2-DOV-02` is the cleanest new non-consent follow-on because DOV already owns the placeholder and accepted `CF-W2-CAL-02A` created the truthful dependency it needs.
- `CF-W2-DOV-01`, `CF-W2-SPL-01B`, `CF-W1-RH-01A`, and `CF-W2-CAL-02A` stay out of fresh Team 02 discovery because they are already accepted and committed.

## Active Or Parked Exclusions

Keep these out of fresh Team 02 discovery:

- `CF-W2-SPL-02`
- `CF-W1-UX-01B`
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

These are the next Team 03 candidates after the active lanes, separated by consent:

1. `CF-W2-DOV-02` as the next bounded non-consent Daily Overview trust child.
2. `CF-W1-L3-DQ-01A` if Team 00 prefers passive readiness DTO work over Daily Overview follow-through.
3. `CF-W1-MD-02A` only if Team 00 intentionally opens schema/storage consent.
4. `CF-W1-SQLAB-02B` only if Team 00 intentionally opens storage consent.
5. `CF-W1-STRAT-02B` only if Team 00 intentionally opens schema/generated/repository consent.
6. `CF-W2-SPL-03` only if Team 00 intentionally opens close-lifecycle/schema-storage consent.

## Low-Priority Classes

Keep these behind the direct-value trust stack unless they block correctness, privacy, or user-data safety:

- admin/settings convenience
- auth/subscription expansion beyond existing privacy/correctness fixes
- notifications convenience
- alert convenience work that does not improve evidence quality or reviewability
