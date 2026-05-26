# Requirements Backlog

Date: 2026-05-26

Status: Team 02 refreshed the backlog after reconciling the current Ready lanes with stale parent recommendations. Product Owner priority remains direct investor/trader value first: market-data freshness/provenance, data-quality readiness, signals/triggers, strategy/rules, trusted candidate health, backtesting, calibration, market/historical context, and research explainability.

Team 00 override: `CF-W1-BT-03`, `CF-W1-CAL-01A`, `CF-W1-TP-01A`, and `CF-W1-DQ-02A` are accepted parked branch commits, not fresh backlog-front items.

Team 02 rolling update: `CF-W2-DOV-01`, `CF-W2-SPL-01B`, and `CF-W1-RH-01A` are already the live non-overlapping Ready family; `CF-W2-CAL-02A` remains in the routed calibration path; and `CF-W1-DQ-02-RS1` remains its own isolated DQ stream. Backlog-front discovery excludes those active or already-routed packets and re-ranks the next honest unassigned candidates.

## Current Cycle Requirement Focus

| ID | Why it matters now | Next gate |
| --- | --- | --- |
| `CF-W1-MD-02A` | Durable market-data evidence storage is now the clearest next upstream trust gap after DOV / SPL / RH are already in motion. | Proposal-only until Team 00 intentionally opens the schema/storage packet. |
| `CF-W1-SQLAB-02B` | Durable Signal Quality learning memory is the clearest measured-outcome follow-through proposal after the active lanes. | Proposal-only until Team 00 intentionally opens the storage packet. |
| `CF-W1-STRAT-02B` | Durable strategy revision history preserves exact rule/version provenance for later signal, backtest, and research review. | Proposal-only until Team 00 intentionally opens the schema/generated/repository packet. |
| `CF-W2-DOV-01` | The current `Daily Overview` page is still only a launch surface, while the user now needs one cross-system market dashboard that summarizes filtered trust, reviewability, evidence, and pipeline state. | Team 08 UX, Team 03 architecture, and Team 04 scaffold work are complete; next gate is Team 00 shared-file reservation and Ready evaluation for the frontend-only first slice. |
| `CF-W1-RH-01A` | Research Hub actionability already exposes per-dimension `evidenceDate`, but those dates are not wired and the current tiles do not surface them, which weakens reviewability on the overview. | Promoted by Team 00 into the active Ready family; keep out of fresh Team 02 discovery. |
| `CF-W1-SIG-TRIGGER-ENTRY-01` | Signal Generation now exposes source-proven trigger evidence for downstream adoption. | Accepted and locally committed as `649e645`; keep out of fresh Team 02 pulls. |
| `CF-W1-HCTX-03` | Historical context needs age and provenance warnings so nearest snapshots do not read like same-day evidence. | Accepted and locally committed as `f6034c6`; wait for clean integration sequencing. |
| `CF-W1-DQ-03` | Downstream trust consumers need a compact residual reason summary instead of raw DQ arrays. | Accepted / routed elsewhere; do not duplicate as fresh Team 02 discovery. |
| `CF-W1-MCTX-02` | Market Context needs an explicit persisted-versus-generated freshness basis label. | Accepted and locally committed as `0c802c2`; wait for clean integration sequencing. |
| `CF-W1-STRAT-04` | Strategy evidence needs freshness and stale-summary labels so compact summaries do not overclaim recency. | Accepted and locally committed as `8b3498e`; wait for clean integration sequencing. |
| `CF-W1-SQLAB-03` | Signal Quality Lab needs review-loop actionability for noisy and limited outcomes. | Accepted and locally committed as `5db98f2`; wait for clean integration sequencing. |
| `CF-W1-TSC-02` | Active candidates need rule-based health tracking after entry until exit, invalidation, expiry, or blockage. | Parent remains useful product context, but its honest executable child was already consumed in earlier stacked work; do not treat it as the next fresh Team 02 pull from current `dev`. |
| `CF-W2-SPL-01` | A dedicated Signal Position Ledger remains high-value, but the truthful first path is now active-only because current source does not prove closed history honestly. | Parent plus narrowed child `CF-W2-SPL-01B` now has Team 03 architecture and Team 04 QA planning complete; next gate is Team 00 backend-only Ready promotion/sequencing. |
| `CF-W1-TP-03` | Paused/stale as framed; Trade Plan proof snapshot freshness does not match the new Trusted Signal Candidate direction. | Do not execute unless reframed into signal health with no R:R, targets, or Trade Plan-first UX. |
| `CF-W1-BT-04` | Backtesting saved runs need freshness/current-proof labels so older simulations do not read like latest proof. | Accepted and locally committed; keep excluded from fresh routing. |
| `CF-W1-DQ-02` residual parent | `DQ-02A` currentness evidence is accepted, and `RS1` is in active rework. | Keep parent blocked from new discovery until the active packet clears. |
| `CF-W1-L3-DQ-01A` | Passive Lane 3 readiness display still needs truthful contract semantics. | Keep contract-only unless Team 03/04 define a bounded child. |
| `CF-W1-MD-02A` | Market-data evidence storage is useful, but schema / generated / repository consent is required. | Consent-gated proposal only. |

## Current Top 10 Priority Order

| Rank | ID | State | Why now |
| --- | --- | --- | --- |
| 1 | `CF-W1-MD-02A` | Proposal-only | Market-data evidence storage remains the next strongest upstream provenance gap once the active calibration child is excluded. |
| 2 | `CF-W1-SQLAB-02B` | Proposal-only | Durable Signal Quality learning memory remains useful but storage-gated. |
| 3 | `CF-W1-STRAT-02B` | Proposal-only | Durable strategy revision history remains useful but schema/generated/repository-gated. |
| 4 | `CF-W1-L3-DQ-01A` | Contract-only | Lane 3 passive readiness DTOs still matter, but not as the next fresh implementation pull. |
| 5 | `CF-W1-UX-01` | Open parent | Research Workbench trust gaps remain behind upstream trust/evidence work. |

## Rolling Audit Notes

- `CF-W2-CAL-02` is not a duplicate of accepted `CF-W1-CAL-01A`; it focuses on scoped evidence freshness and page-level evidence-basis truth, not the DQ readiness gate already accepted.
- The bounded child `CF-W2-CAL-02A` is already in the routed calibration path, so the parent calibration requirement should be tracked as reserved rather than as the next unassigned backlog head.
- `CF-W2-DOV-01` is elevated by explicit Product Owner direction and by current source reality: `Daily Overview` still resolves to a thin launcher rather than a working dashboard, but it is no longer a fresh Team 02 backlog-front item because the UX and architecture packet already exists.
- Team 01's follow-up evidence supported `CF-W1-RH-01A`, but Team 00 has already promoted that child into the current Ready family, so it is no longer the next unclaimed Team 02 queue head.
- The storage proposals remain valuable, but they stay honestly consent-gated and behind the new calibration trust slice.
- `CF-W2-SPL-01A` remains in the family only as the original combined child that proved too broad on current source.
- `CF-W2-SPL-01B` remains the next honest Signal Position Ledger child: active-only, persisted/public-evidence-only, and explicitly separate from any later durable closed-history packet, but it is now in Team 00 promotion territory rather than fresh Team 02 discovery.
- Parent `CF-W1-TSC-02` and `CF-W1-TSC-03` still describe useful Today Review intent, but they should not keep appearing as near-front fresh pulls while the executable child history has already been consumed elsewhere.

## Active Or Parked Exclusions

Keep these out of fresh Team 02 discovery:

- `CF-W1-RH-03`
- `CF-W1-L3-DQ-01B`
- `CF-W1-L3-INTEL-02`
- `CF-W1-L3-TREV-02`
- `CF-W1-L3-INTEL-03`
- `CF-W1-L3-AUTH-03`
- `CF-W1-BT-03`
- `CF-W1-CAL-01A`
- `CF-W2-TSC-05A`
- `CF-W1-DQ-02-RS1`
- `CF-W2-DOV-01`
- `CF-W2-SPL-01B`
- `CF-W1-TP-01A`
- `CF-W1-DQ-02A`
- `CF-W1-SQLAB-01`
- `CF-W1-SQLAB-02A`
- `CF-W1-SQLAB-03`
- `CF-W1-STRAT-04`
- `CF-W1-HCTX-03`
- `CF-W1-MCTX-02`
- `CF-W1-RH-01`
- `CF-W1-RH-02A`
- `CF-W1-MD-04`
- `CF-W1-HCTX-02`
- `CF-W1-MD-03`
- `CF-W1-MCTX-01`
- `CF-W1-TP-02`
- `CF-W1-SIG-02`
- `CF-W1-STRAT-03`
- `CF-W1-L3-WATCH-01`
- `CF-W1-BT-02`
- `CF-W1-CAL-01`

These are already promoted, active, accepted, parked, or otherwise in the live Ready/gate path.

## Architecture-Next Candidates

These can move toward architecture/QA next without creating duplicate application-code work:

1. `CF-W1-MD-02A` as a consent-gated companion evidence packet if Team 00 intentionally opens storage/schema scope
2. `CF-W1-SQLAB-02B` as a consent-gated durable Signal Quality memory packet if Team 00 intentionally opens storage scope
3. `CF-W1-STRAT-02B` as a consent-gated durable strategy revision history packet if Team 00 intentionally opens schema/generated/repository scope
4. `CF-W1-L3-DQ-01A` as a contract-only child if Team 00 wants the passive Lane 3 display slice refreshed
5. `CF-W1-UX-01` as the Workbench trust-evidence parent behind the core trust stack

## Sequencing Candidates For Team 00

These are not new requirement-discovery items. They are already accepted parked branches or sequencing decisions on already-prepared work:

1. `CF-W1-BT-03`
2. `CF-W1-CAL-01A`
3. `CF-W1-TP-01A`

## Lower Priority / Sequencing-Blocked

Keep these behind the direct-value trust stack unless they block correctness, privacy, or user-data safety:

- `CF-W1-MD-02A`
- `CF-W1-SQLAB-02B`
- `CF-W1-STRAT-02B`
- `CF-W1-L3-ALERT-03`
- `CF-W1-UX-02`
- `CF-W1-UX-05`

## Low-Priority Classes

Keep these behind the direct-value trust stack unless they block correctness, privacy, or user-data safety:

- admin/settings convenience,
- auth/subscription expansion beyond existing privacy/correctness fixes,
- notifications convenience,
- alert convenience work that does not improve evidence quality or reviewability.
