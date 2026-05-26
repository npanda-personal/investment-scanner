# Refinement Queue

Date: 2026-05-26

Status: Team 02 refreshed this queue against the current accepted/promoted state. `CF-W2-DOV-01` is accepted and committed as `a371e2f`. `CF-W2-SPL-01B` is accepted and committed as `ca31d79`. `CF-W2-SPL-02` is already the active Team 06 slice. `CF-W1-RH-01A` is accepted and committed as `30460aa`. This queue now distinguishes between proposal preservation and the next actionable docs-only refinement front.

## Keep Out Of Fresh Refinement

- `CF-W2-SPL-02` is already active with Team 06.
- `CF-W2-DOV-01` is already accepted and committed as `a371e2f`.
- `CF-W2-SPL-01B` is already accepted and committed as `ca31d79`.
- `CF-W1-RH-01A` is already accepted and committed as `30460aa`.
- `CF-W2-CAL-02A` is already accepted and committed as `1be7d1a`.
- Accepted or committed direct-value slices remain excluded, including `CF-W1-BT-03`, `CF-W1-BT-04`, `CF-W1-CAL-01A`, `CF-W1-DQ-02A`, `CF-W1-DQ-03`, `CF-W1-HCTX-03`, `CF-W1-MCTX-02`, `CF-W1-RH-02A`, `CF-W1-RH-03`, `CF-W1-SIG-LATEST-01`, `CF-W1-SIG-TRIGGER-ENTRY-01`, `CF-W1-SQLAB-03`, `CF-W1-STRAT-04`, `CF-W1-TSC-02A-TREV-HEALTH`, `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE`, `CF-W1-TP-01A`, `CF-W2-BT-05`, and `CF-W2-SIG-01A`.

## Proposal Preservation Stack

These remain the highest-value backlog requirements, but refinement must stop at proposal quality until Team 00 intentionally opens consent.

| Rank | ID | Why it stays preserved | Team 00 note |
| --- | --- | --- | --- |
| 1 | `CF-W1-MD-02A` | Strongest remaining upstream data-provenance gap. | Hold behind schema/storage consent. |
| 2 | `CF-W1-SQLAB-02B` | Strongest durable measured-outcome memory gap. | Hold behind storage consent. |
| 3 | `CF-W1-STRAT-02B` | Strongest durable rule/version revision-history gap. | Hold behind schema/generated/repository consent. |

## Actionable Docs-Only Refinement Stack

These are the next bounded items Team 02 can keep sharp for Team 03 without pretending new storage, closed-history proof, or shared-file routing already exists.

| Rank | ID | Why it stays next | Team 00 routing note |
| --- | --- | --- | --- |
| 1 | `CF-W1-UX-01B` | Best current no-schema/no-shared-file direct-value child: existing Workbench route, existing module/feature ownership, and an explicit trust-evidence gap left by accepted `CF-W1-UX-01A`. | Route to Team 03 next if Team 00 wants a bounded non-consent packet after active `CF-W2-SPL-02`. |
| 2 | `CF-W1-L3-DQ-01A` | Still valid, but more passive and lower direct investor/trader value than Workbench trust evidence. | Keep behind `CF-W1-UX-01B` unless Team 00 prefers the passive DTO contract. |

## Audit Notes

- Team 02 is not promoting another Signal Position Ledger requirement from refinement while `CF-W2-SPL-02` is active.
- Closed-history Signal Position Ledger work remains a later durable lifecycle decision and should not be mislabeled as a lightweight refinement item.
- `CF-W2-DOV-01` no longer belongs in refresh-blocked language here. It is already accepted and committed.
- `CF-W2-CAL-02A` no longer belongs in active-implementation language here. It is already accepted and committed.
- `CF-W1-UX-01B` is now the honest Team 02 answer to "what is the next bounded non-consent refinement packet after active SPL-02?"

## Team 02 Constraint Reminder

- Do not move anything to Ready from this file.
- Do not treat active `CF-W2-SPL-02` or accepted `CF-W2-DOV-01`, `CF-W2-SPL-01B`, `CF-W1-RH-01A`, or `CF-W2-CAL-02A` as fresh refinement-front discovery.
