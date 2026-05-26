# Refinement Queue

Date: 2026-05-26

Status: Team 02 refreshed this queue again against the current active-board truth. `CF-W1-UX-01B` remains active and `CF-W2-DOV-02` is already routed into Team 03 dependency-base correction, so neither belongs in fresh refinement. `CF-W2-SPL-02` is accepted and locally committed as `31115f0`. `CF-W2-DOV-01` is accepted and committed as `a371e2f`. `CF-W2-SPL-01B` is accepted and committed as `ca31d79`. `CF-W1-RH-01A` is accepted and committed as `30460aa`. `CF-W1-MD-05` is accepted and committed as `93c29e2`. This queue now distinguishes between proposal preservation and the next actionable docs-only refinement front.

## Keep Out Of Fresh Refinement

- `CF-W1-UX-01B` is already active with Team 08.
- `CF-W2-DOV-02` is already routed into Team 03 dependency-base correction.
- `CF-W2-SPL-02` is already accepted and committed as `31115f0`.
- `CF-W2-DOV-01` is already accepted and committed as `a371e2f`.
- `CF-W2-SPL-01B` is already accepted and committed as `ca31d79`.
- `CF-W1-RH-01A` is already accepted and committed as `30460aa`.
- `CF-W2-CAL-02A` is already accepted and committed as `1be7d1a`.
- `CF-W1-MD-05` is already accepted and committed as `93c29e2`.
- Accepted or committed direct-value slices remain excluded, including `CF-W1-BT-03`, `CF-W1-BT-04`, `CF-W1-CAL-01A`, `CF-W1-DQ-02A`, `CF-W1-DQ-03`, `CF-W1-HCTX-03`, `CF-W1-MCTX-02`, `CF-W1-RH-02A`, `CF-W1-RH-03`, `CF-W1-SIG-LATEST-01`, `CF-W1-SIG-TRIGGER-ENTRY-01`, `CF-W1-SQLAB-03`, `CF-W1-STRAT-04`, `CF-W1-TSC-02A-TREV-HEALTH`, `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE`, `CF-W1-TP-01A`, `CF-W2-BT-05`, and `CF-W2-SIG-01A`.

## Proposal Preservation Stack

These remain the highest-value backlog requirements, but refinement must stop at proposal quality until Team 00 intentionally opens consent.

| Rank | ID | Why it stays preserved | Team 00 note |
| --- | --- | --- | --- |
| 1 | `CF-W1-MD-02A` | Strongest remaining upstream data-provenance gap. | Hold behind schema/storage consent. |
| 2 | `CF-W1-SQLAB-02B` | Strongest durable measured-outcome memory gap. | Hold behind storage consent. |
| 3 | `CF-W1-STRAT-02B` | Strong durable rule/version revision-history gap. | Hold behind schema/generated/repository consent. |

## Actionable Docs-Only Refinement Stack

These are the next bounded items Team 02 can keep sharp for Team 03 without pretending new storage, closed-history proof, or shared-file routing already exists.

| Rank | ID | Why it stays next | Team 00 routing note |
| --- | --- | --- | --- |
| 1 | `CF-W2-STRAT-05` | Best current no-schema/no-route-change direct-value child: existing `/strategies` route, existing module/feature ownership, and a clear investor-facing proof-visibility gap. | Route to Team 03 next if Team 00 wants a bounded non-consent packet after active `UX-01B` and routed `DOV-02`. |
| 2 | `CF-W1-L3-DQ-01A` | Still valid, but more passive and lower direct investor/trader value than Strategy Library proof surfacing. | Keep behind `CF-W2-STRAT-05` unless Team 00 prefers the passive DTO contract. |

## Audit Notes

- Team 02 is not treating `CF-W1-UX-01B` or `CF-W2-DOV-02` as fresh refinement-front items because both already belong to active downstream lanes.
- Closed-history Signal Position Ledger work remains a later durable lifecycle decision and should not be mislabeled as a lightweight refinement item.
- `CF-W2-DOV-01` no longer belongs in refresh-blocked language here. It is already accepted and committed.
- `CF-W2-CAL-02A` no longer belongs in active-implementation language here. It is already accepted and committed.
- `CF-W2-STRAT-05` is now the honest Team 02 answer to "what is the next bounded non-consent refinement packet that does not depend on active UX-01B or DOV-02 correction?"

## Team 02 Constraint Reminder

- Do not move anything to Ready from this file.
- Do not treat active or routed `CF-W1-UX-01B`, `CF-W2-DOV-02`, or accepted `CF-W2-SPL-02`, `CF-W2-DOV-01`, `CF-W2-SPL-01B`, `CF-W1-RH-01A`, `CF-W2-CAL-02A`, or `CF-W1-MD-05` as fresh refinement-front discovery.
